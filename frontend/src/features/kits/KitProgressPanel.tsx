"use client";

import { PIPELINE_STAGES } from "@/lib/types";
import type { KitProgressEvent } from "@/lib/types";

export function KitProgressPanel({
  event,
  status,
}: {
  event: KitProgressEvent | null;
  status?: string;
}) {
  const currentStage = event?.stage ?? "research";
  const progress = event?.progress ?? 0;
  const jobStatus = status ?? event?.status ?? "queued";

  return (
    <div className="rounded-2xl border border-[#e6e8f2] bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.12em] text-[#a0a6c2]">GENERATION</div>
          <div className="mt-1 text-sm font-semibold text-[#0b1220]">
            {event?.label ?? (jobStatus === "queued" ? "Waiting in queue" : "Starting…")}
          </div>
          {event?.detail && <p className="mt-1 text-xs text-[#67708f]">{event.detail}</p>}
          {event?.queuePosition != null && jobStatus === "queued" && (
            <p className="mt-1 text-xs text-[#d97706]">Position in queue: {event.queuePosition}</p>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-extrabold text-[#0b1220]">{progress}%</div>
          <div className="text-[11px] text-[#a0a6c2] uppercase">{jobStatus}</div>
        </div>
      </div>

      <div
        className="mt-4 h-2 rounded-full bg-[#eef0ff] overflow-hidden"
        role="progressbar"
        aria-label="Kit generation progress"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-gradient-to-r from-[#6d5cff] to-[#b07cff] rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-5 grid grid-cols-3 sm:grid-cols-6 gap-2">
        {PIPELINE_STAGES.map((stage) => {
          const idx = PIPELINE_STAGES.findIndex((s) => s.id === currentStage);
          const stageIdx = PIPELINE_STAGES.findIndex((s) => s.id === stage.id);
          const active = stage.id === currentStage;
          const done = stageIdx < idx || jobStatus === "done";
          return (
            <div
              key={stage.id}
              className={`rounded-xl px-2 py-2 text-center border text-[10px] font-semibold ${
                active
                  ? "bg-[#eef0ff] border-[#5b5bf5] text-[#4f46e5]"
                  : done
                    ? "bg-[#ecfdf5] border-[#a7f3d0] text-[#059669]"
                    : "bg-[#f6f7fb] border-[#e6e8f2] text-[#a0a6c2]"
              }`}
            >
              {stage.label}
            </div>
          );
        })}
      </div>

      {event?.error && (
        <div className="mt-4 rounded-xl bg-[#fef2f2] border border-[#fecaca] px-3 py-2 text-xs text-[#b91c1c]">
          <strong>{event.error.code}</strong>: {event.error.message}
        </div>
      )}
    </div>
  );
}
