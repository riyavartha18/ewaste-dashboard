"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  ExternalLink,
  Pencil,
  Loader2,
  Paperclip,
  AlertCircle,
  Copy,
  Check,
  Trash2,
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { FilePreviewModal } from "@/components/file-preview-modal";
import type { Submission, SubmissionFile } from "@/lib/types";
import { formatFileSize } from "@/lib/types";
import type { AuthState } from "@/hooks/use-auth";

interface Props {
  id: string;
  navigate: (to: string) => void;
  auth: AuthState;
}

export function SubmissionDetailsView({ id, navigate, auth }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);

  const [previewFile, setPreviewFile] = useState<SubmissionFile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/submissions/${id}`, { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 404) throw new Error("Submission not found.");
        if (r.status === 401 || r.status === 403) throw new Error("Forbidden.");
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error ?? "Load failed.");
        setSubmission(data.submission);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onPreviewFile = useCallback((f: SubmissionFile) => {
    setPreviewFile(f);
    setPreviewOpen(true);
  }, []);

  const onDownloadFile = useCallback((f: SubmissionFile) => {
    // Stream directly from the file-serving route.
    const a = document.createElement("a");
    a.href = `/api/files/${f.id}?download=1`;
    a.download = ""; // server sets filename
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, []);

  const onDelete = useCallback(async () => {
    if (!submission) return;
    if (!window.confirm("Delete this submission? Its files will be removed from storage.")) {
      return;
    }
    const res = await fetch(`/api/submissions/${submission.id}`, { method: "DELETE" });
    if (res.ok) {
      navigate("/dashboard");
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data?.error ?? "Delete failed.");
    }
  }, [submission, navigate]);

  const dateLabel = useMemo(() => {
    if (!submission) return "";
    try {
      return format(parseISO(`${submission.submission_date}T00:00:00Z`), "dd MMMM yyyy");
    } catch {
      return submission.submission_date;
    }
  }, [submission]);

  return (
    <div className="flex min-h-screen bg-[#F7FAF5]">
      <div className="hidden lg:block">
        <Sidebar
          active="dashboard"
          onNavigate={navigate}
          ownerEmail={auth.session?.user?.email ?? null}
          onSignOut={async () => {
            await auth.signOut();
            window.location.replace("/#/public");
            window.location.reload();
          }}
          onCopyPublicLink={() => navigate("/public")}
        />
      </div>

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-4 inline-flex items-center gap-1 text-sm text-[#355844] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-[#6B7869]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : error ? (
          <EmptyState
            icon={<AlertCircle className="h-5 w-5" />}
            title="Could not load submission"
            description={error}
          />
        ) : submission ? (
          <div className="space-y-6">
            <header className="ew-card p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={submission.status} published={submission.published} />
                    <span className="text-xs text-[#6B7869]">{dateLabel}</span>
                  </div>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#355844]">
                    {submission.title}
                  </h1>
                  <p className="mt-1 text-sm text-[#6B7869]">
                    Category: <span className="font-medium text-[#355844]">{submission.category}</span>
                  </p>
                </div>
                <div className="flex flex-none items-center gap-2">
                  <button
                    onClick={() => navigate(`/dashboard/edit/${submission.id}`)}
                    className="ew-btn-primary text-sm"
                  >
                    <Pencil className="h-4 w-4" /> Edit
                  </button>
                  <button
                    onClick={onDelete}
                    className="ew-btn-ghost text-sm text-[#B8613C] hover:bg-[#F6E4DC]"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              </div>

              {submission.description && (
                <p className="mt-4 whitespace-pre-wrap rounded-lg border border-[#E3EAE0] bg-[#FBFDF8] p-4 text-sm text-[#303832]">
                  {submission.description}
                </p>
              )}

              {submission.external_links?.length > 0 && (
                <div className="mt-4">
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-[#6B7869]">
                    External resource links
                  </h3>
                  <ul className="space-y-1.5">
                    {submission.external_links.map((l, i) => (
                      <li key={i}>
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-[#355844] underline hover:no-underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> {l.label || l.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </header>

            <section className="ew-card p-6">
              <div className="mb-3 flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-[#355844]" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#355844]">
                  Attached files
                </h2>
                {submission.files && (
                  <span className="text-xs text-[#6B7869]">
                    {submission.files.length} file{submission.files.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {submission.files && submission.files.length === 0 ? (
                <EmptyState
                  icon={<FileText className="h-5 w-5" />}
                  title="File not uploaded"
                  description="No document has been attached to this submission yet. Click Edit to upload one."
                  action={
                    <button
                      onClick={() => navigate(`/dashboard/edit/${submission.id}`)}
                      className="ew-btn-forest text-sm"
                    >
                      <Pencil className="h-4 w-4" /> Edit &amp; upload
                    </button>
                  }
                />
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {submission.files?.map((f) => {
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

                    const badgeLabel = ext ? ext.toUpperCase() : "FILE";

                    return (
                      <li
                        key={f.id}
                        className="group flex items-center gap-3 rounded-lg border border-[#E3EAE0] bg-white p-3 transition-colors hover:border-[#C8DEC1] hover:bg-[#FBFDF8]"
                      >
                        <span className={`inline-flex h-9 w-9 flex-none items-center justify-center rounded-md text-[10px] font-bold shadow-xs ${badgeColor}`}>
                          {badgeLabel}
                        </span>
                        <div
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => onPreviewFile(f)}
                          title="Click to view file"
                        >
                          <p className="truncate text-sm font-medium text-[#303832] group-hover:text-[#355844]">
                            {f.file_name}
                          </p>
                          <p className="text-xs text-[#6B7869]">
                            {formatFileSize(f.file_size)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onPreviewFile(f)}
                            className="inline-flex h-8 items-center gap-1 rounded-md bg-[#E4F0DF] px-2 text-xs font-medium text-[#355844] transition-colors hover:bg-[#D7E8CF]"
                            aria-label="Open / Preview"
                            title="Open in portal viewer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Open</span>
                          </button>
                          <button
                            onClick={() => onDownloadFile(f)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded text-[#355844] hover:bg-[#E4F0DF]"
                            aria-label="Download"
                            title="Download original file"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        ) : null}

        <FilePreviewModal
          open={previewOpen}
          file={previewFile}
          onClose={() => setPreviewOpen(false)}
          onDownload={() => previewFile && onDownloadFile(previewFile)}
        />
      </main>
    </div>
  );
}
