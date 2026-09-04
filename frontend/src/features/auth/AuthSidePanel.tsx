"use client";

import { Briefcase, CalendarClock, ListChecks } from "lucide-react";

const FEATURES = [
  {
    Icon: Briefcase,
    title: "Company deep-dives",
    desc: "What they do, in minutes",
  },
  {
    Icon: ListChecks,
    title: "Real interview questions",
    desc: "With answer outlines",
  },
  {
    Icon: CalendarClock,
    title: "A plan that sticks",
    desc: "Flashcards + day-by-day schedule",
  },
];

export function AuthSidePanel({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="auth-keep-dark relative hidden flex-col justify-between overflow-hidden bg-[#0b1220] p-8 text-white lg:flex">
      {/* glow orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="dashboard-orb-a absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#5b5bf5]/40 blur-3xl" />
        <div className="dashboard-orb-b absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[#ff7eb0]/25 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(109,92,255,0.25)_0%,_transparent_60%)]" />
      </div>

      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white/70">
          ✦ Interview prep kit
        </span>
        <h2 className="mt-4 text-[26px] font-extrabold leading-tight">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/70">{subtitle}</p>
        <ul className="mt-6 space-y-3">
          {FEATURES.map(({ Icon, title: t, desc }) => (
            <li key={t} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#5b5bf5] to-[#b07cff] text-white shadow-md">
                <Icon size={16} aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-bold">{t}</span>
                <span className="block text-xs text-white/60">{desc}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
        <p className="text-[13px] font-semibold leading-relaxed">
          &ldquo;Paste a job post, walk in ready.&rdquo;
        </p>
        <p className="mt-1 text-xs text-white/60">Company brief · questions · flashcards · schedule</p>
      </div>
    </div>
  );
}
