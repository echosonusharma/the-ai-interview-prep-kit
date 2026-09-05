"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DayButtonProps } from "react-day-picker";
import "react-day-picker/style.css";
import type { KitAppendix, KitRequirement } from "@/lib/types";
import { api } from "@/lib/api";
import { formatDuration, cleanFocus } from "@/lib/format";
import { LIMITS, textError } from "@/lib/validate";
import { DIFFICULTY_LABELS } from "@/lib/kits";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonStyles } from "@/components/ui/Button";
import { FieldSelect } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { DayQuestionDeck } from "./DayQuestionDeck";

type TabId = "overview" | "requirements" | "questions" | "schedule" | "flashcards";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "requirements", label: "Requirements" },
  { id: "questions", label: "Questions" },
  { id: "schedule", label: "Schedule" },
  { id: "flashcards", label: "Flashcards" },
];

/** Read the ?tab= param when it names a real tab, else fall back. */
function initialTab<T extends string>(tabs: readonly { id: T }[], fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const t = new URLSearchParams(window.location.search).get("tab");
  return tabs.some((x) => x.id === t) ? (t as T) : fallback;
}

const CATEGORY_ACCENT: Record<string, string> = {
  technical: "bg-[#5b5bf5]",
  behavioural: "bg-[#ff7eb0]",
  "system-design": "bg-[#f59e0b]",
  "company-fit": "bg-[#10b981]",
};

const KIND_OPTIONS = [
  { value: "technical", label: "Technical" },
  { value: "behavioural", label: "Behavioural" },
  { value: "domain", label: "Domain" },
];

const PRIORITY_OPTIONS = [
  { value: "must", label: "Must-have" },
  { value: "nice", label: "Nice-to-have" },
];

