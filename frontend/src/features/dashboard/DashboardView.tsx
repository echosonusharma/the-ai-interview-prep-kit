"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import type { DashboardSummary, KitSummary } from "@/lib/types";
import { KitList } from "@/features/kits/KitList";
import { DashboardHero } from "./DashboardHero";
import { UpcomingInterviews } from "./UpcomingInterviews";

const UPCOMING_PAGE_SIZE = 5;

export default function DashboardView() {
  const { user } = useAuth();
  const [kits, setKits] = useState<KitSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [kitsError, setKitsError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    api
      .listKits()
      .then((r) => setKits(r.kits))
      .catch((e) => setKitsError(e instanceof Error ? e.message : "Failed to load kits"))
      .finally(() => setLoading(false));
  }, []);

  const loadSummary = useCallback(async (p: number) => {
    setSummaryLoading(true);
    try {
      setSummary(await api.getDashboard(p, UPCOMING_PAGE_SIZE));
    } catch {
      // Backend stats are progressive enhancement — hero falls back to local counts
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary(1);
  }, [loadSummary]);

  return (
    <div className="w-full min-h-full bg-[#f6f7fb]">
      <DashboardHero user={user} kits={kits} stats={summary?.stats ?? null} />

      <UpcomingInterviews data={summary} loading={summaryLoading} onPage={(p) => void loadSummary(p)} />

      <section className="w-full px-4 md:px-8 lg:px-10 xl:px-12 py-8 lg:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-[#0b1220]">Your kits</h2>
            <p className="text-sm text-[#67708f] mt-0.5">
              {loading ? "Loading…" : kits.length === 0 ? "No kits yet — create one to get started" : `${kits.length} role${kits.length === 1 ? "" : "s"} in your library`}
            </p>
          </div>
          <Link
            href="/kits/new"
            className="text-sm font-semibold text-[#5b5bf5] hover:text-[#4f46e5] hover:underline"
          >
            + Add another
          </Link>
        </div>

        {kitsError && (
          <p role="alert" className="mb-4 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-2.5 text-xs font-medium text-[#b91c1c]">
            Couldn&apos;t load your kits ({kitsError}). Reload the page to retry.
          </p>
        )}

        <Suspense fallback={null}>
          <KitList kits={kits} loading={loading} />
        </Suspense>
      </section>
    </div>
  );
}
