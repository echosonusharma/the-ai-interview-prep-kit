"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { KitAppendix, KitDetail } from "@/lib/types";
import { Button, buttonStyles } from "@/components/ui/Button";
import { CompanyLogo } from "@/components/ui/CompanyLogo";

export function KitDetailHero({
  kit,
  kitId,
  appendix,
  onNewKit,
}: {
  kit: KitDetail;
  kitId: string;
  appendix: KitAppendix | null;
  onNewKit: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const mustCount = appendix?.role.requirements.filter((r) => r.priority === "must").length ?? 0;
  const niceCount = appendix?.role.requirements.filter((r) => r.priority === "nice").length ?? 0;
  const coveragePct =
    appendix && appendix.role.requirements.length > 0
      ? Math.round(
          ((appendix.role.requirements.length - appendix.coverage.uncovered_requirement_ids.length) /
            appendix.role.requirements.length) *
            100,
        )
      : null;

  return (
    <section className="relative w-full overflow-hidden border-b border-[#e6e8f2] bg-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="dashboard-orb dashboard-orb-a absolute -top-20 right-0 h-64 w-64 rounded-full bg-gradient-to-bl from-[#c4b5fd]/35 to-[#fbcfe8]/25 blur-3xl" />
        <div className="dashboard-orb dashboard-orb-b absolute bottom-0 -left-16 h-56 w-56 rounded-full bg-gradient-to-tr from-[#ffcc6a]/20 to-[#a5b4fc]/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(109,92,255,0.07)_0%,_transparent_50%)]" />
      </div>

      <div className="relative w-full px-4 md:px-8 lg:px-10 xl:px-12 py-8 lg:py-10">
        <div
          className={`flex flex-wrap items-center gap-2 transition-all duration-500 ease-out ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          <Link
            href="/dashboard"
            className="text-[11px] font-semibold tracking-[0.14em] text-[#a0a6c2] uppercase hover:text-[#67708f] transition-colors"
          >
            Dashboard
          </Link>
          <span className="text-[#d6d9eb]">/</span>
          <span className="text-[11px] font-semibold tracking-[0.14em] text-[#5b5bf5] uppercase">
            {kit.company || "Prep kit"}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div
            className={`min-w-0 flex-1 transition-all duration-500 delay-75 ease-out ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
            }`}
          >
            <div className="flex items-start gap-4">
              <CompanyLogo
                company={kit.company}
                url={appendix?.source.company_url ?? kit.companyUrl}
              />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-[#a0a6c2] uppercase">
                  {kit.company}
                  <span className="mx-2 text-[#d6d9eb]">·</span>
                  <span className="text-[#67708f]">{kit.days} day{kit.days === 1 ? "" : "s"}</span>
                  {appendix?.source.location && (
                    <>
                      <span className="mx-2 text-[#d6d9eb]">·</span>
                      <span className="text-[#67708f]">{appendix.source.location}</span>
                    </>
                  )}
                </p>
                <h1 className="mt-1 text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold tracking-tight text-[#0b1220] leading-[1.1]">
                  {kit.role || appendix?.role.title || "Generating your kit…"}
                </h1>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {appendix?.role.seniority && (
                <MetaChip>{appendix.role.seniority}</MetaChip>
              )}
              {appendix?.source.location && (
                <MetaChip>{appendix.source.location}</MetaChip>
              )}
              <MetaChip>{kit.days} day plan</MetaChip>
              {kit.status === "done" && appendix && (
                <>
                  <MetaChip>{appendix.questions.length} questions</MetaChip>
                  <MetaChip>{appendix.flashcards.length} flashcards</MetaChip>
                </>
              )}
            </div>
          </div>

          <div
            className={`flex flex-wrap gap-2 shrink-0 transition-all duration-500 delay-150 ease-out ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
            }`}
          >
            {kit.status === "done" && (
              <>
                <Link
                  href={`/kits/${kitId}/builder`}
                  className={buttonStyles("secondary", "lg")}
                >
                  Edit kit
                </Link>
                <Link
                  href={`/kits/${kitId}/practice`}
                  className={buttonStyles("primary", "lg", "shadow-lg shadow-[#6d5cff]/15")}
                >
                  Practice flashcards
                </Link>
              </>
            )}
            <Button variant="secondary" size="lg" onClick={onNewKit}>
              New kit
            </Button>
          </div>
        </div>

        {kit.status === "done" && appendix && (
          <div
            className={`mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl transition-all duration-500 delay-200 ease-out ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
            }`}
          >
            {[
              { label: "Must-have reqs", value: mustCount },
              { label: "Nice-to-have", value: niceCount },
              { label: "Coverage", value: coveragePct != null ? `${coveragePct}%` : "—" },
              { label: "Sources", value: appendix.source.pages_used.length },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-[#e6e8f2]/80 bg-white/70 backdrop-blur-sm px-4 py-3 shadow-sm"
              >
                <div className="text-xl font-extrabold text-[#0b1220] tabular-nums">{stat.value}</div>
                <div className="text-[11px] font-medium text-[#a0a6c2]">{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#e6e8f2] bg-white/80 backdrop-blur-sm px-3 py-1 text-xs font-medium text-[#67708f]">
      {children}
    </span>
  );
}
