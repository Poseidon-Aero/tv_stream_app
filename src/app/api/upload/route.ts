import { NextResponse } from "next/server";
import { google } from "googleapis";
import { Readable } from "stream";
import { getDb, schema } from "@/lib/db";

const DRIVE_FOLDER_ID = "1WXXIj_MsQ9kua8fVWEnRtjH5EeUNoTHO";

function getDriveClient() {
  const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
  return google.drive({ version: "v3", auth });
}

// GET /api/upload — list files in the Drive folder
export async function GET() {
  try {
    const drive = getDriveClient();
    const res = await drive.files.list({
      q: `'${DRIVE_FOLDER_ID}' in parents and trashed = false`,
      fields: "files(id, name, size, mimeType, createdTime)",
      orderBy: "name",
      pageSize: 200,
    });
    return NextResponse.json(res.data.files ?? []);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/upload — upload a video to Google Drive and register it
export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const filename = file.name;
  const drive = getDriveClient();

  // Upload to Google Drive
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const stream = Readable.from(buffer);

  const driveFile = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [DRIVE_FOLDER_ID],
    },
    media: {
      mimeType: file.type || "video/mp4",
      body: stream,
    },
    fields: "id, name, size",
  });

  const driveFileId = driveFile.data.id!;

  // Register in DB
  const [video] = await getDb()
    .insert(schema.videos)
    .values({
      filename,
      driveFileId,
      fileSize: file.size,
    })
    .onConflictDoUpdate({
      target: schema.videos.filename,
      set: {
        driveFileId,
        fileSize: file.size,
        syncedAt: new Date(),
      },
    })
    .returning();

  return NextResponse.json(video);
}
