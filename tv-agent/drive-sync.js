import { execFileSync, execFile } from "child_process";
import { readdirSync, statSync, existsSync, mkdirSync, createWriteStream } from "fs";
import { join, extname, relative, dirname } from "path";
import { pipeline } from "stream/promises";

const VIDEO_EXTS = new Set([".mp4", ".mkv", ".avi", ".mov", ".webm", ".m4v", ".wmv", ".flv"]);

/** Recursively find all video files under a directory, returns full paths */
function findVideos(dir) {
  const results = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findVideos(full));
      } else if (VIDEO_EXTS.has(extname(entry.name).toLowerCase())) {
        results.push(full);
      }
    }
  } catch { /* permission error or similar */ }
  return results;
}

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

      try {
        await new Promise((resolve, reject) => {
          const proc = execFile("rclone", [
            "sync",
            remote,
            this.#config.videoDir,
            "--progress",
            "--transfers", "2",
            "--checkers", "4",
            "--drive-acknowledge-abuse",
            "--drive-shared-with-me",
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
      } catch (err) {
        console.error("[sync] rclone error (will still register local files):", err.message);
      }

      // Download any uploaded videos (from Vercel Blob) that aren't local yet
      await this.#downloadUploads();

      // Always register local videos, even if rclone had errors
      await this.#registerVideos();
    } catch (err) {
      console.error("[sync] error:", err.message);
    } finally {
      this.#syncing = false;
    }
  }

  /** Download videos uploaded via dashboard (stored in Vercel Blob) */
  async #downloadUploads() {
    try {
      const res = await fetch(`${this.#config.apiUrl}/api/videos`);
      if (!res.ok) return;
      const videos = await res.json();

      for (const video of videos) {
        if (!video.blobUrl) continue; // not an upload
        const localPath = join(this.#config.videoDir, video.filename);
        if (existsSync(localPath)) continue; // already downloaded

        console.log(`[sync] downloading upload: ${video.filename}`);
        // Ensure subdirectory exists
        const dir = dirname(localPath);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

        try {
          const dlRes = await fetch(video.blobUrl);
          if (!dlRes.ok || !dlRes.body) {
            console.error(`[sync] download failed for ${video.filename}: ${dlRes.status}`);
            continue;
          }
          const fileStream = createWriteStream(localPath);
          await pipeline(dlRes.body, fileStream);
          console.log(`[sync] downloaded: ${video.filename}`);
        } catch (err) {
          console.error(`[sync] download error for ${video.filename}:`, err.message);
        }
      }
    } catch (err) {
      console.error("[sync] upload download check error:", err.message);
    }
  }

  /** Scan local video dir recursively and POST new videos to /api/videos */
  async #registerVideos() {
    try {
      const videoPaths = findVideos(this.#config.videoDir);

      console.log(`[sync] found ${videoPaths.length} local video file(s)`);
      if (videoPaths.length === 0) return;

      // Get existing videos from API
      const res = await fetch(`${this.#config.apiUrl}/api/videos`);
      const existing = res.ok ? await res.json() : [];
      const existingNames = new Set(existing.map((v) => v.filename));

      let newCount = 0;
      for (const filePath of videoPaths) {
        const filename = relative(this.#config.videoDir, filePath).replace(/\\/g, "/");
        if (existingNames.has(filename)) continue;

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
            drive_file_id: filename,
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

  /** Get list of local video files (relative paths) */
  getLocalFiles() {
    try {
      return findVideos(this.#config.videoDir)
        .map((f) => relative(this.#config.videoDir, f).replace(/\\/g, "/"));
    } catch {
      return [];
    }
  }
}
