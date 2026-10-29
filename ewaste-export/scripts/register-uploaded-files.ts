// Register the user's uploaded files against their best-matching submissions.
//
// Run with: bun run scripts/register-uploaded-files.ts

import { PrismaClient } from "@prisma/client";
import { stat } from "fs/promises";
import path from "path";

const db = new PrismaClient();
const OWNER_EMAIL = "riya.vartha18@gmail.com";
const UPLOAD_DIR = "/home/z/my-project/upload";

// Map each uploaded file to the best-matching submission (by title keyword).
interface FileMapping {
  fileName: string;
  submissionTitleMatch: string; // substring of submission title to find
  submissionDateMatch?: string; // YYYY-MM-DD if there's ambiguity
}

const MAPPINGS: FileMapping[] = [
  { fileName: "Class Task_Upload the Write up done in Class.pdf", submissionTitleMatch: "Class Task" },
  { fileName: "AI_Bias_Mitigation_IEEE_3_.docx", submissionTitleMatch: "IEEE Paper" },
  { fileName: "EWEM_Assignment0_Ayushi.docx", submissionTitleMatch: "Assignment ZERO" },
  { fileName: "E_Waste_Comparative_Study_North_America_1.docx", submissionTitleMatch: "Comparison of Rules of Different Countries" },
  { fileName: "E_Waste_Rules_Company_Compliance_Analysis_1_.docx", submissionTitleMatch: "Companies Following E-waste Rules" },
  { fileName: "Kerala_Clean_Kerala_Company_Case_Study_1_.docx", submissionTitleMatch: "Companies Following E-waste Rules" },
  { fileName: "Himachal_Pradesh_EWaste_Companies-3_1_.docx", submissionTitleMatch: "Companies Following E-waste Rules" },
  { fileName: "Himachal_Pradesh_EWaste_IEEE_Report_2.docx", submissionTitleMatch: "IEEE Paper" },
  { fileName: "Hydrometallurgy_EWaste_Flow_Diagrams_Document_1__2.docx", submissionTitleMatch: "Recovery Process" },
  { fileName: "E_waste_India_Scenario_Comparison.pdf", submissionTitleMatch: "India Scenario" },
  { fileName: "Himachal_Pradesh_E-Waste_Tracker_20260811_204230_0000_2.pdf", submissionTitleMatch: "State-wise" },
  { fileName: "IMG_20260811_204427.jpg", submissionTitleMatch: "Carbon Footprint Tracker" },
  { fileName: "Himachal_Pradesh_EWaste_Tracker.xlsx", submissionTitleMatch: "Carbon Footprint Tracker" },
  { fileName: "Indian_Green_Buildings_LEED_Analysis_1_.xlsx", submissionTitleMatch: "LEED Certificate" },
  { fileName: "e_waste_pitch_1_.pptx", submissionTitleMatch: "Pitch Deck" },
];

function detectMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "pdf": return "application/pdf";
    case "docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "doc": return "application/msword";
    case "pptx": return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "ppt": return "application/vnd.ms-powerpoint";
    case "xlsx": return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "xls": return "application/vnd.ms-excel";
    case "csv": return "text/csv";
    case "png": return "image/png";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "zip": return "application/zip";
    default: return "application/octet-stream";
  }
}

async function main() {
  let created = 0;
  let skipped = 0;

  for (const m of MAPPINGS) {
    // Find the matching submission.
    const submission = await db.submission.findFirst({
      where: { title: { contains: m.submissionTitleMatch }, ownerEmail: OWNER_EMAIL },
    });
    if (!submission) {
      console.log(`✗ No submission matches "${m.submissionTitleMatch}" — skipping ${m.fileName}`);
      continue;
    }

    // Verify the file exists on disk.
    const filePath = path.join(UPLOAD_DIR, m.fileName);
    let size = 0;
    try {
      const s = await stat(filePath);
      size = s.size;
    } catch {
      console.log(`✗ File not found on disk: ${filePath}`);
      continue;
    }

    // Idempotent: skip if a SubmissionFile row with the same fileName + submissionId already exists.
    const existing = await db.submissionFile.findFirst({
      where: { submissionId: submission.id, fileName: m.fileName },
    });
    if (existing) {
      console.log(`• Already registered: ${m.fileName} → "${submission.title}"`);
      skipped += 1;
      continue;
    }

    await db.submissionFile.create({
      data: {
        submissionId: submission.id,
        fileName: m.fileName,
        filePath: m.fileName, // flat storage layout
        fileType: detectMimeType(m.fileName),
        fileSize: size,
      },
    });
    console.log(`✓ Registered: ${m.fileName} (${size} bytes) → "${submission.title}"`);
    created += 1;
  }

  console.log(`\nDone. Created ${created} new file record(s); ${skipped} already existed.`);

  // Final summary
  const allFiles = await db.submissionFile.findMany({
    include: { submission: { select: { title: true } } },
  });
  console.log(`\nTotal file records: ${allFiles.length}`);
  for (const f of allFiles) {
    console.log(`  ${f.fileName} (${f.fileSize} bytes) → ${f.submission.title}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
