"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { KitProgressEvent } from "@/lib/types";

function parseEvent(e: MessageEvent): KitProgressEvent | null {
  try {
    return JSON.parse(e.data) as KitProgressEvent;
  } catch {
    return null;
  }
}

export function useKitEvents(kitId: string | null, enabled: boolean) {
  const [event, setEvent] = useState<KitProgressEvent | null>(null);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const [prevKitId, setPrevKitId] = useState(kitId);
  const [prevEnabled, setPrevEnabled] = useState(enabled);
  if (kitId !== prevKitId || enabled !== prevEnabled) {
    setPrevKitId(kitId);
    setPrevEnabled(enabled);
    setEvent(null);
    setDone(false);
    setFailed(false);
  }

  useEffect(() => {
    if (!kitId || !enabled) return;

    const es = new EventSource(api.kitEventsUrl(kitId), { withCredentials: true });
    esRef.current = es;

    const onStatus = (e: MessageEvent) => {
      const parsed = parseEvent(e);
      if (parsed) setEvent(parsed);
    };
    const onComplete = (e: MessageEvent) => {
      const parsed = parseEvent(e);
      if (parsed) setEvent(parsed);
      setDone(true);
      es.close();
    };
    const onFailed = (e: MessageEvent) => {
      const parsed = parseEvent(e);
      if (parsed) setEvent(parsed);
      setFailed(true);
      es.close();
    };
    // No "error" listener: native reconnect must survive transient blips.

    es.addEventListener("status", onStatus);
    es.addEventListener("progress", onStatus);
    es.addEventListener("complete", onComplete);
    es.addEventListener("failed", onFailed);

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [kitId, enabled]);

  return { event, done, failed };
}
