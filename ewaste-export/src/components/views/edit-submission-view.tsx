"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Save,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { FileUploader } from "@/components/file-uploader";
import type { Submission, SubmissionLink } from "@/lib/types";
import type { AuthState } from "@/hooks/use-auth";

interface Props {
  id: string;
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

export function EditSubmissionView({ id, navigate, auth }: Props) {
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [submissionDate, setSubmissionDate] = useState("");
  const [status, setStatus] = useState<"completed" | "draft">("completed");
  const [description, setDescription] = useState("");
  const [published, setPublished] = useState(false);
  // When the status changes to "completed", auto-publish to the professor.
  // When it changes to "draft", auto-unpublish. The owner can still override
  // the Published toggle independently afterwards.
  const changeStatus = (s: "completed" | "draft") => {
    setStatus(s);
    setPublished(s === "completed");
  };
  const [links, setLinks] = useState<SubmissionLink[]>([]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    fetch(`/api/submissions/${id}`, { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 404) throw new Error("Submission not found.");
        if (r.status === 401 || r.status === 403) throw new Error("Forbidden.");
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error ?? "Load failed.");
        const s: Submission = data.submission;
        setSubmission(s);
        setTitle(s.title);
        setCategory(s.category);
        setSubmissionDate(s.submission_date);
        setStatus(s.status);
        setDescription(s.description ?? "");
        setPublished(s.published);
        setLinks(s.external_links?.length ? s.external_links : [{ label: "", url: "" }]);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveOk(false);
    if (!title.trim()) return setSaveError("Title is required.");
    if (!category.trim()) return setSaveError("Category is required.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(submissionDate)) return setSaveError("Pick a valid date.");

    setSaving(true);
    try {
      const cleanLinks = links
        .filter((l) => l.label.trim() && l.url.trim())
        .map((l) => ({ label: l.label.trim(), url: l.url.trim() }));
      const res = await fetch(`/api/submissions/${id}`, {
        method: "PATCH",
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
      if (!res.ok) throw new Error(data?.error ?? "Could not save.");
      setSubmission(data.submission);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2500);
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const removeFile = async (fileId: string) => {
    if (!window.confirm("Remove this file?")) return;
    const res = await fetch(`/api/submissions/${id}/files/${fileId}`, { method: "DELETE" });
    if (res.ok) {
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data?.error ?? "Could not delete file.");
    }
  };

  const addLinkRow = () => setLinks((l) => [...l, { label: "", url: "" }]);
  const removeLinkRow = (i: number) => setLinks((l) => l.filter((_, idx) => idx !== i));
  const updateLink = (i: number, field: "label" | "url", value: string) =>
    setLinks((l) => l.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));

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
          onClick={() => navigate(`/dashboard/submissions/${id}`)}
          className="mb-4 inline-flex items-center gap-1 text-sm text-[#355844] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to details
        </button>

        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#355844]">
            Edit Submission
          </h1>
          <p className="mt-1 text-sm text-[#6B7869]">
            Update metadata, attach or remove files, and toggle publication.
          </p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-[#6B7869]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-[#F6E4DC] bg-[#FBF1ED] px-4 py-3 text-sm text-[#B8613C]">
            {error}
          </div>
        ) : submission ? (
          <div className="space-y-6">
            <form onSubmit={onSubmit} className="ew-card space-y-5 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-[#355844]">Title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="ew-input"
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
                    {[
                      { v: false, l: "No" },
                      { v: true, l: "Yes" },
                    ].map(({ v, l }) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setPublished(v as boolean)}
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
                <label className="mb-1 block text-xs font-medium text-[#355844]">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="ew-input resize-none"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-medium text-[#355844]">External resource links</label>
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

              {saveError && (
                <div className="flex items-start gap-2 rounded-lg border border-[#F6E4DC] bg-[#FBF1ED] px-3 py-2 text-xs text-[#B8613C]">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
                  <span>{saveError}</span>
                </div>
              )}
              {saveOk && (
                <div className="flex items-start gap-2 rounded-lg border border-[#C8DEC1] bg-[#E4F0DF]/60 px-3 py-2 text-xs text-[#355844]">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-none" />
                  <span>Saved.</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#E3EAE0] pt-4">
                <button
                  type="button"
                  onClick={() => navigate(`/dashboard/submissions/${id}`)}
                  className="ew-btn-ghost text-sm"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="ew-btn-forest text-sm">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save changes
                </button>
              </div>
            </form>

            <section className="ew-card p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#355844]">
                Upload files
              </h2>
              <p className="mt-1 text-xs text-[#6B7869]">
                Drag-and-drop or browse. Files are stored in Supabase Storage linked to this submission.
              </p>
              <div className="mt-4">
                <FileUploader
                  submissionId={id}
                  onAllComplete={load}
                />
              </div>

              {submission.files && submission.files.length > 0 && (
                <ul className="mt-5 space-y-2">
                  {submission.files.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center gap-2 rounded-lg border border-[#E3EAE0] bg-white px-3 py-2 text-sm"
                    >
                      <span className="truncate text-[#303832]">{f.file_name}</span>
                      <span className="text-xs text-[#6B7869]">· {f.file_type}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(f.id)}
                        className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded text-[#6B7869] hover:bg-[#E3EAE0] hover:text-[#B8613C]"
                        aria-label="Remove file"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
