"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  ExternalLink,
  Loader2,
  Search,
  AlertCircle,
  Paperclip,
  CheckCircle2,
  KeyRound,
  Recycle,
  Link as LinkIcon,
} from "lucide-react";
import { Brand, OwnerBrand } from "@/components/brand";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { FilePreviewModal } from "@/components/file-preview-modal";
import { SubmissionCard } from "@/components/submission-card";
import type { Submission, SubmissionFile } from "@/lib/types";
import { formatFileSize } from "@/lib/types";

interface Props {
  initialId?: string;
  onNavigate: (to: string) => void;
}

type SortBy = "date-desc" | "date-asc" | "title-asc";

export function PublicPortalView({ initialId, onNavigate }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [detailId, setDetailId] = useState<string | null>(initialId ?? null);
  const [detail, setDetail] = useState<Submission | null>(null);

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortBy>("date-desc");

  const [previewFile, setPreviewFile] = useState<SubmissionFile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const loadList = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/public/submissions", { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error ?? "Failed to load submissions.");
        setSubmissions(data.submissions ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (!detailId) {
      setDetail(null);
      return;
    }
    fetch(`/api/submissions/${detailId}`, { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 404) {
          setDetail(null);
          return;
        }
        const data = await r.json();
        if (!r.ok) {
          setDetail(null);
          return;
        }
        setDetail(data.submission);
      })
      .catch(() => setDetail(null));
  }, [detailId]);

  const categories = useMemo(
    () => Array.from(new Set(submissions.map((s) => s.category))).sort(),
    [submissions],
  );

  const filtered = useMemo(() => {
    let list = submissions.slice();
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          (s.description ?? "").toLowerCase().includes(q),
      );
    }
    if (categoryFilter !== "all") list = list.filter((s) => s.category === categoryFilter);
    list.sort((a, b) => {
      if (sortBy === "date-desc") return b.submission_date.localeCompare(a.submission_date);
      if (sortBy === "date-asc") return a.submission_date.localeCompare(b.submission_date);
      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    });
    return list;
  }, [submissions, query, categoryFilter, sortBy]);

  const grouped = useMemo(() => {
    const map = new Map<string, Submission[]>();
    for (const s of filtered) {
      const arr = map.get(s.submission_date) ?? [];
      arr.push(s);
      map.set(s.submission_date, arr);
    }
    return Array.from(map.entries()).sort((a, b) =>
      sortBy === "date-asc" ? a[0].localeCompare(b[0]) : b[0].localeCompare(a[0]),
    );
  }, [filtered, sortBy]);

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

  // ---------- Detail view ------------------------------------------------
  if (detailId && detail) {
    return (
      <PublicDetail
        submission={detail}
        onBack={() => {
          setDetailId(null);
          onNavigate("/public");
        }}
        onPreviewFile={onPreviewFile}
        onDownloadFile={onDownloadFile}
        previewOpen={previewOpen}
        previewFile={previewFile}
        setPreviewOpen={setPreviewOpen}
        onNavigate={onNavigate}
      />
    );
  }

  // ---------- List view --------------------------------------------------
  return (
    <div className="min-h-screen bg-[#F7FAF5]">
      <header className="border-b border-[#E3EAE0] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex flex-col gap-1">
            <Brand size="md" />
            <div className="mt-1 hidden sm:block">
              <OwnerBrand />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex ew-chip bg-[#E4F0DF] text-[#355844]">
              Public · read-only
            </span>
            <button
              type="button"
              onClick={() => onNavigate("/login")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3EAE0] bg-white px-3 py-1.5 text-xs font-medium text-[#355844] transition-colors hover:bg-[#E4F0DF]"
              title="Owner sign in"
            >
              <KeyRound className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span className="hidden sm:inline">Owner Sign In</span>
              <span className="sm:hidden">Owner</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero / branding banner */}
      <section className="border-b border-[#E3EAE0] bg-gradient-to-br from-[#E4F0DF] via-[#F7FAF5] to-[#F7FAF5]">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <span className="ew-chip bg-white/70 text-[#355844] ring-1 ring-[#C8DEC1]">
                <Recycle className="h-3.5 w-3.5" /> E-Waste Coursework
              </span>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#355844] sm:text-4xl">
                Published Submissions
              </h1>
              <p className="mt-2 text-sm text-[#355844]/80 sm:text-base">
                A curated collection of coursework, assignments and project
                submissions shared for academic review. Browse, preview and
                download the published documents below.
              </p>
              <div className="mt-4">
                <OwnerBrand />
              </div>
            </div>
            <div className="flex flex-none flex-col gap-2 rounded-xl border border-[#C8DEC1] bg-white/70 px-5 py-4 text-center">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#6B7869]">
                Submitted by
              </span>
              <span className="text-lg font-semibold tracking-tight text-[#355844]">
                Riya Vartha
              </span>
              <span className="text-xs text-[#6B7869]">TE · Computer Engineering · Div B</span>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Mobile-only branding strip (since the hero already shows it on desktop) */}
        <div className="mb-4 sm:hidden">
          <OwnerBrand />
        </div>

        {/* Filters */}
        <section className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7869]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="ew-input pl-9"
              placeholder="Search published submissions…"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="ew-input appearance-none pr-8 text-xs"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="ew-input appearance-none pr-8 text-xs"
            >
              <option value="date-desc">Newest first</option>
              <option value="date-asc">Oldest first</option>
              <option value="title-asc">Title A → Z</option>
            </select>
          </div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-[#6B7869]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading submissions…
          </div>
        ) : error ? (
          <EmptyState
            icon={<AlertCircle className="h-5 w-5" />}
            title="Could not load submissions"
            description={error}
          />
        ) : submissions.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="h-5 w-5" />}
            title="Nothing has been published yet"
            description="When the owner publishes a submission, it will appear here for the professor to review."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Search className="h-5 w-5" />}
            title="No matches"
            description="Try clearing the search box or category filter."
          />
        ) : (
          <div className="space-y-8">
            {grouped.map(([date, items]) => (
              <div key={date}>
                <div className="mb-2 flex items-center gap-3">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-[#6B7869]">
                    {formatDateHeading(date)}
                  </h3>
                  <div className="h-px flex-1 bg-[#E3EAE0]" />
                  <span className="text-xs text-[#6B7869]">{items.length}</span>
                </div>
                <div className="grid gap-3">
                  {items.map((s) => (
                    <SubmissionCard
                      key={s.id}
                      submission={s}
                      canManage={false}
                      onOpen={(id) => {
                        setDetailId(id);
                        onNavigate(`/public/submissions/${id}`);
                      }}
                      onEdit={() => {}}
                      onDelete={() => {}}
                      onPreviewFile={(_, fid) => {
                        const f = s.files?.find((x) => x.id === fid) ?? null;
                        if (f) onPreviewFile(f);
                      }}
                      onDownloadFile={(_, fid) => {
                        const f = s.files?.find((x) => x.id === fid) ?? null;
                        if (f) onDownloadFile(f);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <FilePreviewModal
          open={previewOpen}
          file={previewFile}
          onClose={() => setPreviewOpen(false)}
          onDownload={() => previewFile && onDownloadFile(previewFile)}
        />
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-[#6B7869]">
        E-Waste Submission Portal · Public read-only portal
      </footer>
    </div>
  );
}

function PublicDetail({
  submission,
  onBack,
  onPreviewFile,
  onDownloadFile,
  previewOpen,
  previewFile,
  setPreviewOpen,
  onNavigate,
}: {
  submission: Submission;
  onBack: () => void;
  onPreviewFile: (f: SubmissionFile) => void;
  onDownloadFile: (f: SubmissionFile) => void;
  previewOpen: boolean;
  previewFile: SubmissionFile | null;
  setPreviewOpen: (v: boolean) => void;
  onNavigate?: (path: string) => void;
}) {
  const dateLabel = useMemo(() => {
    try {
      return format(parseISO(`${submission.submission_date}T00:00:00Z`), "dd MMMM yyyy");
    } catch {
      return submission.submission_date;
    }
  }, [submission.submission_date]);

  return (
    <div className="min-h-screen bg-[#F7FAF5]">
      <header className="border-b border-[#E3EAE0] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex flex-col gap-1">
            <Brand size="md" />
            <div className="mt-1 hidden sm:block">
              <OwnerBrand />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex ew-chip bg-[#E4F0DF] text-[#355844]">
              Public · read-only
            </span>
            <button
              type="button"
              onClick={() => onNavigate ? onNavigate("/login") : (window.location.href = "/login")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3EAE0] bg-white px-3 py-1.5 text-xs font-medium text-[#355844] transition-colors hover:bg-[#E4F0DF]"
              title="Owner sign in"
            >
              <KeyRound className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span className="hidden sm:inline">Owner Sign In</span>
              <span className="sm:hidden">Owner</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <button
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1 text-sm text-[#355844] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to submissions
        </button>

        <div className="ew-card p-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={submission.status} published />
            <span className="text-xs text-[#6B7869]">{dateLabel}</span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#355844]">
            {submission.title}
          </h1>
          <p className="mt-1 text-sm text-[#6B7869]">
            Category: <span className="font-medium text-[#355844]">{submission.category}</span>
          </p>

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
        </div>

        <section className="ew-card mt-6 p-6">
          <div className="mb-3 flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-[#355844]" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#355844]">
              Files
            </h2>
          </div>
          {!submission.files || submission.files.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-5 w-5" />}
              title="No files attached"
              description="The owner has not uploaded a document for this submission yet."
            />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {submission.files.map((f) => {
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

function formatDateHeading(iso: string): string {
  try {
    return format(parseISO(`${iso}T00:00:00Z`), "dd MMMM yyyy");
  } catch {
    return iso;
  }
}
