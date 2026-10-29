"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  Download,
  Eye,
  FileText,
  Paperclip,
  Pencil,
  Trash2,
  ExternalLink,
  Globe,
  EyeOff,
} from "lucide-react";
import type { Submission } from "@/lib/types";
import { formatFileSize } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";

interface SubmissionCardProps {
  submission: Submission;
  canManage: boolean;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onPreviewFile: (submissionId: string, fileId: string) => void;
  onDownloadFile: (submissionId: string, fileId: string) => void;
  onPublish?: (id: string) => void;
  onUnpublish?: (id: string) => void;
}

export function SubmissionCard({
  submission,
  canManage,
  onOpen,
  onEdit,
  onDelete,
  onPreviewFile,
  onDownloadFile,
  onPublish,
  onUnpublish,
}: SubmissionCardProps) {
  const fileCount = submission.files?.length ?? 0;
  const dateLabel = useMemo(() => {
    try {
      return format(parseISO(`${submission.submission_date}T00:00:00Z`), "dd MMM yyyy");
    } catch {
      return submission.submission_date;
    }
  }, [submission.submission_date]);

  return (
    <article className="ew-card p-4 transition-shadow hover:shadow-[0_2px_4px_rgba(48,56,50,0.05),0_4px_16px_rgba(48,56,50,0.06)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <button
          type="button"
          onClick={() => onOpen(submission.id)}
          className="group flex-1 text-left"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-[#E4F0DF] text-[#355844]">
              <FileText className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-medium text-[#355844] group-hover:underline">
                {submission.title}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6B7869]">
                <span className="inline-flex items-center gap-1">
                  <span className="font-medium text-[#355844]">{submission.category}</span>
                </span>
                <span aria-hidden>·</span>
                <span>{dateLabel}</span>
                <span aria-hidden>·</span>
                <StatusBadge status={submission.status} published={submission.published} />
              </div>
            </div>
          </div>
        </button>

        <div className="flex flex-none items-center gap-2 lg:flex-col lg:items-end">
          <button
            type="button"
            onClick={() => onOpen(submission.id)}
            className="ew-btn-ghost text-xs"
          >
            <Eye className="h-3.5 w-3.5" /> View Details
          </button>
          <div className="flex items-center gap-2">
            {canManage && (
              <>
                {submission.published ? (
                  <button
                    type="button"
                    onClick={() => onUnpublish?.(submission.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#E4F0DF] px-2.5 py-1.5 text-xs font-medium text-[#355844] transition-colors hover:bg-[#D7E8CF]"
                    title="Hide from public portal — keep private"
                  >
                    <EyeOff className="h-3.5 w-3.5" /> Unpublish
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onPublish?.(submission.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#355844] px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#2B4737]"
                    title="Make visible on the public professor portal"
                  >
                    <Globe className="h-3.5 w-3.5" /> Publish
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onEdit(submission.id)}
                  className="ew-btn-ghost text-xs"
                  aria-label="Edit submission"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(submission.id)}
                  className="ew-btn-ghost text-xs text-[#B8613C] hover:bg-[#F6E4DC]"
                  aria-label="Delete submission"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {submission.description && (
        <p className="mt-3 line-clamp-2 text-sm text-[#303832]/80">
          {submission.description}
        </p>
      )}

      <div className="mt-3 border-t border-[#E3EAE0] pt-3">
        {/* Quick summary row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-[#6B7869]">
            <Paperclip className="h-3.5 w-3.5" />
            {fileCount === 0 ? (
              <span className="italic">No file uploaded</span>
            ) : (
              <span>
                {fileCount} file{fileCount > 1 ? "s" : ""} attached
              </span>
            )}
          </span>

          {submission.external_links?.length > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-[#6B7869]">
              <ExternalLink className="h-3.5 w-3.5" />
              {submission.external_links.length} link
              {submission.external_links.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Attached files (chips with preview / download) */}
        {fileCount > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {(submission.files ?? []).slice(0, 3).map((f) => {
              const ext = (f.file_name.split(".").pop() || "").toLowerCase();
              const isExcel = ext === "xlsx" || ext === "xls";
              const isPpt = ext === "pptx" || ext === "ppt";
              const isWord = ext === "docx" || ext === "doc";
              const isPdf = ext === "pdf";

              const badgeColor = isExcel
                ? "bg-[#107C41] text-white"
                : isPpt
                ? "bg-[#D24726] text-white"
                : isWord
                ? "bg-[#2B579A] text-white"
                : isPdf
                ? "bg-[#C0392B] text-white"
                : "bg-[#E4F0DF] text-[#355844]";

              const badgeText = ext ? ext.toUpperCase() : "FILE";

              return (
                <div
                  key={f.id}
                  className="group inline-flex items-center gap-1.5 rounded-md border border-[#E3EAE0] bg-[#FBFDF8] px-2 py-1 text-[11px] text-[#303832] transition-colors hover:border-[#C8DEC1] hover:bg-[#E4F0DF]/40"
                >
                  <span className={`inline-flex items-center justify-center rounded px-1 py-0.2 text-[9px] font-bold ${badgeColor}`}>
                    {badgeText}
                  </span>
                  <span
                    className="max-w-[150px] truncate cursor-pointer font-medium hover:text-[#355844]"
                    title={`Click to view ${f.file_name}`}
                    onClick={() => onPreviewFile(submission.id, f.id)}
                  >
                    {f.file_name}
                  </span>
                  <span className="text-[#6B7869]">· {formatFileSize(f.file_size)}</span>
                  <button
                    type="button"
                    onClick={() => onPreviewFile(submission.id, f.id)}
                    className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded text-[#355844] hover:bg-[#E4F0DF]"
                    title="Open in portal viewer"
                  >
                    <Eye className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDownloadFile(submission.id, f.id)}
                    className="inline-flex h-6 w-6 items-center justify-center rounded text-[#355844] hover:bg-[#E4F0DF]"
                    title="Download original file"
                  >
                    <Download className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
            {fileCount > 3 && (
              <span className="text-xs text-[#6B7869]">+{fileCount - 3} more</span>
            )}
          </div>
        )}

        {/* External resource links (clickable badges) */}
        {submission.external_links?.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {submission.external_links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-1.5 rounded-md border border-[#C8DEC1] bg-[#E4F0DF]/60 px-2.5 py-1 text-[11px] font-medium text-[#355844] transition-colors hover:bg-[#C8DEC1]/70"
                title={link.url}
              >
                <ExternalLink className="h-3 w-3 flex-none" />
                <span className="max-w-[200px] truncate">
                  {link.label || link.url}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
