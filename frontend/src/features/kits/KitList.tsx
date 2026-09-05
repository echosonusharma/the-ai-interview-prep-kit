"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlarmClock, ChevronLeft, ChevronRight, Flame, History, Hourglass, Plus, Search, SearchX, Sparkles, Timer } from "lucide-react";
import { api } from "@/lib/api";
import type { KitStatus, KitSummary } from "@/lib/types";
import { daysLeft, type SortKey } from "@/lib/kits";
import { CompanyLogo } from "@/components/ui/CompanyLogo";

const STATUS_STYLES: Record<KitStatus | "unknown", { bg: string; text: string; dot: string }> = {
  done: { bg: "bg-[#ecfdf5]", text: "text-[#059669]", dot: "bg-[#10b981]" },
  running: { bg: "bg-[#eef0ff]", text: "text-[#4f46e5]", dot: "bg-[#5b5bf5]" },
  queued: { bg: "bg-[#fef3c7]", text: "text-[#d97706]", dot: "bg-[#f59e0b]" },
  failed: { bg: "bg-[#fef2f2]", text: "text-[#dc2626]", dot: "bg-[#ef4444]" },
  unknown: { bg: "bg-[#f1f2f9]", text: "text-[#8a8fa8]", dot: "bg-[#a0a6c2]" },
};

function statusStyle(status: string) {
  return (STATUS_STYLES as Record<string, (typeof STATUS_STYLES)["unknown"]>)[status] ?? STATUS_STYLES.unknown;
}

const SORTS: Array<{ key: SortKey; label: string; Icon: typeof Hourglass }> = [
  { key: "upcoming", label: "Upcoming", Icon: Hourglass },
  { key: "newest", label: "Newest", Icon: Sparkles },
  { key: "oldest", label: "Oldest", Icon: History },
];

function CountdownChip({ kit }: { kit: KitSummary }) {
  const left = daysLeft(kit);
  if (left == null) return null;
  if (left < 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#fef2f2] px-2.5 py-1 text-[11px] font-extrabold text-[#dc2626]">
        <AlarmClock size={12} aria-hidden /> Overdue
      </span>
    );
  if (left === 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#fef2f2] px-2.5 py-1 text-[11px] font-extrabold text-[#dc2626]">
        <Flame size={12} aria-hidden /> Today
      </span>
    );
  if (left <= 3)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#fef3c7] px-2.5 py-1 text-[11px] font-extrabold text-[#d97706]">
        <Timer size={12} aria-hidden /> {left}d left
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#eef0ff] px-2.5 py-1 text-[11px] font-extrabold text-[#4f46e5]">
      <Timer size={12} aria-hidden /> {left}d left
    </span>
  );
}

interface KitListProps {
  limit?: number;
  /** When provided, skips internal fetch (dashboard passes preloaded kits). */
  kits?: KitSummary[];
  loading?: boolean;
  /** Hide the dashed "New kit" tile (e.g. when shown next to the creator). */
  showNewTile?: boolean;
  /** Show sort pills above the grid (server-side sort, default most-upcoming first). */
  sortable?: boolean;
  /** Show a search box (server-side match on company + role). */
  searchable?: boolean;
  /** Show server-side pagination controls. */
  paginate?: boolean;
  /** Page size when paginating. */
  pageSize?: number;
  /** Override the grid columns (wider cards = fewer columns). */
  gridClassName?: string;
}

