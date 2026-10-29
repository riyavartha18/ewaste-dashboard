import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/submissions-api";
import { readFileBuffer } from "@/lib/storage";
import { mimeTypeFor } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ fileId: string }> };

// GET /api/files/[fileId]?preview=1|download=1
//
// Streams the file bytes directly from the local storage directory.
// Auth model:
//   - Owner (matched by JWT email == submission owner_email): always allowed.
//   - Anyone else: allowed only if the parent submission is published.
//
// Query params:
//   - download=1  → set Content-Disposition: attachment; filename="..."
//   - preview=1   → set Content-Disposition: inline; filename="..."
//   - (default)   → inline (preview-friendly)
export async function GET(req: NextRequest, { params }: Params) {
  const { fileId } = await params;
  const url = new URL(req.url);
  const isDownload = url.searchParams.has("download");
  const dispositionType = isDownload ? "attachment" : "inline";

  const fileRow = await db.submissionFile.findUnique({
    where: { id: fileId },
    include: { submission: true },
  });
  if (!fileRow) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  // Auth check: owner OR published
  const ownerCheck = await requireOwner();
  const isOwner = ownerCheck.ok && ownerCheck.ownerEmail === fileRow.submission.ownerEmail;
  if (!isOwner && !fileRow.submission.published) {
    return NextResponse.json(
      { error: "This file is not publicly available." },
      { status: 403 },
    );
  }

  let buffer: Buffer;
  try {
    buffer = await readFileBuffer(fileRow.filePath);
  } catch {
    return NextResponse.json(
      { error: "File is missing from storage. Re-upload from the dashboard." },
      { status: 410 },
    );
  }

  const fileName = fileRow.fileName.replace(/[^\x20-\x7E]/g, "_");
  const encodedName = encodeURIComponent(fileRow.fileName);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": mimeTypeFor({ name: fileRow.fileName, type: fileRow.fileType }),
      "Content-Length": String(buffer.length),
      "Content-Disposition": `${dispositionType}; filename="${fileName}"; filename*=UTF-8''${encodedName}`,
      // Published files must be fetchable by Office Online, which loads the
      // document from its own servers without the owner's browser session.
      // Keep draft/owner-only files private and uncached.
      "Cache-Control": fileRow.submission.published
        ? "public, max-age=300, s-maxage=300"
        : "private, no-store",
      // Allow inline rendering in iframe (PDFs / images) without allowing
      // cross-origin script execution.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
