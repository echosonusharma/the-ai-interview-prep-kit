"use client";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function Topbar({
  collapsed,
  onToggle,
  onMobileToggle,
}: {
  collapsed?: boolean;
  onToggle?: () => void;
  onMobileToggle?: () => void;
}) {
  return (
    <header className="h-14 shrink-0 bg-white border-b border-[#e6e8f2] flex items-center justify-between px-3 md:px-4 gap-3 sticky top-0 z-30">
      <div className="flex items-center gap-2">
        {/* Desktop collapse toggle */}
        <button
          onClick={onToggle}
          className="hidden md:inline-flex w-8 h-8 rounded-lg border border-[#e6e8f2] bg-white hover:bg-[#f6f7fb] items-center justify-center text-[#0b1220]"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            {collapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
          </svg>
        </button>
        {/* Mobile hamburger */}
        <button
          onClick={onMobileToggle}
          className="md:hidden w-8 h-8 rounded-lg border border-[#e6e8f2] bg-white grid place-items-center text-[#0b1220]"
          aria-label="Open menu"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-[#0b1220] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="currentColor" />
            </svg>
          </div>
          <span className="font-semibold text-[14px] tracking-tight text-[#0b1220]">PrepPilot AI</span>
          <span className="hidden lg:inline text-[10px] font-semibold tracking-widest text-[#a0a6c2] ml-1 border border-[#e6e8f2] rounded-full px-2 py-0.5">INTERVIEW KIT</span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Link href="/settings" className="hidden sm:inline-flex items-center gap-2 text-xs font-medium text-[#0b1220] border border-[#e6e8f2] rounded-full px-3 py-1.5 bg-white hover:bg-[#f6f7fb]">
          <span className="w-6 h-6 rounded-full bg-[#eef0ff] flex items-center justify-center text-[10px] font-bold text-[#4f46e5]">JD</span>
          Jane Doe
        </Link>
        <Link href="/settings" className="sm:hidden w-7 h-7 rounded-full bg-[#eef0ff] flex items-center justify-center text-[10px] font-bold text-[#4f46e5] border border-[#e6e8f2]">
          JD
        </Link>
      </div>
    </header>
  );
}
