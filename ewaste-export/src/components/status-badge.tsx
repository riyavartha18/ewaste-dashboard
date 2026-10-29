"use client";

import { CheckCircle2, FileEdit } from "lucide-react";
import type { SubmissionStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: SubmissionStatus;
  published?: boolean;
}

export function StatusBadge({ status, published }: StatusBadgeProps) {
  const completed = status === "completed";
  return (
    <span
      className={`ew-chip ${
        completed
          ? "bg-[#E4F0DF] text-[#355844]"
          : "bg-[#F2EDE0] text-[#7A6A3B]"
      }`}
    >
      {completed ? (
        <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
      ) : (
        <FileEdit className="h-3.5 w-3.5" strokeWidth={2} />
      )}
      {completed ? "Completed" : "Draft"}
      {published && (
        <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-[#355844] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          Published
        </span>
      )}
    </span>
  );
}
