"use client";

import { useRef, useState, useCallback } from "react";
import { UploadCloud, X, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { ALLOWED_FILE_TYPES, formatFileSize, isFileAllowed, MAX_FILE_SIZE_BYTES } from "@/lib/types";

export interface UploadingFile {
  id: string;
  file: File;
  progress: number;        // 0-100
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
  resultId?: string;       // server-returned file metadata id
}

interface FileUploaderProps {
  submissionId: string;
  onAllComplete?: () => void;
}

export function FileUploader({ submissionId, onAllComplete }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState<UploadingFile[]>([]);
  const [topError, setTopError] = useState<string | null>(null);

  const accept = ALLOWED_FILE_TYPES.flatMap((t) => t.ext.map((e) => `.${e}`)).join(",");

  const uploadOne = useCallback(async (entry: UploadingFile) => {
    setQueue((q) => q.map((f) => f.id === entry.id ? { ...f, status: "uploading", progress: 5 } : f));

    const formData = new FormData();
    formData.append("file", entry.file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/submissions/${submissionId}/files`, true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.max(5, Math.round((e.loaded / e.total) * 95));
        setQueue((q) => q.map((f) => f.id === entry.id ? { ...f, progress: pct } : f));
      }
    };

    return new Promise<void>((resolve) => {
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const json = JSON.parse(xhr.responseText);
            setQueue((q) => q.map((f) => f.id === entry.id ? { ...f, status: "done", progress: 100, resultId: json?.file?.id } : f));
          } catch {
            setQueue((q) => q.map((f) => f.id === entry.id ? { ...f, status: "done", progress: 100 } : f));
          }
        } else {
          let msg = "Upload failed.";
          try {
            const json = JSON.parse(xhr.responseText);
            msg = json?.error || msg;
          } catch { /* ignore */ }
          setQueue((q) => q.map((f) => f.id === entry.id ? { ...f, status: "error", error: msg, progress: 0 } : f));
        }
        resolve();
      };
      xhr.onerror = () => {
        setQueue((q) => q.map((f) => f.id === entry.id ? { ...f, status: "error", error: "Network error", progress: 0 } : f));
        resolve();
      };
      xhr.send(formData);
    });
  }, [submissionId]);

  const addFiles = useCallback(async (fileList: FileList | File[]) => {
    setTopError(null);
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;

    const validated: UploadingFile[] = [];
    const rejected: string[] = [];

    for (const file of incoming) {
      if (!isFileAllowed(file)) {
        rejected.push(`${file.name} (unsupported type)`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        rejected.push(`${file.name} (exceeds 50 MB)`);
        continue;
      }
      validated.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        progress: 0,
        status: "queued",
      });
    }

    if (rejected.length > 0) {
      setTopError(`Skipped: ${rejected.join(", ")}`);
    }

    if (validated.length === 0) return;

    setQueue((q) => [...q, ...validated]);

    for (const entry of validated) {
      await uploadOne(entry);
    }

    if (onAllComplete) onAllComplete();
  }, [uploadOne, onAllComplete]);

  const onDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const removeFile = useCallback((id: string) => {
    setQueue((q) => q.filter((f) => f.id !== id));
  }, []);

  return (
    <div className="space-y-3">
      <label
        className={`ew-dropzone ${isDragging ? "ring-2 ring-[#355844] bg-[#E4F0DF]" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <UploadCloud className="mx-auto h-8 w-8 text-[#355844]" strokeWidth={1.6} />
        <p className="mt-2 text-sm font-medium text-[#355844]">
          Drag &amp; drop files here, or <span className="underline">browse</span>
        </p>
        <p className="mt-1 text-xs text-[#6B7869]">
          PDF · DOC/DOCX · PPT/PPTX · XLS/XLSX · CSV · ZIP · PNG · JPG · GIF · WEBP — up to 50 MB each
        </p>
      </label>

      {topError && (
        <div className="flex items-start gap-2 rounded-lg border border-[#F6E4DC] bg-[#FBF1ED] px-3 py-2 text-xs text-[#B8613C]">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
          <span>{topError}</span>
        </div>
      )}

      {queue.length > 0 && (
        <ul className="space-y-2">
          {queue.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center gap-3 rounded-lg border border-[#E3EAE0] bg-white px-3 py-2"
            >
              <span className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-md bg-[#E4F0DF] text-[#355844]">
                {entry.status === "done"
                  ? <CheckCircle2 className="h-4 w-4" />
                  : entry.status === "error"
                    ? <AlertCircle className="h-4 w-4 text-[#B8613C]" />
                    : <FileText className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm text-[#303832]">{entry.file.name}</span>
                  <span className="text-xs text-[#6B7869]">{formatFileSize(entry.file.size)}</span>
                </div>
                {entry.status === "uploading" && (
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#E3EAE0]">
                    <div
                      className="h-full rounded-full bg-[#355844] transition-[width] duration-200"
                      style={{ width: `${entry.progress}%` }}
                    />
                  </div>
                )}
                {entry.status === "done" && (
                  <p className="mt-0.5 text-xs text-[#355844]">Uploaded</p>
                )}
                {entry.status === "error" && (
                  <p className="mt-0.5 text-xs text-[#B8613C]">{entry.error ?? "Upload failed"}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeFile(entry.id)}
                className="inline-flex h-7 w-7 flex-none items-center justify-center rounded text-[#6B7869] hover:bg-[#E3EAE0] hover:text-[#355844]"
                aria-label="Remove from queue"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
