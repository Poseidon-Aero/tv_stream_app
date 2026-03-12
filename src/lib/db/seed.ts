import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { tvs } from "./schema";

async function seed() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  console.log("Seeding TVs...");

  await db.insert(tvs).values([
    { id: "tv-1", macId: "mac-mini-1" },
    { id: "tv-2", macId: "mac-mini-2" },
    { id: "tv-3", macId: "mac-mini-3" },
  ]).onConflictDoNothing();

  console.log("Done!");
}

seed().catch(console.error);
