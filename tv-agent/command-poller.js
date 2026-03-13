import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname, relative } from "path";

const VIDEO_EXTS = new Set([".mp4", ".mkv", ".avi", ".mov", ".webm", ".m4v", ".wmv", ".flv"]);

function findVideosRecursive(dir) {
  const results = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findVideosRecursive(full));
      } else if (VIDEO_EXTS.has(extname(entry.name).toLowerCase())) {
        results.push(full);
      }
    }
  } catch { /* skip */ }
  return results;
}

/**
 * Polls /api/commands for unprocessed commands and executes them via mpv.
 * Also manages the local queue/playlist.
 */
export class CommandPoller {
  #config;
  #mpv;
  #intervalId = null;
  #currentQueue = []; // video filenames in play order
  #currentIndex = -1;
  #loopEnabled = false;
  #polling = false; // guard against overlapping polls

  constructor(config, mpvController) {
    this.#config = config;
    this.#mpv = mpvController;

    // When mpv finishes a file, advance the queue
    this.#mpv.on("end-file", (reason) => {
      if (reason === "eof") {
        this.#advanceQueue();
      }
    });
  }

  start() {
    console.log(`[commands] polling every ${this.#config.commandPollIntervalMs}ms`);
    this.#intervalId = setInterval(() => this.#poll(), this.#config.commandPollIntervalMs);
    this.#poll(); // immediate first poll
  }

  stop() {
    if (this.#intervalId) clearInterval(this.#intervalId);
  }

  async #poll() {
    // Prevent overlapping polls — if a previous poll is still executing/acking, skip
    if (this.#polling) return;
    this.#polling = true;
    try {
      // Skip polling if mpv is disconnected — don't consume commands we can't execute
      if (!this.#mpv.isConnected) return;

      const res = await fetch(
        `${this.#config.apiUrl}/api/commands?tv_id=${this.#config.tvId}`
      );
      if (!res.ok) return;

      const commands = await res.json();
      if (!Array.isArray(commands) || commands.length === 0) return;

      for (const cmd of commands) {
        // Ack first so next poll won't see this command again
        await this.#ack(cmd.id);
        await this.#execute(cmd);
      }
    } catch (err) {
      console.error("[commands] poll error:", err.message);
    } finally {
      this.#polling = false;
    }
  }

  async #ack(cmdId) {
    try {
      await fetch(`${this.#config.apiUrl}/api/commands`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cmdId }),
      });
    } catch (err) {
      console.error("[commands] ack error:", err.message);
    }
  }

  async #execute(cmd) {
    console.log(`[commands] executing: ${cmd.action}`, cmd.payload || "");
    try {
      switch (cmd.action) {
        case "play":
          await this.#handlePlay(cmd.payload);
          break;
        case "pause":
          await this.#mpv.pause();
          break;
        case "stop":
          await this.#mpv.stop();
          this.#currentIndex = -1;
          break;
        case "next":
          await this.#advanceQueue();
          break;
        case "previous":
          await this.#previousInQueue();
          break;
        case "seek":
          if (cmd.payload) {
            const p = typeof cmd.payload === "string" ? JSON.parse(cmd.payload) : cmd.payload;
            if (p.position !== undefined) {
              await this.#mpv.seek(p.position);
            }
          }
          break;
        default:
          console.warn(`[commands] unknown action: ${cmd.action}`);
      }
    } catch (err) {
      console.error(`[commands] error executing ${cmd.action}:`, err.message);
    }
  }

  async #handlePlay(payload) {
    // If mpv is just paused, resume
    const state = await this.#mpv.getState();
    if (state.status === "paused" && !payload) {
      await this.#mpv.play();
      return;
    }

    // Otherwise, refresh the queue from the API and start playing
    await this.#refreshQueue();

    if (this.#currentQueue.length === 0) {
      console.log("[commands] no videos in queue to play");
      return;
    }

    this.#currentIndex = 0;
    await this.#playCurrentIndex();
  }

  async #refreshQueue() {
    try {
      const res = await fetch(
        `${this.#config.apiUrl}/api/queue?tv_id=${this.#config.tvId}`
      );
      if (!res.ok) return;

      const items = await res.json();
      if (!Array.isArray(items)) return;

      // Map queue items to local file paths
      this.#currentQueue = items
        .sort((a, b) => a.position - b.position)
        .map((item) => {
          const filename = item.video?.filename;
          if (!filename) return null;
          const localPath = join(this.#config.videoDir, filename);
          return localPath;
        })
        .filter(Boolean);

      // Also check loop state
      const tvRes = await fetch(
        `${this.#config.apiUrl}/api/tvs?id=${this.#config.tvId}`
      );
      if (tvRes.ok) {
        const tv = await tvRes.json();
        this.#loopEnabled = tv.loopEnabled ?? false;
      }
    } catch (err) {
      console.error("[commands] queue refresh error:", err.message);
    }
  }

  async #playCurrentIndex() {
    if (this.#currentIndex < 0 || this.#currentIndex >= this.#currentQueue.length) {
      console.log("[commands] queue exhausted");
      return;
    }

    const path = this.#currentQueue[this.#currentIndex];
    console.log(`[commands] playing [${this.#currentIndex + 1}/${this.#currentQueue.length}]: ${path}`);
    await this.#mpv.loadFile(path);
  }

  async #advanceQueue() {
    this.#currentIndex++;

    if (this.#currentIndex >= this.#currentQueue.length) {
      // Refresh queue to pick up any newly added videos
      await this.#refreshQueue();

      if (this.#loopEnabled && this.#currentQueue.length > 0) {
        console.log(`[commands] looping back to start (${this.#currentQueue.length} items)`);
        this.#currentIndex = 0;
      } else if (this.#currentQueue.length > this.#currentIndex) {
        // New items were added beyond our old end — continue
        console.log("[commands] new items found, continuing");
      } else {
        console.log("[commands] queue finished — holding last frame");
        // Reload last video and pause to keep mpv window stable
        if (this.#currentQueue.length > 0) {
          const lastPath = this.#currentQueue[this.#currentQueue.length - 1];
          await this.#mpv.loadFile(lastPath);
          // Small delay to let mpv load the file before pausing
          await new Promise((r) => setTimeout(r, 300));
          await this.#mpv.pause();
          this.#currentIndex = this.#currentQueue.length - 1;
        }
        return;
      }
    }

    await this.#playCurrentIndex();
  }

  async #previousInQueue() {
    if (this.#currentIndex > 0) {
      this.#currentIndex--;
      await this.#playCurrentIndex();
    }
  }

  /** Get list of local video files (relative paths) */
  getLocalVideos() {
    try {
      return findVideosRecursive(this.#config.videoDir)
        .map((f) => relative(this.#config.videoDir, f).replace(/\\/g, "/"))
        .sort();
    } catch {
      return [];
    }
  }
}
