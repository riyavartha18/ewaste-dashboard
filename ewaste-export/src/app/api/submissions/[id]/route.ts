import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwner, toSubmission } from "@/lib/submissions-api";
import { deleteSubmissionDir } from "@/lib/storage";
import type { SubmissionLink } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/submissions/[id]
//   - Owner: returns the submission regardless of published status.
//   - Public: returns the submission only if published=true.
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const row = await db.submission.findUnique({
    where: { id },
    include: { files: { orderBy: { createdAt: "asc" } } },
  });
  if (!row) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  const owner = await requireOwner();
  const isOwnerCall = owner.ok && owner.ownerEmail === row.ownerEmail;
  if (!isOwnerCall && !row.published) {
    return NextResponse.json({ error: "Submission not found or not published." }, { status: 404 });
  }
  return NextResponse.json({ submission: toSubmission(row) });
}

// PATCH /api/submissions/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  const owner = await requireOwner();
  if (!owner.ok) {
    return NextResponse.json({ error: owner.message }, { status: owner.status });
  }
  const { db: database } = owner;
  const { id } = await params;

  const existing = await database.submission.findUnique({ where: { id } });
  if (!existing || existing.ownerEmail !== owner.ownerEmail) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const patch: any = { updatedAt: new Date() };
  if (typeof body.title === "string" && body.title.trim()) patch.title = body.title.trim();
  if (typeof body.category === "string" && body.category.trim()) patch.category = body.category.trim();
  if (typeof body.submission_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.submission_date)) {
    patch.submissionDate = body.submission_date;
  }
  if (body.status === "completed" || body.status === "draft") patch.status = body.status;
  if (typeof body.description === "string") patch.description = body.description || null;
  if (body.published === true || body.published === false) patch.published = body.published;
  if (Array.isArray(body.external_links)) {
    const links: SubmissionLink[] = body.external_links
      .filter((l: any) => l && typeof l.label === "string" && typeof l.url === "string" && l.url.trim())
      .map((l: any) => ({ label: String(l.label).slice(0, 120), url: String(l.url).slice(0, 2048) }));
    patch.externalLinks = JSON.stringify(links);
  }

  const updated = await database.submission.update({
    where: { id },
    data: patch,
    include: { files: { orderBy: { createdAt: "asc" } } },
  });
  return NextResponse.json({ submission: toSubmission(updated) });
}

// DELETE /api/submissions/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const owner = await requireOwner();
  if (!owner.ok) {
    return NextResponse.json({ error: owner.message }, { status: owner.status });
  }
  const { db: database } = owner;
  const { id } = await params;

  const existing = await database.submission.findUnique({
    where: { id },
    include: { files: true },
  });
  if (!existing || existing.ownerEmail !== owner.ownerEmail) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  // Remove all files from disk (best-effort), then delete the DB row.
  await deleteSubmissionDir(owner.ownerEmail, id);
  await database.submission.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
