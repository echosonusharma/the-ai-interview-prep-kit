"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { KitDetail, KitProgressEvent } from "@/lib/types";
import { stepLabel } from "@/lib/types";
import { useKitEvents } from "@/hooks/useKitEvents";
import { KitProgressPanel } from "./KitProgressPanel";
import { KitDetailHero } from "./KitDetailHero";
import { KitDetailContent } from "./KitDetailContent";

export function KitDetailView({ kitId }: { kitId: string }) {
  const router = useRouter();
  const [kit, setKit] = useState<KitDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const streaming = kit?.status === "queued" || kit?.status === "running";
  const { event, done, failed } = useKitEvents(kitId, streaming);

  // SSE dies on serverless (Vercel kills long streams, bus is per-process),
  // so the 8s poll is the fallback source of truth. Show whichever is newer.
  const displayEvent: KitProgressEvent | null =
    event && kit && event.progress >= kit.progress
      ? event
      : kit && (kit.status === "queued" || kit.status === "running")
        ? {
            kitId,
            status: kit.status,
            progress: Math.max(event?.progress ?? 0, kit.progress),
            step: event && event.progress >= kit.progress ? event.step : kit.step,
            label:
              event && event.progress >= kit.progress
                ? event.label
                : stepLabel(kit.step, kit.status),
            stage: event && event.progress >= kit.progress ? event.stage : kit.stage,
            queuePosition: kit.queuePosition,
            error: kit.error,
          }
        : event;
  const refresh = useCallback(async () => {
    try {
      const data = await api.getKit(kitId);
      setKit(data);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load kit");
    }
  }, [kitId]);

  useEffect(() => {
    setKit(null);
    setLoadError(null);
    void refresh();
  }, [kitId, refresh]);

  useEffect(() => {
    if (done || failed) void refresh();
  }, [done, failed, refresh]);

  // Poll while generating: covers SSE dying before the terminal event.
  useEffect(() => {
    if (!streaming) return;
    const t = setInterval(() => {
      void refresh();
    }, 8000);
    return () => clearInterval(t);
  }, [streaming, refresh]);

  if (loadError) {
    return (
      <div className="px-4 md:px-8 py-12">
        <p className="text-sm text-[#b91c1c]">{loadError}</p>
      </div>
    );
  }

  if (!kit) {
    return (
      <div className="px-4 md:px-8 py-12 space-y-4">
        <div className="h-8 w-48 rounded-lg bg-[#e6e8f2] animate-pulse" />
        <div className="h-12 w-96 max-w-full rounded-lg bg-[#e6e8f2] animate-pulse" />
        <div className="h-64 rounded-2xl bg-[#e6e8f2] animate-pulse" />
      </div>
    );
  }

  const appendix = kit.kit;

  return (
    <div className="-mx-0 w-full">
      <KitDetailHero
        kit={kit}
        kitId={kitId}
        appendix={appendix}
        onNewKit={() => router.push("/kits/new")}
      />

      <div className="px-4 md:px-8 lg:px-10 xl:px-12 py-8 lg:py-10">
        {streaming && <KitProgressPanel event={displayEvent} status={kit.status} />}
        {kit.status === "failed" && (
          <KitProgressPanel
            event={
              displayEvent ?? {
                kitId,
                status: "failed",
                progress: kit.progress,
                step: kit.step,
                label: "Failed",
                stage: kit.stage,
                error: kit.error,
              }
            }
          />
        )}

        {appendix && kit.status === "done" && (
          <KitDetailContent appendix={appendix} kitId={kitId} createdAt={kit.createdAt} onChanged={refresh} />
        )}
      </div>
    </div>
  );
}