export function KitDetailContent({
  appendix,
  kitId,
  createdAt,
  onChanged,
}: {
  appendix: KitAppendix;
  kitId: string;
  createdAt: string;
  onChanged: () => Promise<void>;
}) {
  const [tab, setTab] = useState<TabId>(() => initialTab(TABS, "overview"));

  // Deep-link tabs: ?tab=questions. replaceState avoids navigation + Suspense needs.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("tab") !== tab) {
      url.searchParams.set("tab", tab);
      window.history.replaceState(null, "", url);
    }
  }, [tab]);

  useEffect(() => {
    const onPop = () => {
      const next = initialTab(TABS, "overview");
      setTab(next);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const [reqFilter, setReqFilter] = useState<"all" | "must" | "nice">("all");
  const [reqSearch, setReqSearch] = useState("");
  const [showAddReq, setShowAddReq] = useState(false);
  const [reqBusy, setReqBusy] = useState(false);
  const [reqError, setReqError] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [qDifficulty, setQDifficulty] = useState<"all" | 1 | 2 | 3>("all");

  const runReqOp = async (fn: () => Promise<unknown>) => {
    setReqBusy(true);
    setReqError(null);
    try {
      await fn();
      await onChanged();
    } catch (e) {
      setReqError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setReqBusy(false);
    }
  };

  const uncovered = useMemo(
    () => new Set(appendix.coverage.uncovered_requirement_ids),
    [appendix.coverage.uncovered_requirement_ids],
  );

  const mustReqs = useMemo(
    () => appendix.role.requirements.filter((r) => r.priority === "must"),
    [appendix.role.requirements],
  );
  const niceReqs = useMemo(
    () => appendix.role.requirements.filter((r) => r.priority === "nice"),
    [appendix.role.requirements],
  );

  const filteredRequirements = useMemo(() => {
    let list = appendix.role.requirements;
    if (reqFilter !== "all") {
      list = list.filter((r) => r.priority === reqFilter);
    }
    const q = reqSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => r.text.toLowerCase().includes(q) || r.id.toLowerCase().includes(q));
    }
    return list;
  }, [appendix.role.requirements, reqFilter, reqSearch]);

  const visibleMust = useMemo(
    () => filteredRequirements.filter((r) => r.priority === "must"),
    [filteredRequirements],
  );
  const visibleNice = useMemo(
    () => filteredRequirements.filter((r) => r.priority === "nice"),
    [filteredRequirements],
  );

  const questionsByCategory = useMemo(() => {
    const groups = new Map<string, typeof appendix.questions>();
    for (const q of appendix.questions) {
      if (qDifficulty !== "all" && q.difficulty !== qDifficulty) continue;
      const arr = groups.get(q.category) ?? [];
      arr.push(q);
      groups.set(q.category, arr);
    }
    return [...groups.entries()];
  }, [appendix.questions, qDifficulty]);

  const difficultyCounts = useMemo(() => {
    const counts: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
    for (const q of appendix.questions) {
      if (q.difficulty === 1 || q.difficulty === 2 || q.difficulty === 3) counts[q.difficulty] += 1;
    }
    return counts;
  }, [appendix.questions]);

  const questionById = useMemo(
    () => new Map(appendix.questions.map((q) => [q.id, q])),
    [appendix.questions],
  );

  const totalMinutes = appendix.schedule.days.reduce((s, d) => s + d.minutes, 0);
  const counts: Record<TabId, number | null> = {
    overview: null,
    requirements: appendix.role.requirements.length,
    questions: appendix.questions.length,
    schedule: appendix.schedule.days.length,
    flashcards: appendix.flashcards.length,
  };

  return (
    <div className="space-y-5">
      {/* Top sub-tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <nav
          role="tablist"
          aria-label="Kit sections"
          className="flex gap-1 overflow-x-auto no-scrollbar rounded-full bg-[#f1f2f9] p-1"
          onKeyDown={(e) => {
            if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
            e.preventDefault();
            const i = TABS.findIndex((t) => t.id === tab);
            const next =
              e.key === "ArrowRight"
                ? TABS[(i + 1) % TABS.length]!
                : e.key === "ArrowLeft"
                  ? TABS[(i - 1 + TABS.length) % TABS.length]!
                  : e.key === "Home"
                    ? TABS[0]!
                    : TABS[TABS.length - 1]!;
            setTab(next.id);
            document.getElementById(`kit-tab-${next.id}`)?.focus();
          }}
        >
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                id={`kit-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls="kit-tabpanel"
                tabIndex={active ? 0 : -1}
                onClick={() => setTab(t.id)}
                className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  active
                    ? "bg-white text-[#0b1220] shadow-sm"
                    : "text-[#8a8fa8] hover:text-[#0b1220]"
                }`}
              >
                <span>{t.label}</span>
                {counts[t.id] != null && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                      active ? "bg-[#eef0ff] text-[#4f46e5]" : "bg-white text-[#a0a6c2]"
                    }`}
                  >
                    {counts[t.id]}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <Link href={`/kits/${kitId}/practice`} className={`ml-auto ${buttonStyles("primary", "sm")}`}>
          Start practice
        </Link>
      </div>

      {/* Main panel */}
      <div id="kit-tabpanel" role="tabpanel" aria-labelledby={`kit-tab-${tab}`} className="min-w-0">
        {tab === "overview" && (
          <div className="space-y-5">
            <Card className="overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-[#6d5cff] via-[#ff7eb0] to-[#ffcc6a]" />
              <div className="p-6 lg:p-8">
                <Eyebrow>Company brief</Eyebrow>
                <p className="mt-3 text-[17px] text-[#0b1220] leading-relaxed font-medium text-pretty">
                  {appendix.company_brief.summary}
                </p>
                <p className="mt-3 text-sm text-[#67708f] leading-relaxed text-pretty">
                  {appendix.company_brief.what_they_do}
                </p>
                {appendix.company_brief.sources.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-[#e6e8f2]">
                    <p className="text-[11px] font-semibold tracking-[0.12em] text-[#a0a6c2] uppercase">
                      Sources · {appendix.company_brief.sources.length}
                    </p>
                    <ol className="mt-3 space-y-1.5">
                      {appendix.company_brief.sources.map((src, i) => (
                        <li key={`${src}-${i}`}>
                          <a
                            href={src}
                            target="_blank"
                            rel="noreferrer"
                            title={src}
                            className="group flex min-w-0 items-start gap-2.5 rounded-xl border border-[#e6e8f2] bg-[#f6f7fb] px-3 py-2 transition-colors hover:border-[#c4b5fd] hover:bg-[#eef0ff]"
                          >
                            <span className="mt-0.5 shrink-0 rounded-md bg-[#eef0ff] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[#4f46e5] group-hover:bg-white">
                              {i + 1}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-semibold text-[#0b1220]">
                                {domainOf(src)}
                              </span>
                              <span className="block break-all text-[11px] leading-relaxed text-[#67708f]">
                                {pathOf(src)}
                              </span>
                            </span>
                            <svg
                              aria-hidden
                              className="mt-1 h-3.5 w-3.5 shrink-0 text-[#a0a6c2] group-hover:text-[#4f46e5]"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                          </a>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </Card>

            {appendix.role.responsibilities.length > 0 && (
              <Card className="p-6 lg:p-8">
                <Eyebrow>Key responsibilities</Eyebrow>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {appendix.role.responsibilities.map((item, i) => (
                    <li
                      key={i}
                      className="flex gap-3 rounded-xl bg-[#f6f7fb] border border-[#e6e8f2] px-4 py-3 text-sm text-[#0b1220]"
                    >
                      <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#eef0ff] text-[10px] font-bold text-[#5b5bf5]">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <MiniStatCard
                title="Interview questions"
                value={appendix.questions.length}
                hint="Across all categories"
                onClick={() => setTab("questions")}
              />
              <MiniStatCard
                title="Study schedule"
                value={`${appendix.schedule.days.length} days`}
                hint={`${formatDuration(totalMinutes)} total`}
                onClick={() => setTab("schedule")}
              />
              <MiniStatCard
                title="Flashcards"
                value={appendix.flashcards.length}
                hint="Spaced repetition deck"
                onClick={() => setTab("flashcards")}
              />
            </div>
          </div>
        )}

        {tab === "requirements" && (
          <div className="space-y-4">
            <Card className="p-4 lg:p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-[#0b1220]">
                  Requirements
                  <span className="ml-2 text-sm text-[#a0a6c2] font-semibold tabular-nums">
                    {filteredRequirements.length} of {appendix.role.requirements.length}
                  </span>
                </h2>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowAddReq((v) => !v)}
                >
                  {showAddReq ? "Cancel" : "+ Add requirement"}
                </Button>
              </div>
              <input
                type="search"
                placeholder="Search requirements…"
                value={reqSearch}
                onChange={(e) => setReqSearch(e.target.value)}
                aria-label="Search requirements"
                className="mt-3 w-full rounded-xl border border-[#e6e8f2] bg-[#f6f7fb] px-4 py-2.5 text-sm text-[#0b1220] placeholder:text-[#a0a6c2] focus:outline-none focus:ring-2 focus:ring-[#5b5bf5]/30"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {(["all", "must", "nice"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setReqFilter(f)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors ${
                      reqFilter === f
                        ? "bg-[#0b1220] text-white border-[#0b1220]"
                        : "bg-white text-[#67708f] border-[#e6e8f2] hover:border-[#c4b5fd]"
                    }`}
                  >
                    {f === "all"
                      ? `All · ${appendix.role.requirements.length}`
                      : f === "must"
                        ? `Must-have · ${mustReqs.length}`
                        : `Nice-to-have · ${niceReqs.length}`}
                  </button>
                ))}
                {uncovered.size > 0 && (
                  <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#d97706]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
                    {uncovered.size} needs coverage
                  </span>
                )}
              </div>
            </Card>

            {reqError && (
              <div className="rounded-xl bg-[#fef2f2] border border-[#fecaca] px-4 py-2.5 text-xs font-medium text-[#b91c1c]">
                {reqError}
              </div>
            )}

            {showAddReq && (
              <RequirementComposer
                disabled={reqBusy}
                onCancel={() => setShowAddReq(false)}
                onAdd={async (data) => {
                  await runReqOp(() => api.addRequirement(kitId, data));
                  setShowAddReq(false);
                }}
              />
            )}

            {filteredRequirements.length === 0 && !showAddReq ? (
              <Card className="p-10 text-center">
                <p className="text-sm font-semibold text-[#0b1220]">No requirements match</p>
                <p className="mt-1 text-sm text-[#67708f]">Try a different search or filter.</p>
              </Card>
            ) : (
              <>
                {visibleMust.length > 0 && (
                  <RequirementGroup
                    title="Must-have"
                    count={visibleMust}
                    total={mustReqs.length}
                    tone="must"
                    uncovered={uncovered}
                    disabled={reqBusy}
                    onSave={(rid, patch) => runReqOp(() => api.patchRequirement(kitId, rid, patch))}
                    onDelete={(rid) => runReqOp(() => api.deleteRequirement(kitId, rid))}
                  />
                )}
                {visibleNice.length > 0 && (
                  <RequirementGroup
                    title="Nice-to-have"
                    count={visibleNice}
                    total={niceReqs.length}
                    tone="nice"
                    uncovered={uncovered}
                    disabled={reqBusy}
                    onSave={(rid, patch) => runReqOp(() => api.patchRequirement(kitId, rid, patch))}
                    onDelete={(rid) => runReqOp(() => api.deleteRequirement(kitId, rid))}
                  />
                )}
              </>
            )}
          </div>
        )}

        {tab === "questions" && (
          <div className="space-y-4">
            <Card className="px-4 py-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold tracking-[0.12em] text-[#a0a6c2] uppercase mr-1">
                Difficulty
              </span>
              {(
                [
                  { id: "all" as const, label: `All · ${appendix.questions.length}` },
                  { id: 1 as const, label: `Easy · ${difficultyCounts[1]}` },
                  { id: 2 as const, label: `Medium · ${difficultyCounts[2]}` },
                  { id: 3 as const, label: `Hard · ${difficultyCounts[3]}` },
                ]
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setQDifficulty(f.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors ${
                    qDifficulty === f.id
                      ? "bg-[#0b1220] text-white border-[#0b1220]"
                      : "bg-white text-[#67708f] border-[#e6e8f2] hover:border-[#c4b5fd]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </Card>

            {questionsByCategory.length === 0 ? (
              <Card className="p-10 text-center">
                <p className="text-sm font-semibold text-[#0b1220]">No questions at this difficulty</p>
                <p className="mt-1 text-sm text-[#67708f]">Try a different difficulty filter.</p>
              </Card>
            ) : (
              questionsByCategory.map(([category, questions]) => (
                <Card key={category} className="overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#e6e8f2] bg-[#fafbff]">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${CATEGORY_ACCENT[category] ?? "bg-[#a0a6c2]"}`}
                      />
                      <h3 className="text-sm font-bold text-[#0b1220] capitalize">
                        {category.replace(/-/g, " ")}
                      </h3>
                      <span className="ml-auto rounded-full bg-[#eef0ff] px-2.5 py-0.5 text-[11px] font-bold text-[#4f46e5] tabular-nums">
                        {questions.length}
                      </span>
                    </div>
                  </div>
                  <div className="divide-y divide-[#e6e8f2]">
                    {questions.map((q, qi) => {
                      const open = expandedQuestion === q.id;
                      return (
                        <div key={q.id}>
                          <button
                            type="button"
                            onClick={() => setExpandedQuestion(open ? null : q.id)}
                            aria-expanded={open}
                            className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-[#fafbff] transition-colors"
                          >
                            <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#eef0ff] text-[10px] font-bold text-[#5b5bf5] tabular-nums mt-0.5">
                              {qi + 1}
                            </span>
                            <DifficultyDots level={q.difficulty} />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-[#0b1220] leading-relaxed">
                                {q.prompt}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {q.requirement_ids.length > 0 ? (
                                  <span
                                    title={`Covers ${q.requirement_ids.join(", ")}`}
                                    className="text-[11px] font-medium text-[#a0a6c2]"
                                  >
                                    Covers {q.requirement_ids.length} requirement
                                    {q.requirement_ids.length === 1 ? "" : "s"}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-[#a0a6c2]">General</span>
                                )}
                              </div>
                            </div>
                            <Chevron open={open} />
                          </button>
                          {open && (
                            <div className="mt-3 px-4 pb-5 sm:px-5 sm:pl-[76px]">
                              <AnswerOutline text={q.answer_outline} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === "schedule" && (
          <ScheduleCalendar
            appendix={appendix}
            totalMinutes={totalMinutes}
            questionById={questionById}
            kitId={kitId}
            createdAt={createdAt}
          />
        )}

        {tab === "flashcards" && (
          <div className="space-y-4">
            <Card className="p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-[#0b1220] tabular-nums">
                  {appendix.flashcards.length} flashcards
                </h2>
                <p className="mt-1 text-sm text-[#67708f]">
                  Least-confident cards surface first in practice
                </p>
              </div>
              <Link href={`/kits/${kitId}/practice`} className={buttonStyles()}>
                Start practice session
              </Link>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {appendix.flashcards.map((fc, i) => (
                <div
                  key={fc.id}
                  className="group flex flex-col rounded-2xl border border-[#e6e8f2] bg-white p-4 shadow-sm hover:shadow-md hover:border-[#c4b5fd]/60 hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#a0a6c2] uppercase tracking-wider tabular-nums">
                      Card {i + 1}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[#0b1220] leading-relaxed line-clamp-3 flex-none">
                    {fc.front}
                  </p>
                  <p className="mt-3 text-xs text-[#67708f] leading-relaxed line-clamp-2 border-t border-[#e6e8f2] pt-3">
                    {fc.back}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RequirementGroup({
  title,
  count,
  total,
  tone,
  uncovered,
  disabled,
  onSave,
  onDelete,
}: {
  title: string;
  count: KitRequirement[];
  total: number;
  tone: "must" | "nice";
  uncovered: Set<string>;
  disabled: boolean;
  onSave: (rid: string, patch: { text?: string; kind?: string; priority?: string }) => Promise<void>;
  onDelete: (rid: string) => Promise<void>;
}) {
  const isMust = tone === "must";
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className={`h-2 w-2 rounded-full ${isMust ? "bg-[#5b5bf5]" : "bg-[#a0a6c2]"}`} />
        <h3 className="text-[13px] font-bold text-[#0b1220]">{title}</h3>
        <span className="text-xs font-medium text-[#a0a6c2] tabular-nums">
          {count.length}
          {count.length !== total ? ` of ${total}` : ""}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {count.map((r) => (
          <RequirementTag
            key={r.id}
            req={r}
            gap={uncovered.has(r.id)}
            disabled={disabled}
            onSave={(patch) => onSave(r.id, patch)}
            onDelete={() => onDelete(r.id)}
          />
        ))}
      </div>
    </section>
  );
}

const ORIGIN_DOT: Record<string, { cls: string; label: string }> = {
  generated: { cls: "bg-[#c4b5fd]", label: "AI-generated" },
  edited: { cls: "bg-[#f59e0b]", label: "AI-generated, edited by you" },
  user: { cls: "bg-[#10b981]", label: "Added by you" },
};

function RequirementTag({
  req,
  gap,
  disabled,
  onSave,
  onDelete,
}: {
  req: KitRequirement;
  gap: boolean;
  disabled: boolean;
  onSave: (patch: { text?: string; kind?: string; priority?: string }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [text, setText] = useState(req.text);
  const [kind, setKind] = useState(req.kind);
  const [priority, setPriority] = useState(req.priority);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) return;
    setText(req.text);
    setKind(req.kind);
    setPriority(req.priority);
  }, [editing, req.id, req.text, req.kind, req.priority]);

  const origin = ORIGIN_DOT[req._state?.origin ?? "generated"] ?? ORIGIN_DOT.generated;

  const dirty =
    text.trim() !== req.text || kind !== req.kind || priority !== req.priority;

  const cancel = () => {
    setText(req.text);
    setKind(req.kind);
    setPriority(req.priority);
    setError(null);
    setEditing(false);
  };

  const trySave = () => {
    const err = textError(text, "Requirement", LIMITS.requirement);
    setError(err);
    if (err) return;
    void onSave({ text: text.trim(), kind, priority }).then(() => setEditing(false));
  };

  if (editing) {
    return (
      <div className="basis-full rounded-2xl border-2 border-[#c4b5fd]/60 bg-white p-3 shadow-sm space-y-2.5">
        <div>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (error) setError(null);
            }}
            rows={2}
            autoFocus
            disabled={disabled}
            aria-label="Requirement text"
            aria-invalid={!!error}
            className={`w-full rounded-xl border bg-[#f6f7fb] px-3 py-2 text-sm text-[#0b1220] focus:outline-none focus:ring-2 focus:ring-[#5b5bf5]/30 ${error ? "border-[#f87171]" : "border-[#e6e8f2]"}`}
          />
          {error && <p role="alert" className="mt-1 text-[11px] font-medium text-[#b91c1c]">{error}</p>}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <FieldSelect
            label="Kind"
            value={kind}
            onChange={setKind}
            options={KIND_OPTIONS}
            disabled={disabled}
            className="flex-1"
          />
          <FieldSelect
            label="Priority"
            value={priority}
            onChange={setPriority}
            options={PRIORITY_OPTIONS}
            disabled={disabled}
            className="flex-1"
          />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={disabled || !dirty}
            onClick={trySave}
          >
            Save
          </Button>
          <Button size="sm" variant="secondary" disabled={disabled} onClick={cancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <span
      className={`group inline-flex max-w-full items-center gap-1.5 rounded-full border pl-3 pr-1.5 py-1.5 text-[13px] text-[#0b1220] shadow-sm transition-all hover:shadow-md ${
        gap
          ? "border-[#fcd34d] bg-[#fffbeb]/60 hover:border-[#f59e0b]"
          : "border-[#e6e8f2] bg-white hover:border-[#c4b5fd]"
      }`}
    >
      <span title={origin.label} className={`h-1.5 w-1.5 shrink-0 rounded-full ${origin.cls}`} />
      <span className="min-w-0 break-words leading-snug">{req.text}</span>
      {gap && (
        <span title="No question covers this yet" className="shrink-0 rounded-full bg-[#f59e0b] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
          !
        </span>
      )}
      {confirming ? (
        <span className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => void onDelete()}
            className="rounded-full bg-[#fef2f2] border border-[#fecaca] px-2 py-0.5 text-[11px] font-bold text-[#b91c1c] hover:bg-[#fee2e2]"
          >
            Delete?
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setConfirming(false)}
            aria-label="Keep requirement"
            className="grid h-5 w-5 place-items-center rounded-full text-[#67708f] hover:bg-[#f6f7fb]"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </span>
      ) : (
        <span className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 max-sm:opacity-100 transition-opacity">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setEditing(true)}
            title="Edit requirement"
            aria-label={`Edit ${req.text}`}
            className="grid h-5 w-5 place-items-center rounded-full text-[#a0a6c2] hover:bg-[#eef0ff] hover:text-[#4f46e5]"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setConfirming(true)}
            title="Delete requirement"
            aria-label={`Delete ${req.text}`}
            className="grid h-5 w-5 place-items-center rounded-full text-[#a0a6c2] hover:bg-[#fef2f2] hover:text-[#b91c1c]"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </span>
      )}
    </span>
  );
}

function RequirementComposer({
  disabled,
  onCancel,
  onAdd,
}: {
  disabled: boolean;
  onCancel: () => void;
  onAdd: (data: { text: string; kind: string; priority: string }) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [kind, setKind] = useState("technical");
  const [priority, setPriority] = useState("must");
  const [error, setError] = useState<string | null>(null);

  const tryAdd = () => {
    const err = textError(text, "Requirement", LIMITS.requirement);
    setError(err);
    if (err) return;
    void onAdd({ text: text.trim(), kind, priority });
  };

  return (
    <div className="rounded-2xl border-2 border-dashed border-[#c4b5fd]/60 bg-[#fafbff] p-4 space-y-2.5">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-[#5b5bf5] uppercase">
        New requirement
      </p>
      <div>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError(null);
          }}
          rows={2}
          autoFocus
          placeholder="e.g. 3+ years operating Postgres at scale"
          disabled={disabled}
          aria-invalid={!!error}
          className={`w-full rounded-xl border bg-white px-3 py-2 text-sm text-[#0b1220] placeholder:text-[#a0a6c2] focus:outline-none focus:ring-2 focus:ring-[#5b5bf5]/30 ${error ? "border-[#f87171]" : "border-[#e6e8f2]"}`}
        />
        {error && <p role="alert" className="mt-1 text-[11px] font-medium text-[#b91c1c]">{error}</p>}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <FieldSelect
          label="Kind"
          value={kind}
          onChange={setKind}
          options={KIND_OPTIONS}
          disabled={disabled}
          className="flex-1"
        />
        <FieldSelect
          label="Priority"
          value={priority}
          onChange={setPriority}
          options={PRIORITY_OPTIONS}
          disabled={disabled}
          className="flex-1"
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled={disabled} onClick={tryAdd}>
          Add requirement
        </Button>
        <Button size="sm" variant="secondary" disabled={disabled} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-[0.14em] text-[#5b5bf5] uppercase">
      {children}
    </p>
  );
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Month pager chevrons, matching the app's round nav-button style. */
function DayPickerChevron({
  orientation,
  disabled,
}: {
  orientation?: "left" | "right" | "up" | "down";
  disabled?: boolean;
}) {
  const Cmp = orientation === "left" ? ChevronLeft : ChevronRight;
  return <Cmp size={15} strokeWidth={2.2} aria-hidden className={disabled ? "opacity-40" : undefined} />;
}

type ScheduleDay = KitAppendix["schedule"]["days"][number];

/** Binds calendar day rendering to one schedule snapshot so the button type stays stable. */
function bindDayButton(dayByKey: Map<string, { day: ScheduleDay; date: Date }>) {
  return function CalendarDayButton({ day, modifiers, ...rest }: DayButtonProps) {
    const entry = dayByKey.get(dateKey(day.date));
    const isStudy = modifiers.study === true;
    const isInterview = modifiers.interview === true;
    const isSelected = modifiers.selected === true;
    if (isInterview) {
      return (
        <button
          {...rest}
          title="Interview day"
          className={`interview-day-glow flex h-full min-h-14 w-full flex-col items-center justify-center gap-1 rounded-xl border border-transparent bg-gradient-to-br from-[#ff7eb0] to-[#ffcc6a] p-1 text-center text-white transition-transform hover:scale-[1.04] ${
            isSelected ? "ring-2 ring-white/60" : ""
          }`}
        >
          <span className="text-xs font-extrabold tabular-nums">{day.date.getDate()}</span>
          <span className="rounded-full bg-white/25 px-1.5 py-px text-[9px] font-bold whitespace-nowrap">
            🎯 Interview
          </span>
        </button>
      );
    }
    return (
      <button
        {...rest}
        className={`flex h-full min-h-14 w-full flex-col items-center justify-center gap-1 rounded-xl border p-1 text-center transition-colors ${
          isStudy
            ? isSelected
              ? "bg-[#e0e4ff] border-[#5b5bf5] ring-2 ring-[#5b5bf5]/30"
              : "bg-[#eef0ff] hover:bg-[#e0e4ff] border-[#c4b5fd]/50"
            : "border-transparent hover:bg-[#f6f7fb]"
        }`}
      >
        <span
          className={`text-xs tabular-nums ${
            isStudy ? "font-extrabold text-[#4f46e5]" : "font-medium text-[#67708f]"
          }`}
        >
          {day.date.getDate()}
        </span>
        {entry && (
          <span className="rounded-full bg-white border border-[#e6e8f2] px-1.5 py-px text-[9px] font-bold text-[#4f46e5] tabular-nums whitespace-nowrap">
            {formatDuration(entry.day.minutes)}
          </span>
        )}
      </button>
    );
  };
}

function ScheduleCalendar({
  appendix,
  totalMinutes,
  questionById,
  kitId,
  createdAt,
}: {
  appendix: KitAppendix;
  totalMinutes: number;
  questionById: Map<string, KitAppendix["questions"][number]>;
  kitId: string;
  createdAt: string;
}) {
  // Anchor Day 1 to kit creation, not today: the interview date is fixed,
  // remaining days are a countdown. Anchoring to today shifted every date
  // forward one day per day.
  const anchor = useMemo(() => {
    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) {
      const t = new Date();
      return new Date(t.getFullYear(), t.getMonth(), t.getDate());
    }
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, [createdAt]);

  const dayByKey = useMemo(() => {
    const map = new Map<string, { day: ScheduleDay; date: Date }>();
    for (const d of appendix.schedule.days) {
      const date = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + d.day - 1);
      map.set(dateKey(date), { day: d, date });
    }
    return map;
  }, [appendix.schedule.days, anchor]);

  const studyDates = useMemo(() => [...dayByKey.values()].map((v) => v.date), [dayByKey]);
  // Interview lands the day after the last study session.
  const interviewDate = useMemo(() => {
    const dates = [...dayByKey.values()].map((v) => v.date);
    if (dates.length === 0) return null;
    const last = new Date(Math.max(...dates.map((d) => d.getTime())));
    return new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
  }, [dayByKey]);
  const interviewKey = interviewDate ? dateKey(interviewDate) : null;
  const [selectedKey, setSelectedKey] = useState<string | null>(
    () => [...dayByKey.keys()][0] ?? null,
  );

  useEffect(() => {
    if (selectedKey != null && !dayByKey.has(selectedKey) && selectedKey !== interviewKey) {
      setSelectedKey([...dayByKey.keys()][0] ?? null);
    }
  }, [dayByKey, interviewKey, selectedKey]);

  const selected =
    (selectedKey ? dayByKey.get(selectedKey) : undefined) ?? dayByKey.values().next().value;
  const isInterviewSelected = interviewKey != null && selectedKey === interviewKey;

  // Stable across renders (remounts only when the schedule itself changes).
  const DayButton = useMemo(() => bindDayButton(dayByKey), [dayByKey]);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#6d5cff] to-[#b07cff]" />
        <div className="p-5 lg:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#0b1220]">
                {appendix.schedule.days_available}-day study plan
              </h2>
              <p className="mt-1 text-sm text-[#67708f]">
                {formatDuration(totalMinutes)} total · harder, higher-priority material lands early
              </p>
            </div>
            <Badge className="tabular-nums">{appendix.schedule.days.length} sessions</Badge>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="schedule-calendar p-3 sm:p-4 lg:col-span-3 overflow-x-auto">
          <DayPicker
            mode="single"
            defaultMonth={anchor}
            selected={isInterviewSelected ? (interviewDate ?? undefined) : selected?.date}
            onSelect={(date) => {
              if (!date) return;
              const key = dateKey(date);
              if (dayByKey.has(key) || key === interviewKey) setSelectedKey(key);
            }}
            modifiers={{ study: studyDates, interview: interviewDate ?? [] }}
            disabled={(date) => {
              const key = dateKey(date);
              return !dayByKey.has(key) && key !== interviewKey;
            }}
            components={{ DayButton, Chevron: DayPickerChevron }}
            classNames={{
              root: "w-full",
              month: "w-full",
              month_caption: "flex items-center justify-between w-full",
              caption_label: "text-[15px] font-bold text-(--foreground)",
              nav: "flex items-center gap-2",
              button_previous:
                "grid h-8 w-8 place-items-center rounded-full border border-[#e6e8f2] bg-white text-[#67708f] transition-colors hover:text-[#0b1220]",
              button_next:
                "grid h-8 w-8 place-items-center rounded-full border border-[#e6e8f2] bg-white text-[#67708f] transition-colors hover:text-[#0b1220]",
              month_grid: "w-full table-fixed border-collapse",
              weekday: "text-[11px] font-semibold text-[#a0a6c2] uppercase py-2",
              week: "w-full",
              day: "p-0.5 align-top h-[76px] w-[14.28%]",
            }}
          />
          <div className="flex items-center gap-4 px-2 pb-2 pt-1 text-[11px] font-medium text-[#67708f]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-md bg-[#eef0ff] border border-[#c4b5fd]/50" />
              Study day
            </span>
            <span>
              Day 1 ·{" "}
              {anchor.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
            {interviewDate && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-md bg-gradient-to-br from-[#ff7eb0] to-[#ffcc6a]" />
                Interview day
              </span>
            )}
          </div>
        </Card>

        <div className="lg:col-span-2">
          {isInterviewSelected && interviewDate ? (
            <Card className="flex h-full flex-col overflow-hidden">
              <div className="bg-gradient-to-br from-[#6d5cff] via-[#b07cff] to-[#ff7eb0] p-5 text-white">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-white/80 uppercase">
                  🎯 Interview day
                </p>
                <h3 className="mt-1.5 text-lg font-extrabold leading-snug">
                  {interviewDate.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/85">
                  You&apos;ve done the work — today is about showing it. Stay calm, think out loud, be yourself.
                </p>
              </div>
              <div className="flex min-h-[400px] flex-1 flex-col p-5">
                <ul className="space-y-2.5">
                  {[
                    "Skim your answer outlines — don't cram new topics",
                    "Run one final mock to warm up your thinking",
                    "Sleep well, hydrate, arrive 10 minutes early",
                    "It's mutual — ask them sharp questions too",
                  ].map((tip) => (
                    <li
                      key={tip}
                      className="flex gap-2.5 rounded-xl border border-[#e6e8f2] bg-[#fafbff] px-3.5 py-2.5 text-[13px] font-medium leading-relaxed text-[#0b1220]"
                    >
                      <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-[#ecfdf5] text-[10px] font-bold text-[#059669]">
                        ✓
                      </span>
                      {tip}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/kits/${kitId}/practice`}
                  className={`mt-auto block pt-4 ${buttonStyles("primary", "sm", "w-full")}`}
                >
                  Run a final mock
                </Link>
              </div>
            </Card>
          ) : selected ? (
            <Card className="h-full p-5">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-[#5b5bf5] uppercase">
                Day {selected.day.day} ·{" "}
                {selected.date.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <h3 className="mt-1.5 text-[15px] font-bold text-[#0b1220] leading-snug break-words">
                {cleanFocus(selected.day.focus)}
              </h3>
              <div className="mt-3 flex gap-2">
                <Badge className="bg-[#f6f7fb] text-[#67708f]">
                  {formatDuration(selected.day.minutes)}
                </Badge>
                <Badge>
                  {selected.day.question_ids.length} question
                  {selected.day.question_ids.length === 1 ? "" : "s"}
                </Badge>
              </div>
              {selected.day.question_ids.length > 0 && (
                <div className="mt-4 border-t border-[#e6e8f2] pt-4">
                  <DayQuestionDeck
                    key={selectedKey}
                    questions={selected.day.question_ids.flatMap((qid) => {
                      const q = questionById.get(qid);
                      return q ? [q] : [];
                    })}
                  />
                </div>
              )}
            </Card>
          ) : (
            <Card className="h-full p-5 text-sm text-[#67708f]">
              Select a highlighted day to see its session.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function AnswerOutline({ text }: { text: string }) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const allBullets = lines.length > 1 && lines.every((l) => l.startsWith("- "));

  return (
    <div className="rounded-xl bg-[#f6f7fb] border border-[#e6e8f2] p-4">
      <p className="text-[11px] font-semibold tracking-[0.1em] text-[#a0a6c2] uppercase">
        Answer outline
      </p>
      {allBullets ? (
        <ul className="mt-2.5 space-y-2">
          {lines.map((l, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-[#67708f] leading-relaxed">
              <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#5b5bf5]" />
              {l.replace(/^-\s+/, "")}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-[#67708f] leading-relaxed whitespace-pre-wrap">{text}</p>
      )}
    </div>
  );
}

function MiniStatCard({
  title,
  value,
  hint,
  onClick,
}: {
  title: string;
  value: string | number;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-2xl border border-[#e6e8f2] bg-white p-5 text-left shadow-sm hover:shadow-md hover:border-[#c4b5fd]/50 hover:-translate-y-0.5 transition-all"
    >
      <div className="text-2xl font-extrabold text-[#0b1220] tabular-nums">{value}</div>
      <div className="mt-1 text-sm font-semibold text-[#0b1220] group-hover:text-[#4f46e5] transition-colors">
        {title} →
      </div>
      <div className="mt-0.5 text-xs text-[#a0a6c2]">{hint}</div>
    </button>
  );
}

function DifficultyDots({ level }: { level: number }) {
  const label = DIFFICULTY_LABELS[level] ?? `L${level}`;
  return (
    <div className="shrink-0 flex flex-col items-center gap-1 pt-0.5 w-10">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${i <= level ? "bg-[#5b5bf5]" : "bg-[#e6e8f2]"}`}
          />
        ))}
      </div>
      <span className="text-[9px] font-semibold text-[#a0a6c2]">{label}</span>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`shrink-0 h-5 w-5 text-[#a0a6c2] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function pathOf(url: string): string {
  try {
    const u = new URL(url);
    const path = `${u.pathname}${u.search}${u.hash}`;
    return path && path !== "/" ? path : u.href.replace(/^https?:\/\//, "");
  } catch {
    return url;
  }
}
function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
