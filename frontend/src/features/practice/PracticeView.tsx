"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, CalendarDays, Flame, Layers, RotateCcw, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import type { KitSummary } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { CompanyLogo } from "@/components/ui/CompanyLogo";
import { domainOf } from "@/lib/companyLogo";

export default function PracticeView() {
  const [kits, setKits] = useState<KitSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.listKits({ sort: "upcoming" });
      setKits(r.kits.filter((k) => k.status === "done"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load kits");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totalDays = kits.reduce((s, k) => s + (k.days ?? 0), 0);

  return (
    <div className="flex min-h-full w-full flex-col px-4 py-6 md:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef0ff] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#5b5bf5]">
            <Sparkles size={12} strokeWidth={2.5} aria-hidden /> Flashcards
          </span>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#0b1220]">Practice</h1>
          <p className="mt-1 text-sm text-[#67708f]">
            Review flashcards from completed kits. Lower confidence cards surface first.
          </p>
        </div>
        {!loading && kits.length > 0 && (
          <div className="flex shrink-0 items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e6e8f2] bg-white px-3 py-1.5 text-xs font-extrabold text-[#0b1220] shadow-sm">
              <Layers size={13} aria-hidden /> {kits.length} {kits.length === 1 ? "deck" : "decks"}
            </span>
            <span className="hidden items-center gap-1.5 rounded-full border border-[#e6e8f2] bg-white px-3 py-1.5 text-xs font-bold text-[#67708f] shadow-sm sm:inline-flex">
              <CalendarDays size={13} aria-hidden /> {totalDays} prep {totalDays === 1 ? "day" : "days"}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading practice decks">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-3xl border border-[#e6e8f2] bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-[#eef0ff]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-3/4 rounded bg-[#e6e8f2]" />
                  <div className="h-3 w-1/2 rounded bg-[#f1f2f9]" />
                </div>
              </div>
              <div className="mt-4 h-8 rounded-full bg-[#f1f2f9]" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="fade-up mt-6 rounded-3xl border border-[#fecaca] bg-[#fef2f2] p-8 text-center">
          <p className="text-sm font-semibold text-[#b91c1c]">{error}</p>
          <Button className="mt-4" variant="secondary" onClick={() => void load()}>
            <RotateCcw size={14} aria-hidden /> Try again
          </Button>
        </div>
      ) : kits.length === 0 ? (
        <div className="fade-up relative mt-6 overflow-hidden rounded-3xl border border-dashed border-[#d6d9eb] bg-white p-10 text-center">
          <div aria-hidden className="dashboard-orb-a absolute -left-10 -top-10 h-32 w-32 rounded-full bg-[#5b5bf5]/15 blur-2xl" />
          <div aria-hidden className="dashboard-orb-b absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-[#ff7eb0]/20 blur-2xl" />
          <div className="pop-in relative mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#5b5bf5] to-[#b07cff] text-white shadow-md">
            <Layers size={26} aria-hidden />
          </div>
          <h2 className="relative mt-3 text-base font-extrabold text-[#0b1220]">No decks yet</h2>
          <p className="relative mx-auto mt-1 max-w-sm text-sm text-[#67708f]">
            Complete a kit first, then practice its flashcards here. Weakest cards surface first.
          </p>
          <Link href="/kits/new" className="relative mt-5 inline-block">
            <Button>Create a kit</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {kits.map((k, i) => {
            const domain = domainOf(k.companyUrl);
            const updated = k.updatedAt
              ? new Date(k.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
              : null;
            return (
              <Link
                key={k.id}
                href={`/kits/${k.id}/practice`}
                className="fade-up group relative overflow-hidden rounded-3xl border border-[#e6e8f2] bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#a5b4fc] hover:shadow-[0_18px_45px_-18px_rgba(91,91,245,0.5)] focus-ring"
                style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
              >
                {/* hover glow edge */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-[#5b5bf5] via-[#8b5cf6] to-[#ff7eb0] transition-transform duration-300 group-hover:scale-x-100"
                />
                <div className="flex items-center gap-3.5">
                  <CompanyLogo company={k.company || "?"} url={k.companyUrl} size={52} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-extrabold tracking-tight text-[#0b1220]">
                      {k.role || "Untitled role"}
                    </div>
                    <div className="mt-0.5 truncate text-xs font-semibold text-[#67708f]">
                      {k.company || "Unknown company"}
                      {domain && <span className="font-normal text-[#a0a6c2]"> · {domain}</span>}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#eef0ff] px-2.5 py-1 text-[11px] font-extrabold text-[#4f46e5]">
                    <CalendarClock size={12} aria-hidden /> {k.days}-day plan
                  </span>
                  {updated && (
                    <span className="rounded-full bg-[#f6f7fb] px-2.5 py-1 text-[11px] font-bold text-[#8a8fa8]">
                      Updated {updated}
                    </span>
                  )}
                  <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-extrabold text-[#5b5bf5]">
                    Practice
                    <span
                      aria-hidden
                      className="grid h-6 w-6 place-items-center rounded-full bg-[#0b1220] text-white transition-transform duration-300 group-hover:translate-x-1"
                    >
                      <ArrowRight size={12} strokeWidth={2.5} />
                    </span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {kits.length > 0 && !loading && (
        <>
          <div aria-hidden className="min-h-6 flex-1" />
          <div className="-mx-4 border-t border-[#e6e8f2] bg-[#f6f7fb]/85 px-4 py-3 text-center backdrop-blur-md md:-mx-6 lg:-mx-8">
            <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#a0a6c2]">
              Tip: cards you rate 1–2 come back sooner · 3+ keeps your streak alive
              <Flame size={12} className="text-[#c2410c]" aria-hidden />
            </p>
          </div>
        </>
      )}
    </div>
  );
}
