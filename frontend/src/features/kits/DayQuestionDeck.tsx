"use client";

import { useState } from "react";
import type { KitAppendix } from "@/lib/types";
import { DIFFICULTY_LABELS } from "@/lib/kits";

export function DayQuestionDeck({
  questions,
}: {
  questions: KitAppendix["questions"][number][];
}) {
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const total = questions.length;
  if (total === 0) return null;
  const q = questions[index % total];
  if (!q) return null;

  const go = (dir: 1 | -1) => {
    setIndex((i) => (i + dir + total) % total);
    setShowAnswer(false);
  };

  return (
    <div
      className="flex h-[400px] flex-col"
      role="group"
      aria-roledescription="carousel"
      aria-label="Day questions"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#a0a6c2] tabular-nums">
          Question {index + 1} of {total}
        </p>
        <div className="flex gap-1" aria-hidden>
          {questions.map((item, i) => (
            <span
              key={item.id}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-[#5b5bf5]" : "w-1.5 bg-[#e6e8f2]"
              }`}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        key={q.id}
        onClick={() => setShowAnswer((v) => !v)}
        aria-expanded={showAnswer}
        className="fade-up mt-2 max-h-[320px] w-full flex-none overflow-y-auto rounded-2xl border border-[#e6e8f2] bg-[#fafbff] p-4 text-left transition-colors hover:border-[#c4b5fd] hover:bg-white"
      >
        <span aria-live="polite" className="text-sm font-medium leading-relaxed text-[#0b1220]">
          {q.prompt}
        </span>
        <span className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-[#eef0ff] px-2 py-0.5 text-[10px] font-bold text-[#4f46e5] capitalize">
            {q.category.replace(/-/g, " ")}
          </span>
          <span className="text-[10px] font-semibold text-[#a0a6c2]">
            {DIFFICULTY_LABELS[q.difficulty] ?? ""}
          </span>
        </span>
        {showAnswer ? (
          <span className="mt-3 block rounded-xl border border-[#e6e8f2] bg-white p-3">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-[#a0a6c2]">
              Answer outline
            </span>
            <span className="mt-1.5 block whitespace-pre-wrap text-[13px] leading-relaxed text-[#67708f]">
              {q.answer_outline}
            </span>
            <span className="mt-2 block text-[11px] font-bold text-[#5b5bf5]">
              Tap to hide −
            </span>
          </span>
        ) : (
          <span className="mt-3 block text-[11px] font-bold text-[#5b5bf5]">
            Tap to reveal answer outline +
          </span>
        )}
      </button>

      {total > 1 && (
        <div className="mt-auto flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous question"
            className="rounded-full border border-[#e6e8f2] bg-white px-4 py-1.5 text-xs font-bold text-[#67708f] transition-all hover:border-[#c4b5fd] hover:text-[#0b1220]"
          >
            ‹ Prev
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next question"
            className="rounded-full bg-[#0b1220] px-4 py-1.5 text-xs font-bold text-white transition-all hover:-translate-y-px hover:shadow-md"
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}
