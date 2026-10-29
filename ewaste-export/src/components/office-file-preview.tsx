"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Download, ExternalLink, FileText, Loader2 } from "lucide-react";
import { SpreadsheetViewer } from "@/components/spreadsheet-viewer";
import { PresentationViewer } from "@/components/presentation-viewer";

interface OfficeFilePreviewProps {
  fileId: string;
  fileName: string;
  onDownload?: () => void;
}

type PreviewKind = "word" | "spreadsheet" | "presentation" | "unsupported";

function getPreviewKind(fileName: string): PreviewKind {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "docx" || extension === "doc") return "word";
  if (extension === "xlsx" || extension === "xls") return "spreadsheet";
  if (extension === "pptx" || extension === "ppt") return "presentation";
  return "unsupported";
}

function getErrorMessage(status: number): string {
  if (status === 403) return "This file is not publicly available.";
  if (status === 404) return "File not found.";
  if (status === 410) return "File is missing from storage.";
  return "Could not load this file for preview.";
}

export function OfficeFilePreview({ fileId, fileName, onDownload }: OfficeFilePreviewProps) {
  const kind = getPreviewKind(fileName);
  const wordContentRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [wordRendering, setWordRendering] = useState(false);
  const [wordError, setWordError] = useState<string | null>(null);

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    const a = document.createElement("a");
    a.href = `/api/files/${fileId}?download=1`;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // 1. Fetch file buffer
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setFileBuffer(null);
    setWordError(null);

    async function loadPreview() {
      try {
        if (kind === "unsupported") {
          setError("This file format cannot be rendered inline. Please use the button below to open the original file.");
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/files/${fileId}`, { cache: "no-store" });
        if (!response.ok) throw new Error(getErrorMessage(response.status));
        const buffer = await response.arrayBuffer();
        if (!active) return;

        setFileBuffer(buffer);
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Could not load this file for preview.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPreview();
    return () => {
      active = false;
    };
  }, [fileId, kind]);

  // 2. Render Word documents once the DOM container is mounted
  useEffect(() => {
    if (kind !== "word" || !fileBuffer || !wordContentRef.current) return;
    let active = true;
    setWordRendering(true);
    setWordError(null);

    async function renderDocx() {
      try {
        const { renderAsync } = await import("docx-preview");
        if (!active || !wordContentRef.current) return;
        wordContentRef.current.replaceChildren();
        await renderAsync(fileBuffer, wordContentRef.current, wordContentRef.current, {
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
        });
      } catch (caught: any) {
        console.error("Word render failed:", caught);
        if (active) {
          setWordError(
            fileName.toLowerCase().endsWith(".doc")
              ? "This document is in binary .DOC format, which requires Microsoft Word to open. Click below to download."
              : "Could not format Word document for browser view. Click below to open original in Word."
          );
        }
      } finally {
        if (active) setWordRendering(false);
      }
    }

    void renderDocx();
    return () => {
      active = false;
    };
  }, [fileBuffer, kind, fileName]);

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-[#6B7869]">
        <Loader2 className="h-6 w-6 animate-spin text-[#355844]" />
        <p className="text-sm">Preparing file in original format…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertCircle className="h-6 w-6 text-[#B8613C]" />
        <p className="text-sm font-medium text-[#B8613C]">{error}</p>
        <button onClick={handleDownload} className="ew-btn-primary text-xs">
          <Download className="h-3.5 w-3.5" /> Open / Download Original File
        </button>
      </div>
    );
  }

  if (kind === "spreadsheet" && fileBuffer) {
    return (
      <SpreadsheetViewer
        buffer={fileBuffer}
        fileName={fileName}
        onDownload={handleDownload}
      />
    );
  }

  if (kind === "presentation" && fileBuffer) {
    return (
      <PresentationViewer
        buffer={fileBuffer}
        fileName={fileName}
        onDownload={handleDownload}
      />
    );
  }

  if (kind === "word") {
    return (
      <div className="flex flex-col">
        {/* Word Document Toolbar */}
        <div className="flex items-center justify-between border-b border-[#E3EAE0] bg-white px-4 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-[#2B579A] text-[10px] font-bold text-white">
              DOC
            </span>
            <span className="font-medium text-[#303832]">{fileName}</span>
          </div>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2B579A] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#204070]"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open Original in Word
          </button>
        </div>

        <div className="relative min-h-[60vh] overflow-auto bg-[#F7FAF5] p-4 sm:p-8">
          {wordRendering && (
            <div className="flex h-48 items-center justify-center gap-2 text-sm text-[#6B7869]">
              <Loader2 className="h-5 w-5 animate-spin text-[#2B579A]" />
              <span>Formatting Word document layout…</span>
            </div>
          )}
          {wordError && (
            <div className="my-8 flex flex-col items-center justify-center gap-3 text-center">
              <AlertCircle className="h-6 w-6 text-[#B8613C]" />
              <p className="text-sm text-[#B8613C]">{wordError}</p>
              <button onClick={handleDownload} className="ew-btn-primary text-xs">
                <Download className="h-3.5 w-3.5" /> Open in Word
              </button>
            </div>
          )}
          <div
            ref={wordContentRef}
            className={`mx-auto max-w-4xl rounded-lg bg-white p-6 shadow-sm sm:p-12 [&_.docx-wrapper]:!bg-white ${
              wordRendering || wordError ? "hidden" : "block"
            }`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <FileText className="h-8 w-8 text-[#6B7869]" />
      <p className="text-sm text-[#303832]">
        Click below to open the submitted original document.
      </p>
      <button onClick={handleDownload} className="ew-btn-primary text-xs">
        <Download className="h-3.5 w-3.5" /> Open / Download Original File
      </button>
    </div>
  );
}
