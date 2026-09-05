"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarClock, Check, Hourglass, Sparkles, Timer } from "lucide-react";
import { userDisplayName } from "@/contexts/AuthContext";
import type { DashboardStats, User } from "@/lib/types";
import type { KitSummary } from "@/lib/types";
import { buttonStyles } from "@/components/ui/Button";
import { daysLeft } from "@/lib/kits";

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function firstName(user: User | null): string {
  const name = userDisplayName(user).split(/\s+/)[0];
  return name || "there";
}

export function DashboardHero({
  user,
  kits,
  stats,
}: {
  user: User | null;
  kits: KitSummary[];
  /** Backend-computed stats; falls back to local counts while loading. */
  stats: DashboardStats | null;
}) {
  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    setGreeting(timeGreeting());
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const upcoming = useMemo(
    () =>
      kits.filter((k) => {
        const d = daysLeft(k);
        return d != null && d >= 0 && k.status !== "failed";
      }),
    [kits]
  );
  const nextUp =
    useMemo(
      () => [...upcoming].sort((a, b) => (daysLeft(a) ?? 0) - (daysLeft(b) ?? 0))[0],
      [upcoming]
    ) ?? null;

  // Prefer backend stats (same numbers, one source of truth); local calc avoids layout shift while loading.
  const done = stats?.prepared ?? kits.filter((k) => k.status === "done").length;
  const active = stats?.preparing ?? kits.filter((k) => k.status === "queued" || k.status === "running").length;
  const upcomingCount = stats?.upcoming ?? upcoming.length;
  const prepDaysLeft =
    stats?.prepDaysLeft ?? upcoming.reduce((s, k) => s + Math.max(daysLeft(k) ?? 0, 0), 0);

  return (
    <section className="relative w-full overflow-hidden border-b border-[#e6e8f2] bg-white">
      {/* Animated gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="dashboard-orb dashboard-orb-a absolute -top-24 -right-16 h-72 w-72 rounded-full bg-gradient-to-br from-[#c4b5fd]/40 to-[#fbcfe8]/30 blur-3xl" />
        <div className="dashboard-orb dashboard-orb-b absolute top-1/2 -left-20 h-64 w-64 rounded-full bg-gradient-to-tr from-[#ffcc6a]/25 to-[#ff8fa0]/20 blur-3xl" />
        <div className="dashboard-orb dashboard-orb-c absolute bottom-0 right-1/3 h-48 w-48 rounded-full bg-gradient-to-t from-[#a5b4fc]/20 to-transparent blur-2xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(109,92,255,0.06)_0%,_transparent_55%)]" />
        <Sparkles size={16} className="dashboard-orb-a absolute right-[12%] top-10 text-[#a5b4fc]" />
        <Sparkles size={12} className="dashboard-orb-b absolute right-[22%] top-24 text-[#f9a8d4]" />
        <Sparkles size={14} className="dashboard-orb-c absolute bottom-10 right-[8%] text-[#fcd34d]" />
        <Sparkles size={14} className="dashboard-orb-b absolute left-[8%] top-16 text-[#c4b5fd]" />
        <Sparkles size={10} className="dashboard-orb-c absolute left-[30%] top-8 text-[#f9a8d4]" />
        <Sparkles size={12} className="dashboard-orb-a absolute left-[45%] bottom-16 text-[#a5b4fc]" />
        <Sparkles size={10} className="dashboard-orb-b absolute right-[35%] top-1/2 text-[#fcd34d]" />
        <Sparkles size={18} className="dashboard-orb-c absolute right-[5%] top-1/3 text-[#c4b5fd]" />
        <Sparkles size={16} className="dashboard-orb-a absolute left-[15%] bottom-8 text-[#f9a8d4]" />
      </div>

      <div className="relative w-full px-4 md:px-8 lg:px-10 xl:px-12 py-10 lg:py-14">
        <div
          className={`transition-all duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
        >
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[#a0a6c2] uppercase">Interview prep kit</p>
        </div>

        <h1
          className={`mt-3 text-[clamp(2rem,5vw,3.25rem)] font-extrabold tracking-tight text-[#0b1220] leading-[1.05] transition-all duration-700 delay-100 ease-out ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <span className="block text-[#67708f] font-semibold text-[clamp(1.1rem,2.5vw,1.35rem)] mb-1">{greeting},</span>
          <span className="dashboard-name-shimmer inline-block">{firstName(user)}</span>
          <span aria-hidden className="animate-wave ml-3 inline-block origin-[70%_70%] text-[clamp(1.8rem,4vw,2.75rem)]">
            👋
          </span>
        </h1>

        <p
          className={`mt-4 max-w-2xl text-base text-[#67708f] leading-relaxed transition-all duration-700 delay-200 ease-out ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          Turn any job description into a tailored prep kit: company research, questions, flashcards, and a
          day-by-day schedule.
        </p>

        {nextUp && (
          <Link
            href={`/kits/${nextUp.id}`}
            className={`pop-in mt-5 inline-flex max-w-full items-center gap-2 rounded-full border border-[#e0e4ff] bg-[#eef0ff] py-2 pl-4 pr-2.5 text-xs font-bold text-[#4f46e5] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <CalendarClock size={14} aria-hidden />
            <span className="truncate">
              Next up: {nextUp.role || "Interview"} {nextUp.company ? `@ ${nextUp.company}` : ""} ·{" "}
              {(() => {
                const d = daysLeft(nextUp) ?? 0;
                return d === 0 ? "today" : `in ${d}d`;
              })()}
            </span>
            <span aria-hidden className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#4f46e5] text-white">
              <ArrowRight size={11} strokeWidth={2.5} />
            </span>
          </Link>
        )}

        <div
          className={`mt-8 flex flex-wrap items-center gap-3 transition-all duration-700 delay-300 ease-out ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <Link href="/kits/new" className={buttonStyles("primary", "lg", "shadow-lg shadow-[#6d5cff]/20")}>
            + New prep kit
          </Link>
          {active > 0 && (
            <span className="inline-flex items-center gap-2 rounded-full bg-[#eef0ff] border border-[#e0e4ff] px-4 py-2 text-xs font-semibold text-[#4f46e5]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5b5bf5] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#5b5bf5]" />
              </span>
              {active} generating
            </span>
          )}
        </div>

        {kits.length > 0 && (
          <div
            className={`mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl transition-all duration-700 delay-[400ms] ease-out ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            {[
              { label: "Upcoming interviews", value: upcomingCount, Icon: CalendarClock, tile: "bg-[#eef0ff] text-[#4f46e5]" },
              { label: "Kits prepared", value: done, Icon: Check, tile: "bg-[#ecfdf5] text-[#059669]" },
              { label: "Still preparing", value: active, Icon: Hourglass, tile: "bg-[#fef3c7] text-[#d97706]" },
              { label: "Prep days left", value: prepDaysLeft, Icon: Timer, tile: "bg-[#fdf2f8] text-[#be185d]" },
            ].map(({ label, value, Icon, tile }, i) => (
              <div
                key={label}
                style={{ transitionDelay: `${400 + i * 90}ms` }}
                className={`rounded-2xl border border-[#e6e8f2]/80 bg-white/70 backdrop-blur-sm px-4 py-3 shadow-sm transition-all duration-700 ease-out hover:-translate-y-1 hover:shadow-md ${
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                <span className={`inline-grid h-7 w-7 place-items-center rounded-xl ${tile}`}>
                  <Icon size={15} aria-hidden />
                </span>
                <div className="mt-2 text-2xl font-extrabold text-[#0b1220] tabular-nums">{value}</div>
                <div className="text-[11px] font-medium text-[#a0a6c2]">{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