export function KitList({
  limit,
  kits: kitsProp,
  loading: loadingProp,
  showNewTile = true,
  sortable = false,
  searchable = false,
  paginate = false,
  pageSize,
  gridClassName = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 w-full",
}: KitListProps) {
  const [kitsInternal, setKitsInternal] = useState<KitSummary[]>([]);
  const [loadingInternal, setLoadingInternal] = useState(kitsProp === undefined);
  const [sort, setSort] = useState<SortKey>("upcoming");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [pagination, setPagination] = useState<{ total: number; totalPages: number } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const searchParams = useSearchParams();

  // Deep-link support: topbar search navigates here with ?q= (applied immediately,
  // cleared when the param is removed). Runs on navigation only, not on query edits.
  useEffect(() => {
    const paramQ = searchParams.get("q") ?? "";
    if (paramQ !== query) {
      setSearchInput(paramQ);
      setQuery(paramQ.trim());
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const controlled = kitsProp !== undefined;
  // Server owns sort + paging for the uncontrolled list; controlled lists
  // (dashboard) render preloaded kits as given.
  const kits = controlled ? (limit ? kitsProp.slice(0, limit) : kitsProp) : kitsInternal;
  const loading = controlled ? (loadingProp ?? false) : loadingInternal;

  useEffect(() => {
    if (controlled) return;
    let alive = true;
    const ctrl = new AbortController();
    setLoadingInternal(true);
    setLoadError(null);
    api
      .listKits(
        {
          page,
          limit: paginate ? (pageSize ?? 6) : (limit ?? 50),
          sort: sortable ? sort : "newest",
          q: searchable ? query || undefined : undefined,
        },
        ctrl.signal
      )
      .then((r) => {
        if (!alive) return;
        setKitsInternal(r.kits);
        setPagination(r.pagination);
      })
      .catch((e) => {
        if (!alive) return;
        setLoadError(e instanceof Error ? e.message : "Failed to load kits");
      })
      .finally(() => {
        if (alive) setLoadingInternal(false);
      });
    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [controlled, paginate, pageSize, limit, sort, sortable, searchable, query, page, retryKey]);

  // Search runs only on Enter (no per-keystroke requests)
  const submitSearch = () => {
    setQuery(searchInput.trim());
    setPage(1);
  };
  const clearSearch = () => {
    setSearchInput("");
    setQuery("");
    setPage(1);
  };

  if (loading) {
    return (
      <div>
        {sortable && (
          <div className="mb-3 flex items-center justify-between" aria-hidden>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-8 w-24 animate-pulse rounded-full bg-[#e6e8f2]" />
              ))}
            </div>
            <div className="h-4 w-14 animate-pulse rounded bg-[#e6e8f2]" />
          </div>
        )}
        <div className={gridClassName} role="status" aria-label="Loading kits">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex min-h-[186px] animate-pulse flex-col rounded-2xl border border-[#e6e8f2] bg-white p-5"
            >
              <div className="h-5 w-20 rounded-full bg-[#eef0ff]" />
              <div className="mt-3 flex items-center gap-2.5">
                <div className="h-[38px] w-[38px] shrink-0 rounded-2xl bg-[#eef0ff]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-4/5 rounded bg-[#e6e8f2]" />
                  <div className="h-3 w-2/5 rounded bg-[#f1f2f9]" />
                </div>
              </div>
              <div className="mt-auto pt-4">
                <div className="mb-1.5 flex justify-between">
                  <div className="h-3 w-16 rounded bg-[#f1f2f9]" />
                  <div className="h-3 w-14 rounded bg-[#f1f2f9]" />
                </div>
                <div className="h-1.5 rounded-full bg-[#eef0ff]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (kits.length === 0) {
    if (!controlled && loadError) {
      return (
        <div className="fade-up w-full rounded-3xl border border-[#fecaca] bg-[#fef2f2] p-8 text-center">
          <p className="text-sm font-semibold text-[#b91c1c]">Couldn&apos;t load kits ({loadError})</p>
          <button
            type="button"
            onClick={() => setRetryKey((k) => k + 1)}
            className="focus-ring mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#0b1220] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            Try again
          </button>
        </div>
      );
    }
    if (query) {
      return (
        <div className="fade-up relative w-full overflow-hidden rounded-3xl border border-dashed border-[#d6d9eb] bg-white p-12 text-center">
          <div aria-hidden className="dashboard-orb-a absolute -left-10 -top-10 h-32 w-32 rounded-full bg-[#5b5bf5]/15 blur-2xl" />
          <div aria-hidden className="dashboard-orb-b absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-[#ff7eb0]/20 blur-2xl" />
          <div className="pop-in relative mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#5b5bf5] to-[#b07cff] text-white shadow-md">
            <SearchX size={26} aria-hidden />
          </div>
          <p className="relative mt-4 text-base font-extrabold text-[#0b1220]">No kits found</p>
          <p className="relative mx-auto mt-1 max-w-sm break-words text-sm text-[#67708f]">
            Nothing matches <span className="font-bold text-[#0b1220]">“{query}”</span>, try another company or role.
          </p>
          <button
            type="button"
            onClick={clearSearch}
            className="focus-ring relative mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#0b1220] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            Clear search
          </button>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-dashed border-[#d6d9eb] bg-white p-12 text-center w-full">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ff7eb0] to-[#ffcc6a] grid place-items-center text-white text-xl font-bold shadow-sm">
          +
        </div>
        <p className="mt-4 text-sm font-semibold text-[#0b1220]">No prep kits yet</p>
        <p className="mt-1 text-sm text-[#67708f]">Paste a job description and we&apos;ll build your interview kit.</p>
        <Link
          href="/kits/new"
          className="inline-flex mt-5 rounded-full bg-[#0b1220] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#1a2744]"
        >
          Create your first kit
        </Link>
      </div>
    );
  }

  return (
    <div>
      {(sortable || searchable) && (
        <div className="mb-4 flex flex-col gap-2.5">
          {searchable && (
            <form
              role="search"
              className="relative block w-full"
              onSubmit={(e) => {
                e.preventDefault();
                submitSearch();
              }}
            >
              <Search
                size={14}
                aria-hidden
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a0a6c2]"
              />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search company or role… (Enter)"
                aria-label="Search kits"
                className="focus-ring w-full rounded-full border border-[#e6e8f2] bg-white py-2 pl-9 pr-8 text-xs font-semibold text-[#0b1220] outline-none transition-colors placeholder:text-[#a0a6c2] focus:border-[#5b5bf5] [&::-webkit-search-cancel-button]:hidden"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full bg-[#f1f2f9] text-xs font-bold text-[#8a8fa8] hover:text-[#0b1220]"
                >
                  ×
                </button>
              )}
            </form>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
          {sortable && (
            <div className="flex gap-1.5 rounded-full bg-[#f1f2f9] p-1" role="group" aria-label="Sort kits">
              {SORTS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSort(key);
                    setPage(1);
                  }}
                  aria-pressed={sort === key}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                    sort === key ? "bg-white text-[#0b1220] shadow-sm" : "text-[#8a8fa8] hover:text-[#0b1220]"
                  }`}
                >
                  <Icon size={13} aria-hidden />
                  {label}
                </button>
              ))}
            </div>
          )}
          <span className="ml-auto text-xs font-semibold tabular-nums text-[#a0a6c2]">
            {(() => {
              const total = !controlled && pagination ? pagination.total : kits.length;
              return `${total} ${total === 1 ? "kit" : "kits"}`;
            })()}
          </span>
          </div>
        </div>
      )}
      <div className={gridClassName}>
      {showNewTile && (
        <Link
          href="/kits/new"
          className="group flex flex-col items-center justify-center min-h-[168px] rounded-2xl border-2 border-dashed border-[#d6d9eb] bg-white/50 hover:bg-white hover:border-[#c4b5fd] hover:shadow-md transition-all"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#ff7eb0] to-[#ffcc6a] text-white shadow-sm transition-transform group-hover:scale-105">
            <Plus size={18} strokeWidth={2.5} aria-hidden />
          </span>
          <span className="mt-3 text-sm font-semibold text-[#0b1220]">New kit</span>
        </Link>
      )}

      {kits.map((k) => {
        const st = statusStyle(k.status);
        return (
          <Link
            key={k.id}
            href={`/kits/${k.id}`}
            className="group flex flex-col rounded-2xl border border-[#e6e8f2] bg-white p-5 hover:shadow-lg hover:border-[#d6d9eb] hover:-translate-y-0.5 transition-all min-h-[168px]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${st.bg} ${st.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${st.dot} ${k.status === "running" ? "animate-pulse" : ""}`} />
                {k.status}
              </span>
              {(k.status === "running" || k.status === "queued") && (
                <span className="text-xs font-bold text-[#5b5bf5] tabular-nums">{k.progress}%</span>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2.5">
              <CompanyLogo company={k.company} url={k.companyUrl} size={38} />
              <div className="min-w-0">
                <h3 className="text-[15px] font-bold text-[#0b1220] leading-snug line-clamp-2 group-hover:text-[#4f46e5] transition-colors">
                  {k.role || "Untitled role"}
                </h3>
                <p className="mt-0.5 text-xs text-[#67708f] line-clamp-1">{k.company}</p>
              </div>
            </div>

            <div className="mt-auto pt-4">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[#a0a6c2]">{k.days} day plan</span>
                {k.queuePosition != null && k.status === "queued" ? (
                  <span className="text-[11px] font-semibold text-[#a0a6c2]">Queue #{k.queuePosition}</span>
                ) : (
                  <CountdownChip kit={k} />
                )}
              </div>
              <div className="h-1.5 rounded-full bg-[#eef0ff] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#6d5cff] to-[#b07cff] transition-all duration-500"
                  style={{ width: `${Math.max(k.progress, k.status === "done" ? 100 : 2)}%` }}
                />
              </div>
            </div>
          </Link>
        );
      })}
      </div>
      {!controlled && paginate && pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1.5">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            aria-label="Previous page"
            className="focus-ring grid h-8 w-8 place-items-center rounded-full border border-[#e6e8f2] bg-white text-[#67708f] transition-all hover:text-[#0b1220] disabled:opacity-40"
          >
            <ChevronLeft size={15} aria-hidden />
          </button>
          <span className="px-1 text-xs font-bold tabular-nums text-[#67708f]">
            {page} / {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Next page"
            className="focus-ring grid h-8 w-8 place-items-center rounded-full border border-[#e6e8f2] bg-white text-[#67708f] transition-all hover:text-[#0b1220] disabled:opacity-40"
          >
            <ChevronRight size={15} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
