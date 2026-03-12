import { execFileSync } from "child_process";
import { readdirSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join, extname, basename } from "path";

const VIDEO_EXTS = new Set([".mp4", ".mkv", ".avi", ".mov", ".webm", ".m4v", ".wmv", ".flv"]);

/**
 * Generates thumbnails from video files using ffmpeg and uploads them
 * to /api/videos (PATCH with thumbnail as base64 or Vercel Blob URL).
 */
export class ThumbnailGenerator {
  #config;
  #thumbDir;
  #processing = false;

  constructor(config) {
    this.#config = config;
    this.#thumbDir = join(config.videoDir, ".thumbs");
  }

  /** Generate thumbnails for all videos that don't have one yet */
  async generateAll() {
    if (this.#processing) return;
    this.#processing = true;

    try {
      if (!existsSync(this.#thumbDir)) {
        mkdirSync(this.#thumbDir, { recursive: true });
      }

      // Get videos from API that are missing thumbnails
      const res = await fetch(`${this.#config.apiUrl}/api/videos`);
      if (!res.ok) return;

      const videos = await res.json();
      const needsThumbnail = videos.filter((v) => !v.thumbnailUrl);

      for (const video of needsThumbnail) {
        const videoPath = join(this.#config.videoDir, video.filename);
        if (!existsSync(videoPath)) continue;

        const thumbPath = join(this.#thumbDir, `${basename(video.filename, extname(video.filename))}.jpg`);

        try {
          // Extract frame at 10% of duration or 2 seconds
          const seekTo = video.durationSec ? Math.max(video.durationSec * 0.1, 1) : 2;

          execFileSync("ffmpeg", [
            "-y",
            "-ss", String(seekTo),
            "-i", videoPath,
            "-vframes", "1",
            "-vf", `scale=${this.#config.thumbnailWidth}:-1`,
            "-q:v", "5",
            thumbPath,
          ], { stdio: "ignore", timeout: 30000 });

          // Read the thumbnail and upload as base64 data URL
          const thumbData = readFileSync(thumbPath);
          const base64 = thumbData.toString("base64");
          const dataUrl = `data:image/jpeg;base64,${base64}`;

          // Update the video record with thumbnail
          await fetch(`${this.#config.apiUrl}/api/videos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: video.filename,
              drive_file_id: video.driveFileId,
              thumbnail_url: dataUrl,
            }),
          });

          console.log(`[thumbs] generated: ${video.filename}`);
        } catch (err) {
          console.error(`[thumbs] failed for ${video.filename}:`, err.message);
        }
      }
    } catch (err) {
      console.error("[thumbs] error:", err.message);
    } finally {
      this.#processing = false;
    }
  }
}
