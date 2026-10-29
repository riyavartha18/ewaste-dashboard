"use client";

import { useEffect, useState } from "react";
import { Download, X, FileText, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import type { SubmissionFile } from "@/lib/types";
import { formatFileSize } from "@/lib/types";
import { OfficeFilePreview } from "@/components/office-file-preview";

interface FilePreviewModalProps {
  open: boolean;
  file: SubmissionFile | null;
  onClose: () => void;
  onDownload: () => void;
}

type PreviewKind =
  | "pdf"
  | "image"
  | "office-doc"
  | "text"
  | "download-only";

function classifyFile(file: SubmissionFile): PreviewKind {
  const type = (file.file_type || "").toLowerCase();
  const ext = (file.file_name.split(".").pop() || "").toLowerCase();
  if (type === "application/pdf" || ext === "pdf") return "pdf";
  if (type.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
  if (
    type.includes("wordprocessingml.document") ||
    type.includes("presentationml.presentation") ||
    type.includes("spreadsheetml.sheet") ||
    type.includes("msword") ||
    type.includes("ms-powerpoint") ||
    type.includes("ms-excel") ||
    ["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(ext)
  ) return "office-doc";
  if (type === "text/csv" || type === "text/plain" || ext === "csv" || ext === "txt") return "text";
  return "download-only";
}

function getFileTypeMeta(fileName: string) {
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  if (ext === "xlsx" || ext === "xls") {
    return {
      label: "Excel Spreadsheet",
      badge: "XLSX",
      bgClass: "bg-[#107C41] text-white",
      openLabel: "Open in Excel",
    };
  }
  if (ext === "pptx" || ext === "ppt") {
    return {
      label: "PowerPoint Presentation",
      badge: "PPTX",
      bgClass: "bg-[#D24726] text-white",
      openLabel: "Open in PowerPoint",
    };
  }
  if (ext === "docx" || ext === "doc") {
    return {
      label: "Word Document",
      badge: "DOCX",
      bgClass: "bg-[#2B579A] text-white",
      openLabel: "Open in Word",
    };
  }
  if (ext === "pdf") {
    return {
      label: "PDF Document",
      badge: "PDF",
      bgClass: "bg-[#C0392B] text-white",
      openLabel: "Open PDF",
    };
  }
  return {
    label: "Document",
    badge: ext.toUpperCase() || "FILE",
    bgClass: "bg-[#355844] text-white",
    openLabel: "Open Original",
  };
}

export function FilePreviewModal({
  open,
  file,
  onClose,
  onDownload,
}: FilePreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !file) return;
    let active = true;
    setLoading(true);
    setError(null);
    setTextContent(null);

    const kind = classifyFile(file);

    if (kind === "office-doc") {
      setLoading(false);
      return () => { active = false; };
    }

    if (kind === "pdf" || kind === "image") {
      fetch(`/api/files/${file.id}`, { method: "GET", cache: "no-store" })
        .then((r) => {
          if (!active) return;
          if (r.status === 200) setLoading(false);
          else if (r.status === 403) { setError("This file is not publicly available."); setLoading(false); }
          else if (r.status === 404) { setError("File not found."); setLoading(false); }
          else if (r.status === 410) { setError("File is missing from storage."); setLoading(false); }
          else { setError("Preview unavailable."); setLoading(false); }
        })
        .catch((e) => {
          if (!active) return;
          setError(e.message ?? "Preview unavailable.");
          setLoading(false);
        });
      return () => { active = false; };
    }

    if (kind === "text") {
      fetch(`/api/files/${file.id}`, { cache: "no-store" })
        .then(async (r) => {
          if (!active) return;
          if (r.status === 403) throw new Error("This file is not publicly available.");
          if (r.status === 404) throw new Error("File not found.");
          if (r.status === 410) throw new Error("File is missing from storage.");
          if (!r.ok) throw new Error("Preview unavailable.");
          return await r.text();
        })
        .then((txt) => {
          if (!active) return;
          setTextContent(txt ?? "");
          setLoading(false);
        })
        .catch((e) => {
          if (!active) return;
          setError(e.message ?? "Preview unavailable.");
          setLoading(false);
        });
      return () => { active = false; };
    }

    setLoading(false);
    return () => { active = false; };
  }, [open, file]);

  if (!open || !file) return null;
  const kind = classifyFile(file);
  const meta = getFileTypeMeta(file.file_name);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1B221E]/70 p-2 sm:p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <header className="flex items-center justify-between gap-3 border-b border-[#E3EAE0] bg-white px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-md text-[10px] font-bold ${meta.bgClass}`}>
              {meta.badge}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#303832]" title={file.file_name}>
                {file.file_name}
              </p>
              <p className="text-xs text-[#6B7869]">
                {meta.label} · {formatFileSize(file.file_size)}
              </p>
            </div>
          </div>

          <div className="flex flex-none items-center gap-2">
            <button
              onClick={onDownload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#355844] bg-[#F7FAF5] px-3 py-1.5 text-xs font-medium text-[#355844] transition-colors hover:bg-[#E4F0DF]"
              title="Download untouched original file"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>{meta.openLabel}</span>
            </button>
            <button onClick={onDownload} className="ew-btn-primary text-xs">
              <Download className="h-3.5 w-3.5" /> Download
            </button>
            <button
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded text-[#6B7869] hover:bg-[#E3EAE0]"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="min-h-0 flex-1 overflow-auto bg-[#F7FAF5]">
          {loading && (
            <div className="flex h-[60vh] items-center justify-center text-[#6B7869]">
              <Loader2 className="h-6 w-6 animate-spin text-[#355844]" />
              <span className="ml-2 text-sm">Preparing original view…</span>
            </div>
          )}
          {error && (
            <div className="flex h-[40vh] flex-col items-center justify-center gap-3 text-center">
              <AlertCircle className="h-6 w-6 text-[#B8613C]" />
              <p className="text-sm font-medium text-[#B8613C]">{error}</p>
              <button onClick={onDownload} className="ew-btn-primary text-xs">
                <Download className="h-3.5 w-3.5" /> Download original file
              </button>
            </div>
          )}
          {!loading && !error && kind === "pdf" && (
            <iframe
              title={file.file_name}
              src={`/api/files/${file.id}`}
              className="h-[80vh] w-full border-0 bg-white"
              allowFullScreen
            />
          )}
          {!loading && !error && kind === "image" && (
            <div className="flex h-[80vh] items-center justify-center p-4 bg-[#F7FAF5]">
              <img
                src={`/api/files/${file.id}`}
                alt={file.file_name}
                className="max-h-full max-w-full rounded-md object-contain shadow-md"
              />
            </div>
          )}
          {!loading && !error && kind === "office-doc" && (
            <OfficeFilePreview
              fileId={file.id}
              fileName={file.file_name}
              onDownload={onDownload}
            />
          )}
          {!loading && !error && kind === "text" && textContent !== null && (
            <pre className="h-[80vh] overflow-auto whitespace-pre-wrap break-words bg-white p-4 text-xs text-[#303832] font-mono">
              {textContent}
            </pre>
          )}
          {!loading && !error && kind === "download-only" && (
            <div className="flex h-[40vh] flex-col items-center justify-center gap-3 text-center">
              <FileText className="h-8 w-8 text-[#6B7869]" />
              <p className="text-sm text-[#303832]">
                In-browser preview is not available for this archive/format.
              </p>
              <p className="text-xs text-[#6B7869]">
                Click below to download and open the original file.
              </p>
              <button onClick={onDownload} className="ew-btn-primary text-xs">
                <Download className="h-3.5 w-3.5" /> Download original file
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
