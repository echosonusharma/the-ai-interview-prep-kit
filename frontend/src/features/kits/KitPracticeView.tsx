"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleHelp,
  Crown,
  Flame,
  Frown,
  Laugh,
  Maximize,
  Meh,
  Minimize,
  RotateCcw,
  SkipForward,
  Smile,
  Sparkles,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import type { PracticeDeck } from "@/lib/types";
import { Button, buttonStyles } from "@/components/ui/Button";
import { CompleteState, DeckSkeleton } from "./PracticeStates";

const RATINGS = [
  { value: 1, label: "Again", Icon: Frown, hover: "hover:bg-[#fee2e2] hover:border-[#fca5a5]" },
  { value: 2, label: "Hard", Icon: Meh, hover: "hover:bg-[#ffedd5] hover:border-[#fdba74]" },
  { value: 3, label: "Good", Icon: Smile, hover: "hover:bg-[#eef0ff] hover:border-[#a5b4fc]" },
  { value: 4, label: "Easy", Icon: Laugh, hover: "hover:bg-[#dcfce7] hover:border-[#86efac]" },
  { value: 5, label: "Ace", Icon: Crown, hover: "hover:bg-[#d1fae5] hover:border-[#34d399]" },
] as const;

const LEVEL_SIZE = 100;

