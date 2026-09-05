import { EventEmitter } from "node:events";

export type KitEventType = "progress" | "status" | "complete" | "failed";

export interface KitEventPayload {
  kitId: string;
  status: "queued" | "running" | "done" | "failed";
  progress: number;
  step: string | null;
  label: string;
  stage: string;
  detail?: string;
  queuePosition?: number | null;
  error?: { code: string; message: string } | null;
}

export interface KitEvent {
  type: KitEventType;
  data: KitEventPayload;
}

export interface KitEventEnvelope {
  id: number;
  event: KitEvent;
}

export type KitEventListener = (event: KitEvent, id: number) => void;

// NOTE: this ring buffer is per-process only. True multi-instance fan-out
// needs a shared pub/sub (e.g. Redis); with multiple backend instances a
// subscriber connected to instance A will not see events published on B,
// and replay only covers what this process has buffered.
const BUFFER_LIMIT = 20;

class KitEventBus extends EventEmitter {
  private nextIds = new Map<string, number>();
  private buffers = new Map<string, KitEventEnvelope[]>();

  subscribe(kitId: string, listener: KitEventListener, fromId?: number): () => void {
    // Replay buffered events the subscriber hasn't seen (Last-Event-ID).
    const buffered = this.buffers.get(kitId) ?? [];
    for (const entry of buffered) {
      if (fromId === undefined || entry.id > fromId) {
        listener(entry.event, entry.id);
      }
    }
    const handler = (entry: KitEventEnvelope) => listener(entry.event, entry.id);
    this.on(kitId, handler);
    return () => this.off(kitId, handler);
  }

  publish(kitId: string, event: KitEvent): number {
    const id = (this.nextIds.get(kitId) ?? 0) + 1;
    this.nextIds.set(kitId, id);
    const entry: KitEventEnvelope = { id, event };
    const buffered = this.buffers.get(kitId) ?? [];
    buffered.push(entry);
    while (buffered.length > BUFFER_LIMIT) buffered.shift();
    this.buffers.set(kitId, buffered);
    this.emit(kitId, entry);
    return id;
  }
}

export const kitEvents = new KitEventBus();
