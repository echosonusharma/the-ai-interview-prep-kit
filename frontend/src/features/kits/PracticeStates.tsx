"use client";

import Link from "next/link";
import { Flame, RotateCcw, Trophy, Zap } from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/Button";

export function DeckSkeleton() {
  return (
    <div className="mx-auto w-full max-w-xl animate-pulse space-y-4">
      <div className="h-4 w-24 rounded bg-[#e6e8f2]" />
      <div className="h-6 w-48 rounded bg-[#e6e8f2]" />
      <div className="h-2 rounded-full bg-[#eef0ff]" />
      <div className="min-h-[340px] rounded-3xl border border-[#e6e8f2] bg-white p-8">
        <div className="h-3 w-20 rounded bg-[#eef0ff]" />
        <div className="mx-auto mt-10 h-4 w-3/4 rounded bg-[#e6e8f2]" />
        <div className="mx-auto mt-3 h-4 w-1/2 rounded bg-[#e6e8f2]" />
      </div>
    </div>
  );
}

export function CompleteState({
  xp,
  bestStreak,
  accuracy,
  onRestart,
  restarting,
  kitId,
}: {
  xp: number;
  bestStreak: number;
  accuracy: number | null;
  onRestart: () => void;
  restarting: boolean;
  kitId: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#e6e8f2] bg-white p-8 text-center shadow-[0_20px_60px_-20px_rgba(255,126,176,0.5)]">
      <div aria-hidden className="dashboard-orb-a absolute -left-10 -top-10 h-36 w-36 rounded-full bg-[#ff7eb0]/30 blur-2xl" />
      <div aria-hidden className="dashboard-orb-b absolute -bottom-10 -right-10 h-36 w-36 rounded-full bg-[#5b5bf5]/30 blur-2xl" />
      <div className="relative">
        <div className="pop-in mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-[#ffb86a] to-[#ff7eb0] text-white shadow-lg">
          <Trophy size={30} aria-hidden />
        </div>
        <h2 className="mt-3 text-xl font-extrabold text-[#0b1220]">Deck cleared!</h2>
        <p className="mt-1 text-sm text-[#67708f]">Nice reps. Spaced repetition will resurface the tricky ones.</p>
        <div className="mx-auto mt-5 grid max-w-sm grid-cols-3 gap-2">
          <div className="rounded-2xl bg-[#f6f7fb] p-3">
            <div className="inline-flex items-center gap-1 text-lg font-extrabold text-[#0b1220]">
              <Zap size={16} className="text-[#d97706]" aria-hidden />{xp}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#a0a6c2]">XP</div>
          </div>
          <div className="rounded-2xl bg-[#f6f7fb] p-3">
            <div className="inline-flex items-center gap-1 text-lg font-extrabold text-[#0b1220]">
              <Flame size={16} className="text-[#c2410c]" aria-hidden />{bestStreak}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#a0a6c2]">Streak</div>
          </div>
          <div className="rounded-2xl bg-[#f6f7fb] p-3">
            <div className="text-lg font-extrabold text-[#0b1220]">{accuracy != null ? `${accuracy}%` : "-"}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#a0a6c2]">Ace rate</div>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button onClick={onRestart} disabled={restarting}>
            {restarting ? "Restarting…" : (<><RotateCcw size={14} aria-hidden /> Practice again</>)}
          </Button>
          <Link href={`/kits/${kitId}`} className={buttonStyles("secondary")}>
            Back to kit
          </Link>
        </div>
      </div>
    </div>
  );
}
