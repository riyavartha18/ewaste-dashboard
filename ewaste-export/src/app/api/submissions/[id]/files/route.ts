import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/submissions-api";
import {
  isFileAllowed,
  mimeTypeFor,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/types";
import { buildFilePath, saveFileBuffer } from "@/lib/storage";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// POST /api/submissions/[id]/files
// Multipart body: one or more `file` entries (we accept the first for each
// request — the client uploads them one at a time via XHR).
// Authorization: only the owner (matched by email) of the parent submission
// may upload files.
export async function POST(req: NextRequest, { params }: Params) {
  const owner = await requireOwner();
  if (!owner.ok) {
    return NextResponse.json({ error: owner.message }, { status: owner.status });
  }
  const { db: database, ownerEmail } = owner;
  const { id } = await params;

  const sub = await database.submission.findUnique({ where: { id } });
  if (!sub || sub.ownerEmail !== ownerEmail) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Empty file." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: "File exceeds 50 MB limit." }, { status: 413 });
  }
  if (!isFileAllowed(file)) {
    return NextResponse.json({ error: "Unsupported file type." }, { status: 415 });
  }

  const relPath = await buildFilePath(ownerEmail, id, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    await saveFileBuffer(relPath, buffer);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const row = await database.submissionFile.create({
    data: {
      submissionId: id,
      fileName: file.name,
      filePath: relPath,
      fileType: mimeTypeFor(file),
      fileSize: file.size,
    },
  });

  return NextResponse.json({
    file: {
      id: row.id,
      submission_id: id,
      file_name: row.fileName,
      file_path: row.filePath,
      file_type: row.fileType,
      file_size: row.fileSize,
      created_at: row.createdAt.toISOString(),
    },
  });
}
