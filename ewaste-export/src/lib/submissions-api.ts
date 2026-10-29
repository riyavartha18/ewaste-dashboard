import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import type { Submission, SubmissionFile, SubmissionLink, SubmissionStatus } from "@/lib/types";

// Helpers shared by the submissions API routes.

// Converts a Prisma submission row (with its files) into the public TS shape.
export function toSubmission(
  row: {
    id: string;
    title: string;
    category: string;
    submissionDate: string;
    status: string;
    description: string | null;
    externalLinks: string;
    published: boolean;
    ownerEmail: string;
    createdAt: Date;
    updatedAt: Date;
    files?: {
      id: string;
      submissionId: string;
      fileName: string;
      filePath: string;
      fileType: string;
      fileSize: number | bigint;
      createdAt: Date;
    }[];
  },
): Submission {
  let links: SubmissionLink[] = [];
  try {
    const parsed = JSON.parse(row.externalLinks || "[]");
    if (Array.isArray(parsed)) {
      links = parsed
        .filter((l: any) => l && typeof l.label === "string" && typeof l.url === "string")
        .map((l: any) => ({ label: String(l.label), url: String(l.url) }));
    }
  } catch {
    links = [];
  }

  return {
    id: row.id,
    title: row.title,
    category: row.category,
    submission_date: row.submissionDate,
    status: (row.status === "completed" ? "completed" : "draft") as SubmissionStatus,
    description: row.description,
    external_links: links,
    published: row.published,
    owner_email: row.ownerEmail,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    files: row.files?.map((f) => ({
      id: f.id,
      submission_id: f.submissionId,
      file_name: f.fileName,
      file_path: f.filePath,
      file_type: f.fileType,
      file_size: Number(f.fileSize),
      created_at: f.createdAt.toISOString(),
    })),
  };
}

export { requireOwner };
export type { Submission, SubmissionFile };
