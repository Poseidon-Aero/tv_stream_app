import { readFileSync } from "fs";
import { MpvController } from "./mpv-controller.js";
import { CommandPoller } from "./command-poller.js";
import { Heartbeat } from "./heartbeat.js";
import { DriveSync } from "./drive-sync.js";
import { ThumbnailGenerator } from "./thumbnail-gen.js";

// Load config — can override with CLI arg: node index.js /path/to/config.json
const configPath = process.argv[2] || new URL("./config.json", import.meta.url).pathname;
const config = JSON.parse(readFileSync(configPath, "utf-8"));

console.log("=".repeat(50));
console.log(`TV Agent starting — ${config.tvId}`);
console.log(`API: ${config.apiUrl}`);
console.log(`Videos: ${config.videoDir}`);
console.log(`Drive: ${config.rcloneRemote}:${config.driveFolder}`);
console.log("=".repeat(50));

// --- Initialize components ---
const mpv = new MpvController(config.mpvSocket);
const driveSync = new DriveSync(config);
const commands = new CommandPoller(config, mpv, driveSync);
const heartbeat = new Heartbeat(config, mpv);
const thumbGen = new ThumbnailGenerator(config);

// --- Start ---
async function main() {
  try {
    // 1. Launch mpv
    console.log("[main] launching mpv...");
    await mpv.launch();
    console.log("[main] mpv ready");

    // 2. Start command polling
    commands.start();

    // 3. Start heartbeat
    heartbeat.start();

    // 4. Start drive sync (runs on interval)
    driveSync.start();

    // 5. Generate thumbnails after first sync completes
    // We'll also regenerate periodically
    setInterval(async () => {
      await thumbGen.generateAll();
    }, config.driveSyncIntervalMs + 30000); // offset from sync

    // Generate immediately for any existing videos
    setTimeout(() => thumbGen.generateAll(), 10000);

    console.log("[main] all systems running");
  } catch (err) {
    console.error("[main] startup failed:", err);
    process.exit(1);
  }
}

// --- Graceful shutdown ---
async function shutdown() {
  console.log("\n[main] shutting down...");
  commands.stop();
  heartbeat.stop();
  driveSync.stop();
  await mpv.quit();
  console.log("[main] goodbye");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main();
