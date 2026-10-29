"use client";

import { Recycle } from "lucide-react";

interface BrandProps {
  size?: "sm" | "md" | "lg";
  showSubtitle?: boolean;
}

const sizeMap = {
  sm: { icon: "h-6 w-6", title: "text-base", sub: "text-[11px]" },
  md: { icon: "h-8 w-8", title: "text-lg", sub: "text-xs" },
  lg: { icon: "h-10 w-10", title: "text-2xl", sub: "text-sm" },
};

export function Brand({ size = "md", showSubtitle = false }: BrandProps) {
  const s = sizeMap[size];
  return (
    <div className="flex items-center gap-2.5">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#E4F0DF] text-[#355844] ring-1 ring-[#C8DEC1]">
        <Recycle className={s.icon} strokeWidth={1.6} />
      </span>
      <span className="flex flex-col leading-tight">
        <span className={`font-semibold tracking-tight text-[#355844] ${s.title}`}>
          E-Waste Submission Portal
        </span>
        {showSubtitle && (
          <span className={`text-[#6B7869] ${s.sub}`}>
            My E-Waste coursework, assignments and academic submissions.
          </span>
        )}
      </span>
    </div>
  );
}

// Personal branding strip — used on the public portal header & hero.
// Shows the owner's name, class, branch, division.
export function OwnerBrand() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span className="font-semibold uppercase tracking-wider text-[#355844]">
        RIYA VARTHA
      </span>
      <span className="text-[#C8DEC1]" aria-hidden>·</span>
      <span className="rounded-md bg-[#E4F0DF] px-2 py-0.5 font-medium text-[#355844]">
        CLASS TE · CMPN · B
      </span>
      <span className="text-[#C8DEC1]" aria-hidden>·</span>
      <span className="font-medium uppercase tracking-wider text-[#6B7869]">
        SUBMISSIONS
      </span>
    </div>
  );
}
