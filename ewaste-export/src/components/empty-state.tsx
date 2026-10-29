"use client";

import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#C8DEC1] bg-[#FBFDF8] px-6 py-12 text-center">
      {icon && (
        <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#E4F0DF] text-[#355844]">
          {icon}
        </div>
      )}
      <h3 className="text-base font-medium text-[#355844]">{title}</h3>
      {description && (
        <p className="mt-1 max-w-md text-sm text-[#6B7869]">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
