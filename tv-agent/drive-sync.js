import { execFileSync, execFile } from "child_process";
import { readdirSync, statSync, existsSync, mkdirSync } from "fs";
import { join, extname } from "path";

const VIDEO_EXTS = new Set([".mp4", ".mkv", ".avi", ".mov", ".webm", ".m4v", ".wmv", ".flv"]);

/**
 * Syncs videos from Google Drive via rclone and registers new files with the API.
 */
export class DriveSync {
  #config;
  #intervalId = null;
  #syncing = false;

  constructor(config) {
    this.#config = config;
  }

  start() {
    // Ensure video directory exists
    if (!existsSync(this.#config.videoDir)) {
      mkdirSync(this.#config.videoDir, { recursive: true });
      console.log(`[sync] created video dir: ${this.#config.videoDir}`);
    }

    console.log(`[sync] syncing every ${this.#config.driveSyncIntervalMs / 1000}s`);
    this.#intervalId = setInterval(() => this.sync(), this.#config.driveSyncIntervalMs);
    // Run initial sync after short delay to let other components start
    setTimeout(() => this.sync(), 5000);
  }

  stop() {
    if (this.#intervalId) clearInterval(this.#intervalId);
  }

  /** Run rclone sync from Google Drive to local video dir */
  async sync() {
    if (this.#syncing) return;
    this.#syncing = true;

    try {
      const remote = `${this.#config.rcloneRemote}:${this.#config.driveFolder}`;
      console.log(`[sync] starting rclone sync: ${remote} -> ${this.#config.videoDir}`);

      await new Promise((resolve, reject) => {
        const proc = execFile("rclone", [
          "sync",
          remote,
          this.#config.videoDir,
          "--progress",
          "--transfers", "2",
          "--checkers", "4",
          "--drive-acknowledge-abuse",
        ], { timeout: 600000 }, (err) => {
          if (err) reject(err);
          else resolve();
        });

        proc.stdout?.on("data", (d) => {
          const line = d.toString().trim();
          if (line) console.log(`[rclone] ${line}`);
        });
        proc.stderr?.on("data", (d) => {
          const line = d.toString().trim();
          if (line) console.log(`[rclone] ${line}`);
        });
      });

      console.log("[sync] rclone sync completed");

      // Register any new videos with the API
      await this.#registerVideos();
    } catch (err) {
      console.error("[sync] error:", err.message);
    } finally {
      this.#syncing = false;
    }
  }

  /** Scan local video dir and POST new videos to /api/videos */
  async #registerVideos() {
    try {
      const files = readdirSync(this.#config.videoDir)
        .filter((f) => VIDEO_EXTS.has(extname(f).toLowerCase()));

      if (files.length === 0) return;

      // Get existing videos from API
      const res = await fetch(`${this.#config.apiUrl}/api/videos`);
      const existing = res.ok ? await res.json() : [];
      const existingNames = new Set(existing.map((v) => v.filename));

      let newCount = 0;
      for (const filename of files) {
        if (existingNames.has(filename)) continue;

        const filePath = join(this.#config.videoDir, filename);
        const stat = statSync(filePath);

        // Get duration via ffprobe
        let durationSec = null;
        try {
          const probe = execFileSync("ffprobe", [
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            filePath,
          ], { encoding: "utf-8" });
          const info = JSON.parse(probe);
          durationSec = parseFloat(info.format?.duration) || null;
        } catch { /* ffprobe not available or failed */ }

        await fetch(`${this.#config.apiUrl}/api/videos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename,
            drive_file_id: filename, // placeholder — real ID from rclone lsjson if needed
            duration_sec: durationSec,
            file_size: stat.size,
          }),
        });

        newCount++;
        console.log(`[sync] registered: ${filename} (${durationSec ? durationSec.toFixed(0) + "s" : "unknown duration"})`);
      }

      if (newCount > 0) {
        console.log(`[sync] registered ${newCount} new video(s)`);
      }
    } catch (err) {
      console.error("[sync] register error:", err.message);
    }
  }

  /** Get list of local video files */
  getLocalFiles() {
    try {
      return readdirSync(this.#config.videoDir)
        .filter((f) => VIDEO_EXTS.has(extname(f).toLowerCase()));
    } catch {
      return [];
    }
  }
}
