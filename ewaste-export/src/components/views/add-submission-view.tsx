"use client";

import { FormEvent, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, Loader2, Plus, Save, Trash2, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { FileUploader } from "@/components/file-uploader";
import { Brand } from "@/components/brand";
import type { Submission, SubmissionLink } from "@/lib/types";
import type { AuthState } from "@/hooks/use-auth";

interface Props {
  navigate: (to: string) => void;
  auth: AuthState;
}

const CATEGORIES = [
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

export function AddSubmissionView({ navigate, auth }: Props) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [submissionDate, setSubmissionDate] = useState<string>(today);
  const [status, setStatus] = useState<"completed" | "draft">("completed");
  const [description, setDescription] = useState("");
  // Default published=true because default status is "completed".
  // When status flips to "draft", published is auto-set to false.
  // When status flips back to "completed", published is auto-set to true.
  // Owner can override the Published toggle afterwards if needed.
  const [published, setPublished] = useState(true);
  const changeStatus = (s: "completed" | "draft") => {
    setStatus(s);
    setPublished(s === "completed");
  };
  const [links, setLinks] = useState<SubmissionLink[]>([
    { label: "", url: "" },
  ]);

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const addLinkRow = () => setLinks((l) => [...l, { label: "", url: "" }]);
  const removeLinkRow = (i: number) =>
    setLinks((l) => l.filter((_, idx) => idx !== i));
  const updateLink = (i: number, field: "label" | "url", value: string) =>
    setLinks((l) => l.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError("Title is required.");
    if (!category.trim()) return setError("Category is required.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(submissionDate)) return setError("Pick a valid date.");

    setSubmitting(true);
    try {
      const cleanLinks = links
        .filter((l) => l.label.trim() && l.url.trim())
        .map((l) => ({ label: l.label.trim(), url: l.url.trim() }));
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category: category.trim(),
          submission_date: submissionDate,
          status,
          description: description.trim() || null,
          external_links: cleanLinks,
          published,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Could not save submission.");
      } else {
        setSubmission(data.submission as Submission);
        setSuccess(true);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F7FAF5]">
      <div className="hidden lg:block">
        <Sidebar
          active="new"
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

        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#355844]">
            Add Submission
          </h1>
          <p className="mt-1 text-sm text-[#6B7869]">
            Save the metadata first. You can upload files in step 2 below once the record exists.
          </p>
        </header>

        {success && submission ? (
          <div className="ew-card mb-6 p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-[#355844]" />
              <div className="flex-1">
                <h2 className="text-base font-medium text-[#355844]">
                  Submission created — upload files now
                </h2>
                <p className="mt-1 text-sm text-[#6B7869]">
                  The metadata for <span className="font-medium">{submission.title}</span> was saved
                  to the database. Files you upload below are stored in Supabase Storage and
                  linked to this submission.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <FileUploader
                submissionId={submission.id}
                onAllComplete={() => {
                  // Refresh the submission from the server to reflect new files.
                  fetch(`/api/submissions/${submission.id}`, { cache: "no-store" })
                    .then((r) => r.json())
                    .then((d) => {
                      if (d?.submission) setSubmission(d.submission);
                    })
                    .catch(() => {});
                }}
              />
            </div>

            {submission.files && submission.files.length > 0 && (
              <div className="mt-5">
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-[#6B7869]">
                  Attached files ({submission.files.length})
                </h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {submission.files.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center gap-2 rounded-lg border border-[#E3EAE0] bg-white px-3 py-2 text-xs text-[#303832]"
                    >
                      <ExternalLink className="h-3.5 w-3.5 flex-none text-[#355844]" />
                      <span className="truncate">{f.file_name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button
                onClick={() => navigate(`/dashboard/submissions/${submission.id}`)}
                className="ew-btn-forest text-sm"
              >
                View details
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="ew-btn-ghost text-sm"
              >
                Back to dashboard
              </button>
            </div>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="ew-card space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[#355844]">
                Assignment / Submission Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="ew-input"
                placeholder="e.g. IEEE Paper Submission Folder"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#355844]">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="ew-input"
                required
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#355844]">
                Submission Date
              </label>
              <input
                type="date"
                value={submissionDate}
                onChange={(e) => setSubmissionDate(e.target.value)}
                className="ew-input"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#355844]">Status</label>
              <div className="inline-flex w-full rounded-lg border border-[#E3EAE0] bg-white p-0.5">
                {(["completed", "draft"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => changeStatus(s)}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs capitalize transition-colors ${
                      status === s ? "bg-[#C8DEC1] text-[#355844]" : "text-[#6B7869] hover:text-[#355844]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-[#6B7869]">
                Completed submissions are auto-published to the professor.
                You can override below.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#355844]">
                Published to professor
              </label>
              <div className="inline-flex w-full rounded-lg border border-[#E3EAE0] bg-white p-0.5">
                {([
                  { v: false, l: "No" },
                  { v: true, l: "Yes" },
                ] as const).map(({ v, l }) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setPublished(v)}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs transition-colors ${
                      published === v ? "bg-[#C8DEC1] text-[#355844]" : "text-[#6B7869] hover:text-[#355844]"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#355844]">
              Description <span className="text-[#6B7869]">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="ew-input resize-none"
              placeholder="One or two sentences describing the deliverable…"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-[#355844]">
                External resource links <span className="text-[#6B7869]">(optional)</span>
              </label>
              <button type="button" onClick={addLinkRow} className="ew-btn-ghost text-xs">
                <Plus className="h-3.5 w-3.5" /> Add link
              </button>
            </div>
            <ul className="space-y-2">
              {links.map((link, i) => (
                <li key={i} className="grid grid-cols-12 gap-2">
                  <input
                    value={link.label}
                    onChange={(e) => updateLink(i, "label", e.target.value)}
                    placeholder="Label"
                    className="ew-input col-span-12 sm:col-span-4"
                  />
                  <input
                    value={link.url}
                    onChange={(e) => updateLink(i, "url", e.target.value)}
                    placeholder="https://"
                    className="ew-input col-span-10 sm:col-span-7"
                  />
                  <button
                    type="button"
                    onClick={() => removeLinkRow(i)}
                    className="col-span-2 inline-flex items-center justify-center rounded-lg text-[#6B7869] hover:bg-[#E3EAE0] hover:text-[#B8613C] sm:col-span-1"
                    aria-label="Remove link"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-[#F6E4DC] bg-[#FBF1ED] px-3 py-2 text-xs text-[#B8613C]">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#E3EAE0] pt-4">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="ew-btn-ghost text-sm"
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="ew-btn-forest text-sm">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save submission
            </button>
          </div>
        </form>

        <div className="mt-6 flex items-center gap-2 rounded-lg bg-[#E4F0DF]/60 px-4 py-3 text-xs text-[#355844]">
          <Brand size="sm" />
          <span className="ml-auto">Files are uploaded after the metadata record exists.</span>
        </div>
      </main>
    </div>
  );
}
