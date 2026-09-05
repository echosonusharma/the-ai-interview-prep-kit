"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { formatDuration } from "@/lib/format";
import type { KitAppendix, KitDetail } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { FieldSelect } from "@/components/ui/Select";
import { LIMITS, textError } from "@/lib/validate";

const CATEGORIES = ["technical", "behavioural", "system-design", "company-fit"] as const;

type BuilderTab = "brief" | "questions" | "flashcards" | "schedule";
const BUILDER_TABS: readonly BuilderTab[] = ["brief", "questions", "flashcards", "schedule"];

/** Read the ?tab= param when it names a real tab, else fall back. */
function initialBuilderTab(): BuilderTab {
  if (typeof window === "undefined") return "brief";
  const t = new URLSearchParams(window.location.search).get("tab");
  return (BUILDER_TABS as readonly string[]).includes(t ?? "") ? (t as BuilderTab) : "brief";
}

const DIFFICULTY_OPTIONS = [
  { value: "1", label: "Easy" },
  { value: "2", label: "Medium" },
  { value: "3", label: "Hard" },
];

export function KitBuilderView({ kitId }: { kitId: string }) {
  const [kit, setKit] = useState<KitDetail | null>(null);
  const [tab, setTab] = useState<BuilderTab>(() => initialBuilderTab());

  // Deep-link tabs: ?tab=flashcards. replaceState avoids navigation.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("tab") !== tab) {
      url.searchParams.set("tab", tab);
      window.history.replaceState(null, "", url);
    }
  }, [tab]);
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
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [whatError, setWhatError] = useState<string | null>(null);

  useEffect(() => {
    setSummary(appendix.company_brief.summary);
    setWhat(appendix.company_brief.what_they_do);
  }, [appendix.company_brief.summary, appendix.company_brief.what_they_do]);

  const trySave = () => {
    // Summary required (backend rejects blank); what-they-do optional, max only.
    const summaryErr = textError(summary, "Summary", LIMITS.summary);
    const whatErr = what.trim() ? textError(what, "What they do", LIMITS.whatTheyDo) : null;
    setSummaryError(summaryErr);
    setWhatError(whatErr);
    if (summaryErr || whatErr) return;
    void onSave(summary.trim(), what.trim());
  };

  return (
    <div className="rounded-2xl border border-[#e6e8f2] bg-white p-5 space-y-3">
      <div>
        <textarea
          aria-label="Company summary"
          aria-invalid={!!summaryError}
          className={`w-full rounded-xl border bg-[#f6f7fb] px-3 py-2 text-sm text-[#0b1220] placeholder:text-[#a0a6c2] min-h-[100px] ${summaryError ? "border-[#f87171]" : "border-[#e6e8f2]"}`}
          value={summary}
          onChange={(e) => {
            setSummary(e.target.value);
            if (summaryError) setSummaryError(null);
          }}
        />
        {summaryError && <p role="alert" className="mt-1 text-[11px] font-medium text-[#b91c1c]">{summaryError}</p>}
      </div>
      <div>
        <textarea
          aria-label="What they do"
          aria-invalid={!!whatError}
          className={`w-full rounded-xl border bg-[#f6f7fb] px-3 py-2 text-sm text-[#0b1220] placeholder:text-[#a0a6c2] min-h-[80px] ${whatError ? "border-[#f87171]" : "border-[#e6e8f2]"}`}
          value={what}
          onChange={(e) => {
            setWhat(e.target.value);
            if (whatError) setWhatError(null);
          }}
        />
        {whatError && <p role="alert" className="mt-1 text-[11px] font-medium text-[#b91c1c]">{whatError}</p>}
      </div>
      <div className="flex gap-2">
        <Button disabled={disabled} onClick={trySave}>Save brief</Button>
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
  const [showAdd, setShowAdd] = useState(false);
  const [newPrompt, setNewPrompt] = useState("");
  const [newOutline, setNewOutline] = useState("");
  const [newDifficulty, setNewDifficulty] = useState("2");
  const [addErrors, setAddErrors] = useState<{ prompt?: string; outline?: string }>({});

  const saveQ = async (qid: string, patch: { prompt?: string; answer_outline?: string }) => {
    setSaveError(null);
    try {
      await api.patchQuestion(kitId, qid, { ...patch, pinned: true });
      await onUpdate();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save question");
    }
  };

  const addQ = async () => {
    const promptErr = textError(newPrompt, "Question", LIMITS.prompt);
    const outlineErr = textError(newOutline, "Answer outline", LIMITS.answerOutline);
    setAddErrors({
      ...(promptErr ? { prompt: promptErr } : {}),
      ...(outlineErr ? { outline: outlineErr } : {}),
    });
    if (promptErr || outlineErr) return;
    setSaveError(null);
    try {
      await api.addQuestion(kitId, {
        prompt: newPrompt.trim(),
        answer_outline: newOutline.trim(),
        difficulty: Number(newDifficulty) as 1 | 2 | 3,
        category,
        requirement_ids: [],
      });
      setNewPrompt("");
      setNewOutline("");
      setNewDifficulty("2");
      setAddErrors({});
      setShowAdd(false);
      await onUpdate();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to add question");
    }
  };

  const deleteQ = async (qid: string) => {
    setSaveError(null);
    try {
      await api.deleteQuestion(kitId, qid);
      await onUpdate();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to delete question");
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
        <Button size="sm" disabled={disabled} onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? "Cancel" : "+ Add question"}
        </Button>
      </div>
      {saveError && (
        <p role="alert" className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-xs font-semibold text-[#b91c1c]">
          {saveError}
        </p>
      )}
      {showAdd && (
        <div className="rounded-2xl border-2 border-dashed border-[#c4b5fd]/60 bg-[#fafbff] p-4 space-y-2">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-[#5b5bf5] uppercase">
            New {category} question
          </p>
          <input
            aria-label="New question prompt"
            placeholder="Question prompt…"
            aria-invalid={!!addErrors.prompt}
            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm font-medium text-[#0b1220] placeholder:text-[#a0a6c2] ${addErrors.prompt ? "border-[#f87171]" : "border-[#e6e8f2]"}`}
            value={newPrompt}
            onChange={(e) => {
              setNewPrompt(e.target.value);
              if (addErrors.prompt) setAddErrors((p) => ({ ...p, prompt: undefined }));
            }}
            disabled={disabled}
          />
          {addErrors.prompt && <p role="alert" className="text-[11px] font-medium text-[#b91c1c]">{addErrors.prompt}</p>}
          <textarea
            aria-label="New answer outline"
            placeholder="Answer outline…"
            rows={3}
            aria-invalid={!!addErrors.outline}
            className={`w-full resize-y rounded-lg border bg-white px-3 py-2 text-sm leading-relaxed text-[#0b1220] placeholder:text-[#a0a6c2] ${addErrors.outline ? "border-[#f87171]" : "border-[#e6e8f2]"}`}
            value={newOutline}
            onChange={(e) => {
              setNewOutline(e.target.value);
              if (addErrors.outline) setAddErrors((p) => ({ ...p, outline: undefined }));
            }}
            disabled={disabled}
          />
          {addErrors.outline && <p role="alert" className="text-[11px] font-medium text-[#b91c1c]">{addErrors.outline}</p>}
          <div className="flex flex-col sm:flex-row gap-2">
            <FieldSelect
              label="Difficulty"
              value={newDifficulty}
              onChange={setNewDifficulty}
              options={DIFFICULTY_OPTIONS}
              disabled={disabled}
              className="sm:w-48"
            />
            <Button size="sm" disabled={disabled} onClick={() => void addQ()}>
              Add question
            </Button>
          </div>
        </div>
      )}
      {filtered.length === 0 && !showAdd ? (
        <p className="rounded-2xl border border-dashed border-[#d6d9eb] bg-white p-6 text-center text-sm text-[#67708f]">
          No {category} questions yet. Regenerate the category to create some.
        </p>
      ) : (
        filtered.map((q) => (
          <QuestionCard key={q.id} q={q} disabled={disabled} onSave={(p) => saveQ(q.id, p)} onDelete={() => deleteQ(q.id)} />
        ))
      )}
    </div>
  );
}

function QuestionCard({
  q,
  disabled,
  onSave,
  onDelete,
}: {
  q: KitAppendix["questions"][0];
  disabled: boolean;
  onSave: (p: { prompt?: string; answer_outline?: string }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [prompt, setPrompt] = useState(q.prompt);
  const [outline, setOutline] = useState(q.answer_outline);
  const [confirming, setConfirming] = useState(false);
  const [errors, setErrors] = useState<{ prompt?: string; outline?: string }>({});

  useEffect(() => {
    setPrompt(q.prompt);
    setOutline(q.answer_outline);
  }, [q.id, q.prompt, q.answer_outline]);

  const trySave = () => {
    const next = {
      prompt: textError(prompt, "Question", LIMITS.prompt),
      outline: textError(outline, "Answer outline", LIMITS.answerOutline),
    };
    setErrors({
      ...(next.prompt ? { prompt: next.prompt } : {}),
      ...(next.outline ? { outline: next.outline } : {}),
    });
    if (next.prompt || next.outline) return;
    void onSave({ prompt: prompt.trim(), answer_outline: outline.trim() });
  };

  return (
    <div className="rounded-2xl border border-[#e6e8f2] bg-white p-4 space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-[#a0a6c2]">{q.difficulty === 1 ? "Easy" : q.difficulty === 3 ? "Hard" : "Medium"}</div>
      <div>
        <input
          aria-label="Question prompt"
          aria-invalid={!!errors.prompt}
          className={`w-full rounded-lg border px-3 py-2 text-sm font-medium text-[#0b1220] ${errors.prompt ? "border-[#f87171] bg-[#fef2f2]" : "border-[#e6e8f2] bg-[#f6f7fb]"}`}
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            if (errors.prompt) setErrors((p) => ({ ...p, prompt: undefined }));
          }}
        />
        {errors.prompt && <p role="alert" className="mt-1 text-[11px] font-medium text-[#b91c1c]">{errors.prompt}</p>}
      </div>
      <div>
        <textarea
          aria-label="Answer outline"
          aria-invalid={!!errors.outline}
          className={`w-full rounded-lg border px-3 py-2 text-sm text-[#0b1220] min-h-[72px] ${errors.outline ? "border-[#f87171] bg-[#fef2f2]" : "border-[#e6e8f2] bg-[#f6f7fb]"}`}
          value={outline}
          onChange={(e) => {
            setOutline(e.target.value);
            if (errors.outline) setErrors((p) => ({ ...p, outline: undefined }));
          }}
        />
        {errors.outline && <p role="alert" className="mt-1 text-[11px] font-medium text-[#b91c1c]">{errors.outline}</p>}
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled={disabled} onClick={trySave}>Save</Button>
        {confirming ? (
          <>
            <Button size="sm" variant="secondary" disabled={disabled} onClick={() => void onDelete()}>
              Confirm delete
            </Button>
            <Button size="sm" variant="secondary" disabled={disabled} onClick={() => setConfirming(false)}>
              Keep
            </Button>
          </>
        ) : (
          <Button size="sm" variant="secondary" disabled={disabled} onClick={() => setConfirming(true)}>
            Delete
          </Button>
        )}
      </div>
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
  const [showAdd, setShowAdd] = useState(false);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [addErrors, setAddErrors] = useState<{ front?: string; back?: string }>({});

  const addCard = async () => {
    const frontErr = textError(newFront, "Question", LIMITS.front);
    const backErr = textError(newBack, "Answer", LIMITS.back);
    setAddErrors({
      ...(frontErr ? { front: frontErr } : {}),
      ...(backErr ? { back: backErr } : {}),
    });
    if (frontErr || backErr) return;
    setSaveError(null);
    try {
      await api.addFlashcard(kitId, {
        front: newFront.trim(),
        back: newBack.trim(),
        requirement_ids: [],
      });
      setNewFront("");
      setNewBack("");
      setAddErrors({});
      setShowAdd(false);
      await onUpdate();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to add card");
    }
  };

  const deleteCard = async (fid: string) => {
    setSaveError(null);
    try {
      await api.deleteFlashcard(kitId, fid);
      await onUpdate();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to delete card");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#0b1220]">
          {appendix.flashcards.length} card{appendix.flashcards.length === 1 ? "" : "s"}
        </p>
        <Button size="sm" disabled={disabled} onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? "Cancel" : "+ Add card"}
        </Button>
      </div>
      {showAdd && (
        <div className="rounded-2xl border-2 border-dashed border-[#c4b5fd]/60 bg-[#fafbff] p-4 space-y-2">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-[#5b5bf5] uppercase">
            New card
          </p>
          <div>
            <p className="mb-1 text-[11px] font-semibold tracking-[0.12em] text-[#a0a6c2] uppercase">
              Question
            </p>
            <input
              aria-label="New card front"
              placeholder="Question…"
              aria-invalid={!!addErrors.front}
              className={`w-full rounded-lg border bg-white px-3 py-2 text-sm font-medium text-[#0b1220] placeholder:text-[#a0a6c2] ${addErrors.front ? "border-[#f87171]" : "border-[#e6e8f2]"}`}
              value={newFront}
              onChange={(e) => {
                setNewFront(e.target.value);
                if (addErrors.front) setAddErrors((p) => ({ ...p, front: undefined }));
              }}
              disabled={disabled}
            />
            {addErrors.front && <p role="alert" className="mt-1 text-[11px] font-medium text-[#b91c1c]">{addErrors.front}</p>}
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold tracking-[0.12em] text-[#a0a6c2] uppercase">
              Answer
            </p>
            <textarea
              aria-label="New card back"
              placeholder="Answer…"
              rows={3}
              aria-invalid={!!addErrors.back}
              className={`w-full resize-y rounded-lg border bg-white px-3 py-2 text-sm leading-relaxed text-[#0b1220] placeholder:text-[#a0a6c2] ${addErrors.back ? "border-[#f87171]" : "border-[#e6e8f2]"}`}
              value={newBack}
              onChange={(e) => {
                setNewBack(e.target.value);
                if (addErrors.back) setAddErrors((p) => ({ ...p, back: undefined }));
              }}
              disabled={disabled}
            />
            {addErrors.back && <p role="alert" className="mt-1 text-[11px] font-medium text-[#b91c1c]">{addErrors.back}</p>}
          </div>
          <Button size="sm" disabled={disabled} onClick={() => void addCard()}>
            Add card
          </Button>
        </div>
      )}
      {saveError && (
        <p role="alert" className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-xs font-semibold text-[#b91c1c]">
          {saveError}
        </p>
      )}
      {appendix.flashcards.map((f) => (
        <FlashcardCard key={f.id} f={f} disabled={disabled} onDelete={() => deleteCard(f.id)} onSave={async (front, back) => {
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
  onDelete,
}: {
  f: KitAppendix["flashcards"][0];
  disabled: boolean;
  onSave: (front: string, back: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [front, setFront] = useState(f.front);
  const [back, setBack] = useState(f.back);
  const [confirming, setConfirming] = useState(false);
  const [errors, setErrors] = useState<{ front?: string; back?: string }>({});

  useEffect(() => {
    setFront(f.front);
    setBack(f.back);
  }, [f.id, f.front, f.back]);

  const trySave = () => {
    const next = {
      front: textError(front, "Question", LIMITS.front),
      back: textError(back, "Answer", LIMITS.back),
    };
    setErrors({
      ...(next.front ? { front: next.front } : {}),
      ...(next.back ? { back: next.back } : {}),
    });
    if (next.front || next.back) return;
    void onSave(front.trim(), back.trim());
  };

  return (
    <div className="rounded-2xl border border-[#e6e8f2] bg-white p-4 space-y-2">
      <div>
        <p className="mb-1 text-[11px] font-semibold tracking-[0.12em] text-[#a0a6c2] uppercase">
          Question
        </p>
        <input
          aria-label="Card front"
          aria-invalid={!!errors.front}
          className={`w-full rounded-lg border px-3 py-2 text-sm font-medium text-[#0b1220] ${errors.front ? "border-[#f87171] bg-[#fef2f2]" : "border-[#e6e8f2] bg-[#f6f7fb]"}`}
          value={front}
          onChange={(e) => {
            setFront(e.target.value);
            if (errors.front) setErrors((p) => ({ ...p, front: undefined }));
          }}
        />
        {errors.front && <p role="alert" className="mt-1 text-[11px] font-medium text-[#b91c1c]">{errors.front}</p>}
      </div>
      <div>
        <p className="mb-1 text-[11px] font-semibold tracking-[0.12em] text-[#a0a6c2] uppercase">
          Answer
        </p>
        <textarea
          aria-label="Card back"
          rows={3}
          aria-invalid={!!errors.back}
          className={`w-full resize-y rounded-lg border px-3 py-2 text-sm leading-relaxed text-[#0b1220] ${errors.back ? "border-[#f87171] bg-[#fef2f2]" : "border-[#e6e8f2] bg-[#f6f7fb]"}`}
          value={back}
          onChange={(e) => {
            setBack(e.target.value);
            if (errors.back) setErrors((p) => ({ ...p, back: undefined }));
          }}
        />
        {errors.back && <p role="alert" className="mt-1 text-[11px] font-medium text-[#b91c1c]">{errors.back}</p>}
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="w-fit" disabled={disabled} onClick={trySave}>Save card</Button>
        {confirming ? (
          <>
            <Button size="sm" variant="secondary" disabled={disabled} onClick={() => void onDelete()}>
              Confirm delete
            </Button>
            <Button size="sm" variant="secondary" disabled={disabled} onClick={() => setConfirming(false)}>
              Keep
            </Button>
          </>
        ) : (
          <Button size="sm" variant="secondary" disabled={disabled} onClick={() => setConfirming(true)}>
            Delete
          </Button>
        )}
      </div>
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
          </div>
        ))}
      </div>
    </div>
  );
}
