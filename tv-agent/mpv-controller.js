import { createConnection } from "net";
import { EventEmitter } from "events";
import { spawn } from "child_process";
import { existsSync } from "fs";

/**
 * Controls mpv via its JSON IPC protocol over a Unix socket.
 * Handles spawning mpv, sending commands, and reading playback state.
 */
export class MpvController extends EventEmitter {
  #socketPath;
  #conn = null;
  #buffer = "";
  #requestId = 1;
  #pending = new Map(); // requestId -> { resolve, reject, timer }
  #mpvProcess = null;
  #reconnectTimer = null;
  #connected = false;

  constructor(socketPath = "/tmp/mpv-socket") {
    super();
    this.#socketPath = socketPath;
  }

  /** Launch mpv in idle mode with IPC socket */
  async launch() {
    if (this.#mpvProcess && !this.#mpvProcess.killed) {
      return; // already running
    }

    // Kill any existing mpv using our socket
    try {
      const { execSync } = await import("child_process");
      execSync(`lsof -t ${this.#socketPath} | xargs kill -9 2>/dev/null`, { stdio: "ignore" });
    } catch { /* no existing process */ }

    this.#mpvProcess = spawn("mpv", [
      "--idle",
      `--input-ipc-server=${this.#socketPath}`,
      "--fs",
      "--no-osc",
      "--no-input-default-bindings",
      "--hwdec=auto",
      "--vo=gpu",
      "--keep-open=yes",
      "--really-quiet",
    ], {
      stdio: ["ignore", "ignore", "ignore"],
    });

    this.#mpvProcess.on("exit", (code) => {
      console.log(`[mpv] exited with code ${code}`);
      this.#connected = false;
      this.emit("exit", code);
    });

    // Wait for socket to appear
    await this.#waitForSocket(5000);
    await this.connect();
  }

  async #waitForSocket(timeoutMs) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (existsSync(this.#socketPath)) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error(`mpv socket not created within ${timeoutMs}ms`);
  }

  /** Connect to an existing mpv IPC socket */
  async connect() {
    return new Promise((resolve, reject) => {
      let resolved = false;
      this.#conn = createConnection(this.#socketPath);

      this.#conn.on("connect", () => {
        this.#connected = true;
        this.#buffer = "";
        resolved = true;
        console.log("[mpv] connected to IPC socket");
        this.emit("connected");
        resolve();
      });

      this.#conn.on("data", (data) => {
        this.#buffer += data.toString();
        const lines = this.#buffer.split("\n");
        this.#buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.request_id !== undefined && this.#pending.has(msg.request_id)) {
              const { resolve, timer } = this.#pending.get(msg.request_id);
              clearTimeout(timer);
              this.#pending.delete(msg.request_id);
              resolve(msg);
            } else if (msg.event) {
              this.emit("mpv-event", msg);
              if (msg.event === "end-file") {
                this.emit("end-file", msg.reason);
              }
            }
          } catch { /* ignore parse errors */ }
        }
      });

      this.#conn.on("error", (err) => {
        this.#connected = false;
        if (!resolved) {
          reject(err);
        } else {
          console.warn("[mpv] socket error (will reconnect):", err.message);
          this.#scheduleReconnect();
        }
      });

      this.#conn.on("close", () => {
        const wasConnected = this.#connected;
        this.#connected = false;
        this.emit("disconnected");
        if (wasConnected) {
          console.log("[mpv] connection lost, will reconnect...");
          this.#scheduleReconnect();
        }
      });
    });
  }

  #scheduleReconnect() {
    if (this.#reconnectTimer) return;
    this.#reconnectTimer = setTimeout(async () => {
      this.#reconnectTimer = null;
      // If mpv process is dead, relaunch
      if (!this.#mpvProcess || this.#mpvProcess.killed) {
        console.log("[mpv] process dead, relaunching...");
        try {
          await this.launch();
        } catch (err) {
          console.error("[mpv] relaunch failed:", err.message);
          this.#scheduleReconnect();
        }
        return;
      }
      // Otherwise just reconnect to socket
      try {
        await this.connect();
        console.log("[mpv] reconnected");
      } catch (err) {
        console.error("[mpv] reconnect failed:", err.message);
        this.#scheduleReconnect();
      }
    }, 2000);
  }

  get isConnected() {
    return this.#connected;
  }

  /** Send a command and wait for response */
  #send(command) {
    return new Promise((resolve, reject) => {
      if (!this.#connected || !this.#conn) {
        return reject(new Error("Not connected to mpv"));
      }
      const id = this.#requestId++;
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        reject(new Error("mpv command timeout"));
      }, 5000);

      this.#pending.set(id, { resolve, reject, timer });
      this.#conn.write(JSON.stringify({ command, request_id: id }) + "\n");
    });
  }

  /** Load and play a file */
  async loadFile(path) {
    return this.#send(["loadfile", path, "replace"]);
  }

  /** Append a file to the internal playlist */
  async appendFile(path) {
    return this.#send(["loadfile", path, "append"]);
  }

  async play() {
    return this.#send(["set_property", "pause", false]);
  }

  async pause() {
    return this.#send(["set_property", "pause", true]);
  }

  async stop() {
    return this.#send(["stop"]);
  }

  async seek(positionSec) {
    return this.#send(["seek", positionSec, "absolute"]);
  }

  async next() {
    return this.#send(["playlist-next"]);
  }

  async previous() {
    return this.#send(["playlist-prev"]);
  }

  async setSpeed(speed) {
    return this.#send(["set_property", "speed", speed]);
  }

  /** Get a property value from mpv */
  async getProperty(name) {
    try {
      const res = await this.#send(["get_property", name]);
      return res.error === "success" ? res.data : null;
    } catch {
      return null;
    }
  }

  /** Get full playback state snapshot */
  async getState() {
    const [paused, position, duration, filename, path, speed, idle] = await Promise.all([
      this.getProperty("pause"),
      this.getProperty("time-pos"),
      this.getProperty("duration"),
      this.getProperty("media-title"),
      this.getProperty("path"),
      this.getProperty("speed"),
      this.getProperty("idle-active"),
    ]);

    let status = "idle";
    if (!idle && path) {
      status = paused ? "paused" : "playing";
    }

    return {
      status,
      filename: filename || null,
      path: path || null,
      position: position ?? 0,
      duration: duration ?? 0,
      speed: speed ?? 1.0,
    };
  }

  /** Gracefully quit mpv */
  async quit() {
    try {
      await this.#send(["quit"]);
    } catch { /* already closed */ }
    this.#conn?.destroy();
    this.#connected = false;
  }
}
