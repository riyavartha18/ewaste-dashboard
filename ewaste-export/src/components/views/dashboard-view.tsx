"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Search,
  SlidersHorizontal,
  PlusCircle,
  FilesIcon,
  CheckCircle2,
  FolderTree,
  Loader2,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  Globe,
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { SubmissionCard } from "@/components/submission-card";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { FilePreviewModal } from "@/components/file-preview-modal";
import type { Submission, SubmissionFile } from "@/lib/types";
import type { AuthState } from "@/hooks/use-auth";

interface Props {
  navigate: (to: string) => void;
  auth: AuthState;
}

type Filter = "all" | "completed" | "drafts";
type SortBy = "date-desc" | "date-asc" | "title-asc";

const CATEGORY_OPTIONS = [
  "Assignment",
  "Case Study",
  "Class Activity",
  "Comparison",
  "Data Tracker",
  "Pitch Deck",
  "Report",
  "Research Paper",
  "Other",
];

export function DashboardView({ navigate, auth }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortBy>("date-desc");

  const [previewFile, setPreviewFile] = useState<SubmissionFile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [seededInfo, setSeededInfo] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/submissions", { cache: "no-store" });
      if (res.status === 503) {
        navigate("/public");
        return;
      }
      if (res.status === 401) {
        await auth.refresh();
        navigate("/public");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Failed to load submissions.");
      } else {
        setSubmissions(data.submissions ?? []);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [navigate, auth]);

  useEffect(() => {
    load();
  }, [load]);

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
    if (filter === "completed") list = list.filter((s) => s.status === "completed");
    if (filter === "drafts") list = list.filter((s) => s.status === "draft");
    if (categoryFilter !== "all") list = list.filter((s) => s.category === categoryFilter);

    list.sort((a, b) => {
      if (sortBy === "date-desc") return b.submission_date.localeCompare(a.submission_date);
      if (sortBy === "date-asc") return a.submission_date.localeCompare(b.submission_date);
      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    });
    return list;
  }, [submissions, query, filter, categoryFilter, sortBy]);

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

  const stats = useMemo(() => {
    const completed = submissions.filter((s) => s.status === "completed").length;
    const drafts = submissions.filter((s) => s.status === "draft").length;
    const categories = new Set(submissions.map((s) => s.category)).size;
    return { total: submissions.length, completed, drafts, categories };
  }, [submissions]);

  const recentUploads = useMemo(() => {
    return submissions
      .flatMap((s) => (s.files ?? []).map((f) => ({ s, f })))
      .sort((a, b) => b.f.created_at.localeCompare(a.f.created_at))
      .slice(0, 5);
  }, [submissions]);

  const handleCopyPublic = async () => {
    const url = `${window.location.origin}/#/public`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("idle");
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    setSeededInfo(null);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSeededInfo(data?.error ?? "Seeding failed.");
      } else {
        setSubmissions(data.submissions ?? []);
        setSeededInfo(
          `Seeded ${data.seeded} new record(s), ${data.skipped} already present. You can now attach files to each record.`,
        );
      }
    } catch (err) {
      setSeededInfo((err as Error).message);
    } finally {
      setSeeding(false);
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm("Delete this submission? This will also remove its uploaded files.")) {
        return;
      }
      const res = await fetch(`/api/submissions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSubmissions((s) => s.filter((x) => x.id !== id));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data?.error ?? "Delete failed.");
      }
    },
    [],
  );

  const handlePublish = useCallback(async (id: string) => {
    const res = await fetch(`/api/submissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: true }),
    });
    if (res.ok) {
      const data = await res.json();
      setSubmissions((s) => s.map((x) => (x.id === id ? data.submission : x)));
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data?.error ?? "Publish failed.");
    }
  }, []);

  const handleUnpublish = useCallback(async (id: string) => {
    const res = await fetch(`/api/submissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: false }),
    });
    if (res.ok) {
      const data = await res.json();
      setSubmissions((s) => s.map((x) => (x.id === id ? data.submission : x)));
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data?.error ?? "Unpublish failed.");
    }
  }, []);

  const handlePublishAllCompleted = useCallback(async () => {
    const toPublish = submissions.filter(
      (s) => s.status === "completed" && !s.published,
    );
    if (toPublish.length === 0) {
      setSeededInfo("All completed submissions are already published.");
      return;
    }
    if (
      !window.confirm(
        `Publish ${toPublish.length} completed submission${toPublish.length > 1 ? "s" : ""} to the public professor portal?`,
      )
    ) {
      return;
    }
    let ok = 0;
    let failed = 0;
    for (const s of toPublish) {
      const res = await fetch(`/api/submissions/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setSubmissions((list) => list.map((x) => (x.id === s.id ? data.submission : x)));
        ok += 1;
      } else {
        failed += 1;
      }
    }
    setSeededInfo(
      `Published ${ok} completed submission${ok > 1 ? "s" : ""}${failed > 0 ? `; ${failed} failed` : ""}.`,
    );
  }, [submissions]);

  const onPreviewFile = useCallback(
    async (submissionId: string, fileId: string) => {
      const sub = submissions.find((s) => s.id === submissionId);
      const file = sub?.files?.find((f) => f.id === fileId) ?? null;
      if (!file) return;
      setPreviewFile(file);
      setPreviewOpen(true);
    },
    [submissions],
  );

  const onDownloadFile = useCallback(
    (_submissionId: string, fileId: string) => {
      // Stream the file directly from the file-serving route.
      const a = document.createElement("a");
      a.href = `/api/files/${fileId}?download=1`;
      // The server sets Content-Disposition: attachment; filename="..."
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
    },
    [],
  );

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
          onCopyPublicLink={handleCopyPublic}
          stats={stats}
        />
      </div>

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
        {/* Mobile header */}
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <h1 className="text-lg font-semibold text-[#355844]">E-Waste Submissions</h1>
          <button onClick={handleCopyPublic} className="ew-btn-ghost text-xs">
            {copyState === "copied" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            Public link
          </button>
        </div>

        {/* Page heading */}
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#355844]">
              Owner Dashboard
            </h1>
            <p className="mt-1 text-sm text-[#6B7869]">
              Manage your E-Waste coursework, attach files and publish submissions to your professor.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={handleCopyPublic} className="ew-btn-ghost text-sm">
              {copyState === "copied" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copyState === "copied" ? "Link copied" : "Copy Public Link"}
            </button>
            {submissions.filter((s) => s.status === "completed" && !s.published).length > 0 && (
              <button
                onClick={handlePublishAllCompleted}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#355844] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2B4737]"
                title="One-click publish all completed submissions to the public professor portal"
              >
                <Globe className="h-4 w-4" /> Publish all completed
                <span className="ml-0.5 rounded-full bg-white/20 px-1.5 text-xs">
                  {submissions.filter((s) => s.status === "completed" && !s.published).length}
                </span>
              </button>
            )}
            <button
              onClick={() => navigate("/dashboard/new")}
              className="ew-btn-primary text-sm"
            >
              <PlusCircle className="h-4 w-4" /> Add Submission
            </button>
          </div>
        </header>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<FilesIcon className="h-4 w-4" />} label="Total" value={stats.total} />
          <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Completed" value={stats.completed} accent />
          <StatCard icon={<FolderTree className="h-4 w-4" />} label="Categories" value={stats.categories} />
          <StatCard icon={<Sparkles className="h-4 w-4" />} label="Recent uploads" value={recentUploads.length} />
        </section>

        {/* Recent uploads */}
        {recentUploads.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-[#6B7869]">
              Recently uploaded documents
            </h2>
            <ul className="flex flex-wrap gap-2">
              {recentUploads.map(({ s, f }) => (
                <li
                  key={f.id}
                  className="inline-flex max-w-full items-center gap-2 rounded-lg border border-[#E3EAE0] bg-white px-3 py-1.5"
                >
                  <span className="truncate text-xs text-[#303832]">{f.file_name}</span>
                  <span className="text-[11px] text-[#6B7869]">· {s.title}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Filters */}
        <section className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7869]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="ew-input pl-9"
              placeholder="Search by assignment title, category or description…"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-[#E3EAE0] bg-white p-0.5">
              {(["all", "completed", "drafts"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-md px-3 py-1.5 text-xs capitalize transition-colors ${
                    filter === f ? "bg-[#C8DEC1] text-[#355844]" : "text-[#6B7869] hover:text-[#355844]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="relative">
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7869]" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="ew-input appearance-none pl-9 pr-8 text-xs"
              >
                <option value="all">All categories</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
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

        {/* List */}
        <section className="mt-5 pb-16">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-[#6B7869]">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading submissions…
            </div>
          ) : error ? (
            <EmptyState
              icon={<AlertCircle className="h-5 w-5" />}
              title="Could not load submissions"
              description={error}
              action={
                <button onClick={load} className="ew-btn-forest text-sm">Try again</button>
              }
            />
          ) : submissions.length === 0 ? (
            <EmptyState
              icon={<FilesIcon className="h-5 w-5" />}
              title="No submissions yet"
              description="Seed the initial E-Waste coursework records, or add a new submission manually."
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={handleSeed}
                    disabled={seeding}
                    className="ew-btn-forest text-sm"
                  >
                    {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Seed initial 14 submissions
                  </button>
                  <button
                    onClick={() => navigate("/dashboard/new")}
                    className="ew-btn-primary text-sm"
                  >
                    <PlusCircle className="h-4 w-4" /> Add Submission
                  </button>
                </div>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Search className="h-5 w-5" />}
              title="No matches"
              description="Try clearing the search box or filters."
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
                    <span className="text-xs text-[#6B7869]">{items.length} item{items.length > 1 ? "s" : ""}</span>
                  </div>
                  <div className="grid gap-3">
                    {items.map((s) => (
                      <SubmissionCard
                        key={s.id}
                        submission={s}
                        canManage
                        onOpen={(id) => navigate(`/dashboard/submissions/${id}`)}
                        onEdit={(id) => navigate(`/dashboard/edit/${id}`)}
                        onDelete={handleDelete}
                        onPreviewFile={onPreviewFile}
                        onDownloadFile={onDownloadFile}
                        onPublish={handlePublish}
                        onUnpublish={handleUnpublish}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {seededInfo && (
            <div className="mt-4 rounded-lg border border-[#C8DEC1] bg-[#E4F0DF]/60 px-4 py-3 text-sm text-[#355844]">
              {seededInfo}
            </div>
          )}
        </section>

        <FilePreviewModal
          open={previewOpen}
          file={previewFile}
          onClose={() => setPreviewOpen(false)}
          onDownload={() => previewFile && onDownloadFile(previewFile.submission_id, previewFile.id)}
        />
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className={`ew-card p-4 ${accent ? "bg-[#E4F0DF]" : ""}`}>
      <div className="flex items-center gap-2 text-[#6B7869]">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#E4F0DF] text-[#355844]">
          {icon}
        </span>
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold text-[#355844]">{value}</div>
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
