// Type definitions shared across the E-Waste Submission Portal.

export type SubmissionStatus = "completed" | "draft";

export interface SubmissionFile {
  id: string;
  submission_id: string;
  file_name: string;
  file_path: string;   // Supabase Storage path inside the bucket
  file_type: string;   // MIME type
  file_size: number;   // bytes
  created_at: string;
}

export interface Submission {
  id: string;
  title: string;
  category: string;
  submission_date: string;     // ISO date YYYY-MM-DD
  status: SubmissionStatus;
  description: string | null;
  external_links: SubmissionLink[];
  published: boolean;
  owner_email: string;
  created_at: string;
  updated_at: string;
  files?: SubmissionFile[];
}

export interface SubmissionLink {
  label: string;
  url: string;
}

export interface Session {
  user: {
    id: string;
    email: string;
  } | null;
}

export interface ApiError {
  error: string;
  details?: string;
}

// Allowed upload MIME types and their human-friendly labels.
export const ALLOWED_FILE_TYPES: { mime: string; ext: string[]; label: string }[] = [
  { mime: "application/pdf", ext: ["pdf"], label: "PDF" },
  { mime: "application/msword", ext: ["doc"], label: "DOC" },
  { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: ["docx"], label: "DOCX" },
  { mime: "application/vnd.ms-powerpoint", ext: ["ppt"], label: "PPT" },
  { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", ext: ["pptx"], label: "PPTX" },
  { mime: "application/vnd.ms-excel", ext: ["xls"], label: "XLS" },
  { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ext: ["xlsx"], label: "XLSX" },
  { mime: "text/csv", ext: ["csv"], label: "CSV" },
  { mime: "application/zip", ext: ["zip"], label: "ZIP" },
  { mime: "image/png", ext: ["png"], label: "PNG" },
  { mime: "image/jpeg", ext: ["jpg", "jpeg"], label: "JPG" },
  { mime: "image/gif", ext: ["gif"], label: "GIF" },
  { mime: "image/webp", ext: ["webp"], label: "WEBP" },
];

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB per file

export function fileKeyFor(file: { name: string; type: string }): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const match = ALLOWED_FILE_TYPES.find(
    (t) => t.ext.includes(ext) || t.mime === file.type,
  );
  return match ? match.label : null;
}

export function mimeTypeFor(file: { name: string; type: string }): string {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const match = ALLOWED_FILE_TYPES.find(
    (t) => t.ext.includes(ext) || t.mime === file.type,
  );
  return match?.mime ?? (file.type || "application/octet-stream");
}

export function isFileAllowed(file: { name: string; type: string }): boolean {
  return fileKeyFor(file) !== null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
