import { relative } from "path";

/**
 * Sends periodic heartbeats to the dashboard API with current playback state.
 * Updates the tvs table so the dashboard knows the agent is online.
 */
export class Heartbeat {
  #config;
  #mpv;
  #intervalId = null;

  constructor(config, mpvController) {
    this.#config = config;
    this.#mpv = mpvController;
  }

  start() {
    console.log(`[heartbeat] reporting every ${this.#config.heartbeatIntervalMs}ms`);
    this.#intervalId = setInterval(() => this.#beat(), this.#config.heartbeatIntervalMs);
    this.#beat(); // immediate first beat
  }

  stop() {
    if (this.#intervalId) clearInterval(this.#intervalId);
  }

  async #beat() {
    try {
      const state = await this.#mpv.getState();

      // Convert full path to relative filename to match DB entries
      let filename = state.filename;
      if (state.path && this.#config.videoDir) {
        try {
          filename = relative(this.#config.videoDir, state.path).replace(/\\/g, "/");
        } catch { /* keep original */ }
      }

      await fetch(`${this.#config.apiUrl}/api/agent/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tv_id: this.#config.tvId,
          status: state.status,
          current_filename: filename,
          position_sec: state.position,
          duration_sec: state.duration,
          playback_speed: state.speed,
        }),
      });
    } catch (err) {
      console.error("[heartbeat] error:", err.message);
    }
  }
}
