"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShaderBackground } from "@/components/shader/ShaderBackground";
import { NotFoundView } from "@/features/not-found/NotFoundView";

export default function NotFound() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = saved ?? (prefers ? "dark" : "light");
    setIsDark(initial === "dark");
  }, []);

  return (
    <div className={`min-h-screen flex flex-col relative isolate overflow-hidden ${isDark ? "dark" : ""}`}>
      <ShaderBackground />
      {/* transparent header */}
      <header className="w-full bg-transparent relative z-10">
        <div className="max-w-[1440px] w-full mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#0b1220] dark:bg-white flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white dark:text-[#0b1220]">
                <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="currentColor" />
              </svg>
            </div>
            <span className="font-semibold text-sm tracking-tight text-[#0b1220] dark:text-white">PrepPilot AI</span>
            <span className="hidden sm:inline text-[10px] font-semibold tracking-widest text-[#a0a6c2] dark:text-white/70 ml-1 border border-[#e6e8f2] dark:border-white/20 bg-white dark:bg-white/10 backdrop-blur rounded-full px-2 py-0.5">
              INTERVIEW KIT
            </span>
          </Link>
          <Link href="/" className="text-xs font-medium text-[#0b1220] dark:text-white/80 hover:text-black dark:hover:text-white bg-white dark:bg-white/10 backdrop-blur border border-[#e6e8f2] dark:border-white/20 rounded-full px-3 py-1.5">
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 md:p-6 relative z-10">
        <NotFoundView />
      </main>

      <footer className="py-4 text-center text-[11px] text-[#67708f] dark:text-white/60 relative z-10">
        © {new Date().getFullYear()} PrepPilot AI •{" "}
        <Link href="/resources" className="hover:underline">
          Privacy
        </Link>{" "}
        •{" "}
        <Link href="/resources" className="hover:underline">
          Terms
        </Link>
      </footer>
    </div>
  );
}
