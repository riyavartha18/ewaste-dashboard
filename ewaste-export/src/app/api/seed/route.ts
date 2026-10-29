import { NextResponse } from "next/server";
import { requireOwner, toSubmission } from "@/lib/submissions-api";
import { SEED_SUBMISSIONS } from "@/lib/seed";

export const dynamic = "force-dynamic";

// POST /api/seed
// Idempotently seeds the 14 initial submission records for the owner
// (matched by title + submission_date). Existing records are left intact.
// Files are NOT seeded — the user attaches them later from the dashboard.
export async function POST() {
  const owner = await requireOwner();
  if (!owner.ok) {
    return NextResponse.json({ error: owner.message }, { status: owner.status });
  }
  const { db: database, ownerEmail } = owner;

  const created: string[] = [];
  const skipped: string[] = [];

  for (const seed of SEED_SUBMISSIONS) {
    const existing = await database.submission.findFirst({
      where: {
        title: seed.title,
        submissionDate: seed.submission_date,
        ownerEmail,
      },
    });

    if (existing) {
      skipped.push(seed.title);
      continue;
    }

    await database.submission.create({
      data: {
        title: seed.title,
        category: seed.category,
        submissionDate: seed.submission_date,
        status: seed.status,
        description: seed.description ?? null,
        externalLinks: JSON.stringify([]),
        published: seed.published,
        ownerEmail,
      },
    });
    created.push(seed.title);
  }

  const all = await database.submission.findMany({
    where: { ownerEmail },
    include: { files: { orderBy: { createdAt: "asc" } } },
    orderBy: { submissionDate: "desc" },
  });

  return NextResponse.json({
    seeded: created.length,
    skipped: skipped.length,
    created,
    skipped_titles: skipped,
    submissions: all.map(toSubmission),
  });
}
