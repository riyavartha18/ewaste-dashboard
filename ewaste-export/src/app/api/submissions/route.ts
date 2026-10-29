import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isOwner } from "@/lib/auth";
import { requireOwner, toSubmission } from "@/lib/submissions-api";
import type { SubmissionLink } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/submissions
//   - Owner: returns all their submissions with attached files.
//   - Anyone else: returns only published submissions (used by the public portal).
export async function GET() {
  const ownerCheck = await requireOwner();

  if (ownerCheck.ok) {
    const rows = await db.submission.findMany({
      where: { ownerEmail: ownerCheck.ownerEmail },
      include: { files: { orderBy: { createdAt: "asc" } } },
      orderBy: { submissionDate: "desc" },
    });
    return NextResponse.json({ submissions: rows.map(toSubmission) });
  }

  // Public path — published only.
  try {
    const rows = await db.submission.findMany({
      where: { published: true },
      include: { files: { orderBy: { createdAt: "asc" } } },
      orderBy: { submissionDate: "desc" },
    });
    return NextResponse.json({ submissions: rows.map(toSubmission) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/submissions
// Body: { title, category, submission_date, status, description?, external_links?, published? }
export async function POST(req: NextRequest) {
  const owner = await requireOwner();
  if (!owner.ok) {
    return NextResponse.json({ error: owner.message }, { status: owner.status });
  }
  const { ownerEmail, db: database } = owner;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const category = String(body.category ?? "").trim();
  const submissionDate = String(body.submission_date ?? "").trim();
  const status = body.status === "completed" ? "completed" : "draft";
  const description = body.description ? String(body.description) : null;
  const published = body.published === true;
  const links: SubmissionLink[] = Array.isArray(body.external_links)
    ? body.external_links
        .filter((l: any) => l && typeof l.label === "string" && typeof l.url === "string" && l.url.trim())
        .map((l: any) => ({ label: String(l.label).slice(0, 120), url: String(l.url).slice(0, 2048) }))
    : [];

  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });
  if (!category) return NextResponse.json({ error: "Category is required." }, { status: 400 });
  if (!submissionDate || !/^\d{4}-\d{2}-\d{2}$/.test(submissionDate)) {
    return NextResponse.json({ error: "Submission date must be a valid ISO date (YYYY-MM-DD)." }, { status: 400 });
  }

  const created = await database.submission.create({
    data: {
      title,
      category,
      submissionDate,
      status,
      description,
      externalLinks: JSON.stringify(links),
      published,
      ownerEmail,
    },
  });
  return NextResponse.json({
    submission: toSubmission({ ...created, files: [] }),
  });
}

export { isOwner };
