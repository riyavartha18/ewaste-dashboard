import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toSubmission } from "@/lib/submissions-api";

export const dynamic = "force-dynamic";

// GET /api/public/submissions
// Returns ONLY published submissions, with their attached file metadata.
// No owner session required.
export async function GET() {
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
