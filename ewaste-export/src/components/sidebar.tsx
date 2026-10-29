"use client";

import {
  LayoutDashboard,
  PlusCircle,
  Share2,
  LogOut,
  Recycle,
} from "lucide-react";
import { Brand } from "@/components/brand";

interface SidebarProps {
  active: "dashboard" | "new" | "public";
  onNavigate: (to: string) => void;
  ownerEmail?: string | null;
  onSignOut: () => void;
  onCopyPublicLink: () => void;
  stats?: {
    total: number;
    completed: number;
    drafts: number;
    categories: number;
  };
}

export function Sidebar({
  active,
  onNavigate,
  ownerEmail,
  onSignOut,
  onCopyPublicLink,
  stats,
}: SidebarProps) {
  const items: { id: SidebarProps["active"]; label: string; icon: typeof LayoutDashboard; to: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
    { id: "new", label: "Add Submission", icon: PlusCircle, to: "/dashboard/new" },
  ];

  return (
    <aside className="flex h-full w-full flex-col border-r border-[#E3EAE0] bg-white lg:w-64">
      <div className="px-4 py-4">
        <Brand size="md" />
      </div>

      <nav className="px-2 py-2">
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(item.to)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-[#E4F0DF] text-[#355844] font-medium"
                      : "text-[#303832] hover:bg-[#F7FAF5]"
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mx-2 my-2 border-t border-[#E3EAE0]" />

      {stats && (
        <div className="px-3 py-2">
          <p className="px-1 text-[11px] font-medium uppercase tracking-wider text-[#6B7869]">
            Overview
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            <li className="flex items-center justify-between rounded-md px-2 py-1">
              <span className="text-[#303832]">Total</span>
              <span className="font-medium text-[#355844]">{stats.total}</span>
            </li>
            <li className="flex items-center justify-between rounded-md px-2 py-1">
              <span className="text-[#303832]">Completed</span>
              <span className="font-medium text-[#355844]">{stats.completed}</span>
            </li>
            <li className="flex items-center justify-between rounded-md px-2 py-1">
              <span className="text-[#303832]">Drafts</span>
              <span className="font-medium text-[#355844]">{stats.drafts}</span>
            </li>
            <li className="flex items-center justify-between rounded-md px-2 py-1">
              <span className="text-[#303832]">Categories</span>
              <span className="font-medium text-[#355844]">{stats.categories}</span>
            </li>
          </ul>
        </div>
      )}

      <div className="mt-auto space-y-2 px-3 py-3">
        <button
          type="button"
          onClick={onCopyPublicLink}
          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
            active === "public"
              ? "bg-[#E4F0DF] text-[#355844] font-medium"
              : "text-[#303832] hover:bg-[#F7FAF5]"
          }`}
        >
          <Share2 className="h-4 w-4" strokeWidth={1.75} />
          Public Professor Portal
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[#303832] hover:bg-[#F7FAF5]"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          Sign Out
        </button>

        {ownerEmail && (
          <div className="rounded-lg bg-[#F7FAF5] px-3 py-2 text-xs text-[#6B7869]">
            Signed in as
            <div className="mt-0.5 truncate font-medium text-[#355844]">{ownerEmail}</div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 border-t border-[#E3EAE0] px-4 py-2 text-[11px] text-[#6B7869]">
        <Recycle className="h-3 w-3" strokeWidth={1.75} />
        <span>Sustainable academic workflow</span>
      </div>
    </aside>
  );
}
