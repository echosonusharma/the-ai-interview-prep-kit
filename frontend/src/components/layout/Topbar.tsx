"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Search } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";

const MIN_QUERY = 4;

export function Topbar({
  collapsed,
  onToggle,
  onMobileToggle,
}: {
  collapsed?: boolean;
  onToggle?: () => void;
  onMobileToggle?: () => void;
}) {
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
    }
  };
  // Kits hub has its own search box - hide the global one there to avoid duplicates.
  const onKitsPage = pathname?.startsWith("/kits") ?? false;
  const [value, setValue] = useState("");
  const [tooShort, setTooShort] = useState(false);

  // Fires only on Enter with 4+ chars - deep-links to the kits hub search.
  const submit = () => {
    const q = value.trim();
    if (q.length < MIN_QUERY) {
      setTooShort(true);
      return;
    }
    setTooShort(false);
    router.push(`/kits/new?q=${encodeURIComponent(q)}`);
  };

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

      {/* Center - global kit search (hidden on kits pages, they have their own) */}
      {!onKitsPage && (
      <form
        className="hidden min-w-0 flex-1 justify-center md:flex"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="group relative w-full max-w-xl">
          <Search
            size={16}
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-(--text-faint) transition-colors group-focus-within:text-(--accent)"
          />
          <input
            type="search"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (tooShort) setTooShort(false);
            }}
            placeholder="Search kits by company, role, or skill…"
            aria-label="Search kits"
            aria-invalid={tooShort}
            aria-describedby={tooShort ? "topbar-search-error" : undefined}
            className={`w-full rounded-full border bg-(--card-soft) py-2 pl-10 pr-16 text-[13px] font-medium text-(--foreground) outline-none transition-all placeholder:font-normal placeholder:text-(--text-faint) hover:border-(--border-strong) focus:border-(--accent) focus:bg-(--card) focus:shadow-[0_0_0_4px_var(--accent-soft)] [&::-webkit-search-cancel-button]:hidden ${
              tooShort ? "border-red-300" : "border-(--border)"
            }`}
          />
          <kbd
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-full border border-(--border) bg-(--card) px-2 py-0.5 text-[10px] font-semibold tracking-widest text-(--text-faint) lg:inline-flex"
          >
            Enter ↵
          </kbd>
          {tooShort && (
            <span id="topbar-search-error" role="alert" className="absolute -bottom-5 left-4 text-[11px] font-semibold text-[#dc2626]">
              Type at least 4 characters to search
            </span>
          )}
        </label>
      </form>
      )}

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          type="button"
          onClick={() => void signOut()}
          disabled={signingOut}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#e6e8f2] bg-white px-3 py-1.5 text-xs font-medium text-[#0b1220] hover:bg-[#f6f7fb] disabled:opacity-60"
        >
          <LogOut size={14} aria-hidden /> {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </header>
  );
}
