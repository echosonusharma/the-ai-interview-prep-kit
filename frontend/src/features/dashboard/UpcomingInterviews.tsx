"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import type { DashboardSummary } from "@/lib/types";
import { CompanyLogo } from "@/components/ui/CompanyLogo";

function DaysChip({ daysLeft }: { daysLeft: number }) {
  if (daysLeft < 0)
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#fef2f2] px-2.5 py-1 text-[11px] font-extrabold text-[#dc2626]">
        Overdue
      </span>
    );
  if (daysLeft === 0)
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#fef2f2] px-2.5 py-1 text-[11px] font-extrabold text-[#dc2626]">
        Today
      </span>
    );
  if (daysLeft <= 3)
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#fef3c7] px-2.5 py-1 text-[11px] font-extrabold text-[#d97706]">
        <CalendarClock size={12} aria-hidden /> {daysLeft}d left
      </span>
    );
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#eef0ff] px-2.5 py-1 text-[11px] font-extrabold text-[#4f46e5]">
      <CalendarClock size={12} aria-hidden /> {daysLeft}d left
    </span>
  );
}

export function UpcomingInterviews({
  data,
  loading,
  onPage,
}: {
  data: DashboardSummary | null;
  loading: boolean;
  onPage: (page: number) => void;
}) {
  const { upcoming, pagination } = data ?? { upcoming: [], pagination: { page: 1, limit: 5, total: 0, totalPages: 1 } };

  return (
    <section aria-label="Upcoming interviews" className="w-full px-4 md:px-8 lg:px-10 xl:px-12 pt-8 lg:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-[#0b1220]">Upcoming interviews</h2>
          <p className="text-sm text-[#67708f] mt-0.5">
            {loading || !data
              ? "Loading…"
              : pagination.total === 0
                ? "Nothing on the calendar. Create a kit to get started"
                : `${pagination.total} upcoming, soonest first`}
          </p>
        </div>
        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => onPage(pagination.page - 1)}
              aria-label="Previous page"
              className="focus-ring grid h-8 w-8 place-items-center rounded-full border border-[#e6e8f2] bg-white text-[#67708f] transition-all hover:text-[#0b1220] disabled:opacity-40"
            >
              <ChevronLeft size={15} aria-hidden />
            </button>
            <span className="px-1 text-xs font-bold tabular-nums text-[#67708f]">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPage(pagination.page + 1)}
              aria-label="Next page"
              className="focus-ring grid h-8 w-8 place-items-center rounded-full border border-[#e6e8f2] bg-white text-[#67708f] transition-all hover:text-[#0b1220] disabled:opacity-40"
            >
              <ChevronRight size={15} aria-hidden />
            </button>
          </div>
        )}
      </div>

      {loading && !data ? (
        <div className="overflow-hidden rounded-3xl border border-[#e6e8f2] bg-white" role="status" aria-label="Loading upcoming interviews">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex animate-pulse items-center gap-3.5 border-b border-[#f1f2f9] p-4 last:border-0">
              <div className="h-10 w-10 shrink-0 rounded-2xl bg-[#eef0ff]" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/3 rounded bg-[#e6e8f2]" />
                <div className="h-3 w-1/4 rounded bg-[#f1f2f9]" />
              </div>
              <div className="h-6 w-16 rounded-full bg-[#f1f2f9]" />
            </div>
          ))}
        </div>
      ) : upcoming.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#d6d9eb] bg-white p-8 text-center">
          <p className="text-sm font-semibold text-[#0b1220]">No upcoming interviews</p>
          <p className="mt-1 text-sm text-[#67708f]">Past interviews fall off here. New kits show up soonest-first.</p>
        </div>
      ) : (
        <div
          className={`overflow-hidden rounded-3xl border border-[#e6e8f2] bg-white shadow-sm transition-opacity ${loading ? "opacity-60" : ""}`}
          aria-busy={loading}
        >
          {upcoming.map((u) => (
            <Link
              key={u.id}
              href={`/kits/${u.id}`}
              className="group flex items-center gap-3.5 border-b border-[#f1f2f9] p-4 transition-colors last:border-0 hover:bg-[#f6f7fb]"
            >
              <CompanyLogo company={u.company || "?"} url={u.companyUrl} size={42} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold text-[#0b1220] group-hover:text-[#4f46e5]">
                  {u.role || "Untitled role"}
                </p>
                <p className="truncate text-xs text-[#67708f]">
                  {u.company || "Unknown company"} ·{" "}
                  {(() => {
                    const t = new Date(u.interviewDate).getTime();
                    return Number.isNaN(t)
                      ? "Date TBD"
                      : new Date(t).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        });
                  })()}
                </p>
              </div>
              <DaysChip daysLeft={u.daysLeft} />
              <span
                aria-hidden
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f1f2f9] text-[#67708f] transition-all group-hover:translate-x-0.5 group-hover:bg-[#0b1220] group-hover:text-white"
              >
                <ArrowRight size={13} strokeWidth={2.5} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
