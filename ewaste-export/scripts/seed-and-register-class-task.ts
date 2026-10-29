// One-time bootstrap that:
// 1. Re-seeds all 14 initial submission records (idempotent — skips if a
//    submission with the same title + submissionDate + ownerEmail already
//    exists).
// 2. Registers the user's existing PDF file "Class Task_Upload the Write up
//    done in Class.pdf" as the attached file for the Class Task submission.
//
// Run with: bun run scripts/seed-and-register-class-task.ts

import { PrismaClient } from "@prisma/client";
import { stat } from "fs/promises";
import { SEED_SUBMISSIONS } from "../src/lib/seed";

const db = new PrismaClient();
const OWNER_EMAIL = "riya.vartha18@gmail.com";
const CLASS_TASK_TITLE = "Class Task — Upload the Write-up Done in Class";
const CLASS_TASK_DATE = "2026-07-02";
const PDF_FILE_NAME = "Class Task_Upload the Write up done in Class.pdf";
const PDF_FILE_PATH = `/home/z/my-project/upload/${PDF_FILE_NAME}`;

async function main() {
  // 1. Re-seed all 14 submissions (skip existing ones).
  let created = 0;
  let skipped = 0;
  for (const seed of SEED_SUBMISSIONS) {
    const existing = await db.submission.findFirst({
      where: {
        title: seed.title,
        submissionDate: seed.submission_date,
        ownerEmail: OWNER_EMAIL,
      },
    });
    if (existing) {
      skipped += 1;
      continue;
    }
    await db.submission.create({
      data: {
        title: seed.title,
        category: seed.category,
        submissionDate: seed.submission_date,
        status: seed.status,
        description: seed.description ?? null,
        externalLinks: JSON.stringify([]),
        published: seed.published,
        ownerEmail: OWNER_EMAIL,
      },
    });
    created += 1;
  }
  console.log(`Seeded ${created} new submission(s); ${skipped} already existed.`);

  // 2. Find the Class Task submission (should now exist with the 2 July date).
  const classTask = await db.submission.findFirst({
    where: {
      title: CLASS_TASK_TITLE,
      submissionDate: CLASS_TASK_DATE,
      ownerEmail: OWNER_EMAIL,
    },
  });
  if (!classTask) {
    console.error(`Could not find submission "${CLASS_TASK_TITLE}" dated ${CLASS_TASK_DATE}.`);
    process.exit(1);
  }
  console.log(`Class Task submission: id=${classTask.id}, date=${classTask.submissionDate}`);

  // 3. Verify the PDF file exists on disk and read its size.
  let size = 0;
  try {
    const s = await stat(PDF_FILE_PATH);
    size = s.size;
  } catch (e) {
    console.error(`PDF file not found at ${PDF_FILE_PATH}`);
    process.exit(1);
  }
  console.log(`PDF file found: ${PDF_FILE_PATH} (${size} bytes)`);

  // 4. Register the file in the SubmissionFile table (idempotent — if a row
  //    with the same file_path already exists, skip).
  const existingFile = await db.submissionFile.findFirst({
    where: { filePath: PDF_FILE_NAME },
  });
  if (existingFile) {
    console.log(`File already registered (id=${existingFile.id}). Nothing to do.`);
    return;
  }
  const fileRow = await db.submissionFile.create({
    data: {
      submissionId: classTask.id,
      fileName: PDF_FILE_NAME,
      filePath: PDF_FILE_NAME, // relative path under STORAGE_DIR (/home/z/my-project/upload/)
      fileType: "application/pdf",
      fileSize: size,
    },
  });
  console.log(`File registered: id=${fileRow.id}, file_path=${fileRow.filePath}`);

  // 5. Done. Print a summary.
  const all = await db.submission.findMany({
    where: { ownerEmail: OWNER_EMAIL },
    include: { files: true },
    orderBy: { submissionDate: "asc" },
  });
  console.log("\n=== Current submissions (oldest first) ===");
  for (const s of all) {
    const fileCount = s.files.length;
    console.log(
      `${s.submissionDate} | ${s.title} | files=${fileCount}${fileCount > 0 ? ` (${s.files.map((f) => f.fileName).join(", ")})` : ""}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