export function KitPracticeView({ kitId }: { kitId: string }) {
  const [deck, setDeck] = useState<PracticeDeck | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [entering, setEntering] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [mastered, setMastered] = useState(0);
  const [fumbled, setFumbled] = useState(0);
  const [xpPop, setXpPop] = useState<number | null>(null);
  const [restarting, setRestarting] = useState(false);
  const [runId, setRunId] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const popTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deckWrapRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    const data = await api.getPractice(kitId);
    setDeck(data);
    const startAt = Math.max(
      0,
      data.nextFlashcardId ? data.flashcards.findIndex((f) => f.id === data.nextFlashcardId) : 0
    );
    setIndex(startAt);
    setFlipped(false);
  }, [kitId]);

  // True local restart: fresh session from card 1 (server progress is kept —
  // there is no reset endpoint, so reviewed counts stay honest).
  const restart = useCallback(async () => {
    if (restarting) return;
    setRestarting(true);
    setError(null);
    try {
      const data = await api.getPractice(kitId);
      setDeck(data);
      setIndex(0);
      setFlipped(false);
      setXp(0);
      setStreak(0);
      setBestStreak(0);
      setMastered(0);
      setFumbled(0);
      setXpPop(null);
      setRunId((r) => r + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to restart");
    } finally {
      setRestarting(false);
    }
  }, [kitId, restarting]);

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [load]);

  const cards = deck?.flashcards ?? [];
  const card = cards[index] ?? null;
  const total = deck?.stats.total ?? 0;

  const level = Math.floor(xp / LEVEL_SIZE) + 1;
  const levelProgress = total === 0 ? 0 : (xp % LEVEL_SIZE) / LEVEL_SIZE;

  const progressFor = useCallback(
    (id: string) => deck?.progress.find((p) => p.flashcardId === id),
    [deck]
  );

  // Card-enter animation + reset flip on navigation
  useEffect(() => {
    setFlipped(false);
    setEntering(true);
    const t = setTimeout(() => setEntering(false), 340);
    return () => clearTimeout(t);
  }, [index, card?.id, runId]);

  const flip = useCallback(() => setFlipped((f) => !f), []);

  // Focus mode: fullscreen ONLY the deck wrapper — sidebar/topbar disappear,
  // just the card (+ rating controls) centered on screen.
  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await deckWrapRef.current?.requestFullscreen();
      }
    } catch {
      // Fullscreen unavailable (e.g. embedded iframe) — stay in normal view
    }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement != null);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(
    () => () => {
      if (popTimer.current) clearTimeout(popTimer.current);
    },
    []
  );

  const submitConfidence = useCallback(
    async (confidence: number) => {
      if (!card || busy) return;
      setBusy(true);
      try {
        const gain = confidence * 10 + (confidence >= 3 ? streak * 5 : 0);
        const next = await api.reviewFlashcard(kitId, card.id, confidence);
        setDeck(next);
        setXp((x) => x + gain);
        if (popTimer.current) clearTimeout(popTimer.current);
        setXpPop(gain);
        popTimer.current = setTimeout(() => setXpPop(null), 900);
        if (confidence >= 3) {
          const s = streak + 1;
          setStreak(s);
          setBestStreak((b) => Math.max(b, s));
        } else {
          setStreak(0);
        }
        if (confidence >= 4) setMastered((m) => m + 1);
        if (confidence <= 2) setFumbled((f) => f + 1);
        // Advance within the refreshed deck; server re-sorts by confidence
        const nextCards = next.flashcards;
        const posInNext = nextCards.findIndex((f) => f.id === card.id);
        const following = next.nextFlashcardId
          ? nextCards.findIndex((f) => f.id === next.nextFlashcardId)
          : posInNext + 1;
        setIndex(Math.min(Math.max(following, 0), Math.max(nextCards.length - 1, 0)));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save review");
      } finally {
        setBusy(false);
      }
    },
    [card, busy, kitId, streak]
  );

  const skip = useCallback(() => {
    if (!cards.length || busy) return;
    setIndex((i) => (i + 1) % cards.length);
  }, [cards.length, busy]);

  // Keyboard: Space/Enter flips, 1–5 rates, → skips.
  // Skips form fields AND anything already interactive (rating buttons, links,
  // the card itself which flips via its own handler) to avoid double-flips.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest('button, a, select, textarea, input, [contenteditable="true"], [role="button"]')) return;
      if (e.code === "Space" || e.key === "Enter") {
        if (card) {
          e.preventDefault();
          flip();
        }
      } else if (flipped && ["1", "2", "3", "4", "5"].includes(e.key)) {
        void submitConfidence(Number(e.key));
      } else if (e.key === "ArrowRight") {
        skip();
      } else if (e.key === "ArrowLeft") {
        setIndex((i) => (i - 1 + cards.length) % Math.max(cards.length, 1));
      } else if (e.key === "r" || e.key === "R") {
        void restart();
      } else if (e.key === "f" || e.key === "F") {
        void toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, flip, flipped, submitConfidence, skip, restart, toggleFullscreen, cards.length]);

  const sessionAccuracy = useMemo(() => {
    const done = mastered + fumbled;
    if (!done) return null;
    return Math.round((mastered / done) * 100);
  }, [mastered, fumbled]);

  const retry = useCallback(() => {
    setError(null);
    void load().catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [load]);

  if (!deck) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col space-y-5">
        {error ? (
          <div className="rounded-3xl border border-[#fecaca] bg-[#fef2f2] p-8 text-center">
            <p role="alert" className="text-sm font-semibold text-[#b91c1c]">
              {error}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button onClick={retry}>Try again</Button>
              <Link href={`/kits/${kitId}`} className={buttonStyles("secondary")}>
                Back to kit
              </Link>
            </div>
          </div>
        ) : (
          <DeckSkeleton />
        )}
      </div>
    );
  }

  const { stats } = deck;
  const done = !card || stats.reviewed >= stats.total;

  return (
    <div ref={deckWrapRef} className="deck-focus mx-auto flex w-full max-w-xl flex-col space-y-5">
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-semibold text-[#b91c1c]"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full hover:bg-[#fee2e2]"
          >
            ×
          </button>
        </div>
      )}
      {isFullscreen && (
        <button
          type="button"
          onClick={() => void toggleFullscreen()}
          title="Exit focus mode (Esc)"
          aria-label="Exit focus mode"
          className="deck-focus-float focus-ring fixed right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-[#e6e8f2] bg-white px-3.5 py-2 text-xs font-bold text-[#67708f] shadow-lg transition-all hover:text-[#0b1220]"
        >
          <Minimize size={14} aria-hidden /> Exit focus
        </button>
      )}
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href="/practice" className="text-xs font-semibold text-[#5b5bf5] hover:underline">
            ← Back to practice
          </Link>
          <h1 className="mt-1 text-xl font-extrabold tracking-tight text-[#0b1220]">Flashcard practice</h1>
          <p className="text-sm text-[#67708f]">
            {stats.reviewed}/{stats.total} reviewed · {stats.unseen} unseen
            {stats.averageConfidence != null && ` · avg ${stats.averageConfidence.toFixed(1)}/5`}
          </p>
          <Link
            href={`/kits/${kitId}`}
            className="focus-ring mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#e6e8f2] bg-white px-3 py-1 text-xs font-bold text-[#0b1220] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#a5b4fc] hover:text-[#4f46e5] hover:shadow-md"
          >
            View kit <ArrowRight size={12} aria-hidden />
          </Link>
        </div>
        {/* Streak flame */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            title={isFullscreen ? "Exit focus mode (F)" : "Focus mode — card only (F)"}
            aria-label={isFullscreen ? "Exit focus mode" : "Enter focus mode"}
            aria-pressed={isFullscreen}
            className="focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#e6e8f2] bg-white px-3 py-1.5 text-xs font-bold text-[#67708f] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#a5b4fc] hover:text-[#4f46e5] hover:shadow-md"
          >
            {isFullscreen ? <Minimize size={13} aria-hidden /> : <Maximize size={13} aria-hidden />}
            Focus mode
          </button>
          <div
            title="Answer 3+ to keep your streak"
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-extrabold transition-all ${
              streak >= 2
                ? "scale-105 border-[#fdba74] bg-[#fff7ed] text-[#c2410c]"
                : "border-[#e6e8f2] bg-white text-[#67708f]"
            }`}
          >
            <span className={streak >= 2 ? "animate-wave inline-block" : "inline-block"}>
              <Flame size={15} aria-hidden />
            </span>
            {streak}
          </div>
        </div>
      </div>

      {/* XP / level bar */}
      <div className="rounded-2xl border border-[#e6e8f2] bg-white p-3.5 shadow-sm">
        <div className="flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1 font-extrabold text-[#0b1220]">
            <Zap size={13} className="text-[#d97706]" aria-hidden /> {xp} XP
            <span className="ml-1 font-semibold text-[#a0a6c2]">· Lv {level}</span>
          </span>
          {streak >= 2 && (
            <span className="pop-in rounded-full bg-gradient-to-r from-[#ff7eb0] to-[#ffb86a] px-2 py-0.5 font-extrabold text-white">
              COMBO ×{streak}
            </span>
          )}
          <span className="font-semibold text-[#a0a6c2]">{LEVEL_SIZE - (xp % LEVEL_SIZE)} to Lv {level + 1}</span>
        </div>
        <div className="xp-sheen mt-2 h-2 overflow-hidden rounded-full bg-[#eef0ff]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#5b5bf5] via-[#8b5cf6] to-[#ff7eb0] transition-all duration-500"
            style={{ width: `${Math.round(levelProgress * 100)}%` }}
          />
        </div>
        {/* Kit progress */}
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#f1f2f9]">
          <div
            className="h-full rounded-full bg-[#0b1220] transition-all duration-500"
            style={{ width: `${stats.total ? (stats.reviewed / stats.total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {done ? (
        <CompleteState
          xp={xp}
          bestStreak={bestStreak}
          accuracy={sessionAccuracy}
          onRestart={() => void restart()}
          restarting={restarting}
          kitId={kitId}
        />
      ) : (
        card && (
          <>
            {/* Deck */}
            <div key={`${runId}-${card.id}`} className="[perspective:1400px] relative" aria-live="polite">
              {/* stacked ghost cards */}
              <div aria-hidden className="absolute inset-x-4 -bottom-2.5 top-4 rotate-[1.5deg] rounded-3xl border border-[#e6e8f2] bg-white/70" />
              <div aria-hidden className="absolute inset-x-2 -bottom-1.5 top-2 -rotate-[1deg] rounded-3xl border border-[#e6e8f2] bg-white/90" />

              <div
                role="button"
                tabIndex={0}
                aria-pressed={flipped}
                aria-label={flipped ? "Flashcard answer shown. Activate to hide." : "Flashcard question shown. Activate to reveal answer."}
                onClick={flip}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    flip();
                  }
                }}
                className={`focus-ring card-deal relative min-h-[340px] cursor-pointer select-none rounded-3xl border shadow-[0_20px_60px_-20px_rgba(91,91,245,0.45)] transition-all duration-300 focus:outline-none ${
                  flipped ? "border-[#5b5bf5] bg-white" : "border-[#e6e8f2] bg-white hover:-translate-y-0.5"
                } ${entering ? "translate-x-6 opacity-0" : "translate-x-0 opacity-100"}`}
                style={{ transformStyle: "preserve-3d" }}
              >
                <div
                  className="transition-transform duration-500"
                  style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)", transformStyle: "preserve-3d" }}
                >
                  {/* FRONT */}
                  <div className="flex min-h-[340px] flex-col p-6 sm:p-8" style={{ backfaceVisibility: "hidden" }}>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef0ff] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#5b5bf5]">
                        <CircleHelp size={12} aria-hidden /> Question
                      </span>
                      <span className="text-xs font-bold text-[#a0a6c2]">
                        {index + 1} / {total}
                      </span>
                    </div>
                    {(() => {
                      const p = progressFor(card.id);
                      const unseen = !p || p.attempts === 0;
                      return (
                        <span
                          className={`mt-3 inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                            unseen
                              ? "border-dashed border-[#d6d9eb] text-[#8a8fa8]"
                              : (p?.confidence ?? 0) >= 4
                                ? "border-[#86efac] bg-[#f0fdf4] text-[#15803d]"
                                : (p?.confidence ?? 0) >= 3
                                  ? "border-[#a5b4fc] bg-[#eef0ff] text-[#4f46e5]"
                                  : "border-[#fdba74] bg-[#fff7ed] text-[#c2410c]"
                          }`}
                        >
                          {unseen ? (
                            <>
                              <Sparkles size={11} aria-hidden /> NEW — worth +50 XP
                            </>
                          ) : (
                            `Last: ${p?.confidence}/5 · seen ${p?.attempts}×`
                          )}
                        </span>
                      );
                    })()}
                    <p className="flex flex-1 items-center py-6 text-center text-lg font-bold leading-snug text-[#0b1220] sm:text-xl">
                      <span className="w-full">{card.front}</span>
                    </p>
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#a0a6c2]">
                        Tap card or press Space to flip <RotateCcw size={11} aria-hidden />
                      </span>
                      <span
                        aria-hidden
                        className="inline-flex items-center justify-center gap-2 font-semibold tracking-tight rounded-full transition-colors px-3.5 py-1.5 text-xs bg-[#0b1220] text-white shadow-sm"
                      >
                        Reveal answer
                      </span>
                    </div>
                  </div>

                  {/* BACK */}
                  <div
                    className="absolute inset-0 flex min-h-[340px] flex-col rounded-3xl bg-gradient-to-b from-[#0b1220] to-[#232a5a] p-6 text-white sm:p-8"
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white">
                        <Check size={12} strokeWidth={3} aria-hidden /> Answer
                      </span>
                      <span className="text-xs font-bold text-white/60">Tap to flip back</span>
                    </div>
                    <p className="flex flex-1 items-center overflow-y-auto py-6 text-center text-[15px] leading-relaxed text-white/95">
                      <span className="w-full">{card.back}</span>
                    </p>
                    <p className="text-center text-xs font-bold uppercase tracking-widest text-white/60">
                      How well did you know it?
                    </p>
                  </div>
                </div>

                {/* XP pop */}
                {xpPop != null && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -top-3 right-6 animate-bounce rounded-full bg-gradient-to-r from-[#ff7eb0] to-[#ffb86a] px-3 py-1 text-xs font-extrabold text-white shadow-lg"
                  >
                    +{xpPop} XP
                  </span>
                )}
              </div>
            </div>

            {/* Rating / controls */}
            {flipped ? (
              <div className="fade-up rounded-2xl border border-[#e6e8f2] bg-white p-4 shadow-sm">
                <div className="grid grid-cols-5 gap-2" role="group" aria-label="Rate your confidence">
                  {RATINGS.map(({ value, label, Icon, hover }) => (
                    <button
                      key={value}
                      type="button"
                      disabled={busy}
                      onClick={() => void submitConfidence(value)}
                      title={`${label} (${value})`}
                      className={`focus-ring flex flex-col items-center gap-0.5 rounded-xl border border-[#e6e8f2] bg-white px-1 py-2.5 text-xs font-bold text-[#0b1220] transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 ${hover}`}
                    >
                      <Icon size={18} aria-hidden />
                      <span>{value}</span>
                      <span className="text-[10px] font-semibold text-[#8a8fa8]">{label}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-center text-[11px] font-semibold text-[#a0a6c2]">
                  Keys 1–5 to rate · <span className="text-[#5b5bf5]">3+ keeps your streak alive</span>
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <Button variant="secondary" size="sm" onClick={skip} disabled={busy}>
                  <SkipForward size={13} aria-hidden /> Skip
                </Button>
                <span className="text-[11px] font-semibold text-[#a0a6c2]">← → browse · Space flip</span>
                <button
                  type="button"
                  onClick={() => void restart()}
                  disabled={restarting || busy}
                  title="Restart session from card 1 (R)"
                  className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-[#e6e8f2] bg-white px-3.5 py-1.5 text-xs font-bold text-[#67708f] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#a5b4fc] hover:text-[#4f46e5] hover:shadow-md active:translate-y-0 disabled:opacity-50"
                >
                  <span aria-hidden className={`inline-block ${restarting ? "animate-spin" : ""}`}>
                    <RotateCcw size={13} />
                  </span>
                  {restarting ? "Restarting…" : "Restart"}
                </button>
              </div>
            )}

            {/* Session chips */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="inline-flex items-center gap-1 rounded-full border border-[#86efac] bg-[#f0fdf4] px-2.5 py-1 text-[#15803d]">
                <Check size={12} strokeWidth={3} aria-hidden /> Mastered {mastered}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#fdba74] bg-[#fff7ed] px-2.5 py-1 text-[#c2410c]">
                <TriangleAlert size={12} aria-hidden /> Tricky {fumbled}
              </span>
              {bestStreak >= 2 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#f9a8d4] bg-[#fdf2f8] px-2.5 py-1 text-[#be185d]">
                  <Flame size={12} aria-hidden /> Best ×{bestStreak}
                </span>
              )}
            </div>
          </>
        )
      )}
    </div>
  );
}
