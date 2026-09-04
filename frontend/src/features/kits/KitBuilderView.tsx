"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { formatDuration } from "@/lib/format";
import type { KitAppendix, KitDetail } from "@/lib/types";
import { Button } from "@/components/ui/Button";

const CATEGORIES = ["technical", "behavioural", "system-design", "company-fit"] as const;

export function KitBuilderView({ kitId }: { kitId: string }) {
  const [kit, setKit] = useState<KitDetail | null>(null);
  const [tab, setTab] = useState<"brief" | "questions" | "flashcards" | "schedule">("brief");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await api.getKit(kitId);
    setKit(data);
  }, [kitId]);

  useEffect(() => {
    void load().catch((e) => setMessage(e instanceof Error ? e.message : "Load failed"));
  }, [load]);

  const appendix = kit?.kit;
  if (!kit) return <p className="text-sm text-[#67708f]">Loading…</p>;
  if (kit.status !== "done" || !appendix) {
    return (
      <p className="text-sm text-[#67708f]">
        Kit is not ready. <Link href={`/kits/${kitId}`} className="text-[#5b5bf5]">View progress</Link>
      </p>
    );
  }

  const run = async (fn: () => Promise<KitDetail>) => {
    setBusy(true);
    setMessage(null);
    try {
      const updated = await fn();
      setKit(updated);
      setMessage("Saved");
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const regen = (section: string) =>
    run(() => api.regenerate(kitId, section));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/kits/${kitId}`} className="text-xs text-[#5b5bf5]">← Back to kit</Link>
          <h1 className="text-xl font-extrabold text-[#0b1220]">Kit builder</h1>
          <p className="text-sm text-[#67708f]">Edits are pinned automatically. Regenerate replaces only unpinned items.</p>
        </div>
        <Link href={`/kits/${kitId}/practice`}>
          <Button>Practice</Button>
        </Link>
      </div>

      {message && <p className="text-xs text-[#059669]">{message}</p>}

      <div className="flex flex-wrap gap-2">
        {(["brief", "questions", "flashcards", "schedule"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize ${tab === t ? "bg-[#0b1220] text-white" : "bg-[#f6f7fb] text-[#67708f]"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "brief" && (
        <BriefEditor
          appendix={appendix}
          disabled={busy}
          onSave={(summary, what) => run(() => api.patchBrief(kitId, { summary, what_they_do: what, pinned: true }))}
          onRegen={() => regen("brief")}
        />
      )}

      {tab === "questions" && (
        <QuestionsEditor
          kitId={kitId}
          appendix={appendix}
          disabled={busy}
          onUpdate={load}
          onRegen={regen}
        />
      )}

      {tab === "flashcards" && (
        <FlashcardsEditor kitId={kitId} appendix={appendix} disabled={busy} onUpdate={load} />
      )}

      {tab === "schedule" && (
        <SchedulePanel appendix={appendix} disabled={busy} onRegen={() => regen("schedule")} />
      )}
    </div>
  );
}

function BriefEditor({
  appendix,
  disabled,
  onSave,
  onRegen,
}: {
  appendix: KitAppendix;
  disabled: boolean;
  onSave: (summary: string, what: string) => void;
  onRegen: () => void;
}) {
  const [summary, setSummary] = useState(appendix.company_brief.summary);
  const [what, setWhat] = useState(appendix.company_brief.what_they_do);

  useEffect(() => {
    setSummary(appendix.company_brief.summary);
    setWhat(appendix.company_brief.what_they_do);
  }, [appendix.company_brief.summary, appendix.company_brief.what_they_do]);

  return (
    <div className="rounded-2xl border border-[#e6e8f2] bg-white p-5 space-y-3">
      <textarea aria-label="Company summary" className="w-full rounded-xl border border-[#e6e8f2] bg-[#f6f7fb] px-3 py-2 text-sm text-[#0b1220] placeholder:text-[#a0a6c2] min-h-[100px]" value={summary} onChange={(e) => setSummary(e.target.value)} />
      <textarea aria-label="What they do" className="w-full rounded-xl border border-[#e6e8f2] bg-[#f6f7fb] px-3 py-2 text-sm text-[#0b1220] placeholder:text-[#a0a6c2] min-h-[80px]" value={what} onChange={(e) => setWhat(e.target.value)} />
      <div className="flex gap-2">
        <Button disabled={disabled} onClick={() => onSave(summary, what)}>Save brief</Button>
        <Button variant="secondary" disabled={disabled} onClick={onRegen}>Regenerate brief</Button>
      </div>
    </div>
  );
}

function QuestionsEditor({
  kitId,
  appendix,
  disabled,
  onUpdate,
  onRegen,
}: {
  kitId: string;
  appendix: KitAppendix;
  disabled: boolean;
  onUpdate: () => Promise<void>;
  onRegen: (s: string) => Promise<void>;
}) {
  const [category, setCategory] = useState<string>("technical");
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveQ = async (qid: string, patch: { prompt?: string; answer_outline?: string }) => {
    setSaveError(null);
    try {
      await api.patchQuestion(kitId, qid, { ...patch, pinned: true });
      await onUpdate();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save question");
    }
  };

  const filtered = appendix.questions.filter((q) => q.category === category);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        {CATEGORIES.map((c) => (
          <button key={c} type="button" onClick={() => setCategory(c)} className={`rounded-full px-3 py-1 text-xs font-semibold ${category === c ? "bg-[#eef0ff] text-[#4f46e5]" : "bg-[#f6f7fb]"}`}>
            {c}
          </button>
        ))}
        <Button variant="secondary" size="sm" disabled={disabled} onClick={() => onRegen(category)}>
          Regenerate {category}
        </Button>
      </div>
      {saveError && (
        <p role="alert" className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-xs font-semibold text-[#b91c1c]">
          {saveError}
        </p>
      )}
      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#d6d9eb] bg-white p-6 text-center text-sm text-[#67708f]">
          No {category} questions yet — regenerate the category to create some.
        </p>
      ) : (
        filtered.map((q) => (
          <QuestionCard key={q.id} q={q} disabled={disabled} onSave={(p) => saveQ(q.id, p)} />
        ))
      )}
    </div>
  );
}

function QuestionCard({
  q,
  disabled,
  onSave,
}: {
  q: KitAppendix["questions"][0];
  disabled: boolean;
  onSave: (p: { prompt?: string; answer_outline?: string }) => Promise<void>;
}) {
  const [prompt, setPrompt] = useState(q.prompt);
  const [outline, setOutline] = useState(q.answer_outline);

  useEffect(() => {
    setPrompt(q.prompt);
    setOutline(q.answer_outline);
  }, [q.id, q.prompt, q.answer_outline]);

  return (
    <div className="rounded-2xl border border-[#e6e8f2] bg-white p-4 space-y-2">
      <div className="text-[10px] font-mono text-[#a0a6c2]">{q.id} · diff {q.difficulty}</div>
      <input aria-label="Question prompt" className="w-full rounded-lg border border-[#e6e8f2] bg-[#f6f7fb] px-3 py-2 text-sm font-medium text-[#0b1220]" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      <textarea aria-label="Answer outline" className="w-full rounded-lg border border-[#e6e8f2] bg-[#f6f7fb] px-3 py-2 text-sm text-[#0b1220] min-h-[72px]" value={outline} onChange={(e) => setOutline(e.target.value)} />
      <Button size="sm" disabled={disabled} onClick={() => onSave({ prompt, answer_outline: outline })}>Save</Button>
    </div>
  );
}

function FlashcardsEditor({
  kitId,
  appendix,
  disabled,
  onUpdate,
}: {
  kitId: string;
  appendix: KitAppendix;
  disabled: boolean;
  onUpdate: () => Promise<void>;
}) {
  const [saveError, setSaveError] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      {saveError && (
        <p role="alert" className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-xs font-semibold text-[#b91c1c]">
          {saveError}
        </p>
      )}
      {appendix.flashcards.map((f) => (
        <FlashcardCard key={f.id} f={f} disabled={disabled} onSave={async (front, back) => {
          setSaveError(null);
          try {
            await api.patchFlashcard(kitId, f.id, { front, back, pinned: true });
            await onUpdate();
          } catch (e) {
            setSaveError(e instanceof Error ? e.message : "Failed to save card");
          }
        }} />
      ))}
    </div>
  );
}

function FlashcardCard({
  f,
  disabled,
  onSave,
}: {
  f: KitAppendix["flashcards"][0];
  disabled: boolean;
  onSave: (front: string, back: string) => Promise<void>;
}) {
  const [front, setFront] = useState(f.front);
  const [back, setBack] = useState(f.back);

  useEffect(() => {
    setFront(f.front);
    setBack(f.back);
  }, [f.id, f.front, f.back]);

  return (
    <div className="rounded-2xl border border-[#e6e8f2] bg-white p-4 grid sm:grid-cols-2 gap-2">
      <input aria-label="Card front" className="rounded-lg border border-[#e6e8f2] bg-[#f6f7fb] px-3 py-2 text-sm text-[#0b1220]" value={front} onChange={(e) => setFront(e.target.value)} />
      <input aria-label="Card back" className="rounded-lg border border-[#e6e8f2] bg-[#f6f7fb] px-3 py-2 text-sm text-[#0b1220]" value={back} onChange={(e) => setBack(e.target.value)} />
      <Button size="sm" className="sm:col-span-2 w-fit" disabled={disabled} onClick={() => onSave(front, back)}>Save card</Button>
    </div>
  );
}

function SchedulePanel({
  appendix,
  disabled,
  onRegen,
}: {
  appendix: KitAppendix;
  disabled: boolean;
  onRegen: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#e6e8f2] bg-white p-5">
      <Button variant="secondary" disabled={disabled} onClick={onRegen}>Regenerate schedule</Button>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {appendix.schedule.days.map((d) => (
          <div key={d.day} className="rounded-xl bg-[#f6f7fb] p-3 text-sm">
            <div className="font-semibold">Day {d.day} · {formatDuration(d.minutes)}</div>
            <div className="text-[#67708f]">{d.focus}</div>
            <div className="text-[10px] text-[#a0a6c2] mt-1">{d.question_ids.join(", ")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
