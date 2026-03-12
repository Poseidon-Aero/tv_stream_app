import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { tvs, videos } from "./schema";

async function seed() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  console.log("Seeding TVs...");
  await db.insert(tvs).values([
    { id: "tv-1", macId: "mac-mini-1" },
    { id: "tv-2", macId: "mac-mini-2" },
    { id: "tv-3", macId: "mac-mini-3" },
  ]).onConflictDoNothing();

  console.log("Seeding test videos...");
  await db.insert(videos).values([
    { filename: "Corporate Intro 2026.mp4", driveFileId: "demo-1", durationSec: 127, fileSize: 245_000_000, thumbnailUrl: "https://picsum.photos/seed/vid1/320/180" },
    { filename: "Product Launch Reel.mp4", driveFileId: "demo-2", durationSec: 342, fileSize: 890_000_000, thumbnailUrl: "https://picsum.photos/seed/vid2/320/180" },
    { filename: "Office Tour Timelapse.mp4", driveFileId: "demo-3", durationSec: 95, fileSize: 156_000_000, thumbnailUrl: "https://picsum.photos/seed/vid3/320/180" },
    { filename: "Annual Report Highlights.mp4", driveFileId: "demo-4", durationSec: 480, fileSize: 1_200_000_000, thumbnailUrl: "https://picsum.photos/seed/vid4/320/180" },
    { filename: "Team Building Recap.mp4", driveFileId: "demo-5", durationSec: 215, fileSize: 534_000_000, thumbnailUrl: "https://picsum.photos/seed/vid5/320/180" },
    { filename: "Holiday Greeting Loop.mp4", driveFileId: "demo-6", durationSec: 30, fileSize: 42_000_000, thumbnailUrl: "https://picsum.photos/seed/vid6/320/180" },
    { filename: "Lobby Ambient Nature.mp4", driveFileId: "demo-7", durationSec: 3600, fileSize: 4_500_000_000, thumbnailUrl: "https://picsum.photos/seed/vid7/320/180" },
    { filename: "Client Testimonials.mp4", driveFileId: "demo-8", durationSec: 185, fileSize: 320_000_000, thumbnailUrl: "https://picsum.photos/seed/vid8/320/180" },
    { filename: "Safety Procedures Overview.mp4", driveFileId: "demo-9", durationSec: 600, fileSize: 1_800_000_000, thumbnailUrl: "https://picsum.photos/seed/vid9/320/180" },
    { filename: "Welcome Screen Animation.mp4", driveFileId: "demo-10", durationSec: 15, fileSize: 18_000_000, thumbnailUrl: "https://picsum.photos/seed/vid10/320/180" },
  ]).onConflictDoNothing();

  console.log("Done! Seeded 3 TVs and 10 test videos.");
}

seed().catch(console.error);
