import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/submissions-api";
import { deleteFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; fileId: string }> };

// DELETE /api/submissions/[id]/files/[fileId]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const owner = await requireOwner();
  if (!owner.ok) {
    return NextResponse.json({ error: owner.message }, { status: owner.status });
  }
  const { db: database, ownerEmail } = owner;
  const { id, fileId } = await params;

  const fileRow = await database.submissionFile.findUnique({
    where: { id: fileId },
    include: { submission: true },
  });
  if (!fileRow || fileRow.submissionId !== id) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
  if (fileRow.submission.ownerEmail !== ownerEmail) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await deleteFile(fileRow.filePath);
  await database.submissionFile.delete({ where: { id: fileId } });
  return NextResponse.json({ ok: true });
}
