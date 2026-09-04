"use client";

import { useState } from "react";
import { Check, ChevronDown, CircleHelp, Keyboard, LogOut, Moon, Palette, Sun, UserRound } from "lucide-react";
import { useAuth, userDisplayName, userInitials } from "@/contexts/AuthContext";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Button } from "@/components/ui/Button";

type Tab = "profile" | "appearance" | "shortcuts" | "faq";

const TABS: Array<{ key: Tab; label: string; Icon: typeof UserRound }> = [
  { key: "profile", label: "Profile", Icon: UserRound },
  { key: "appearance", label: "Appearance", Icon: Palette },
  { key: "shortcuts", label: "Shortcuts", Icon: Keyboard },
  { key: "faq", label: "FAQ", Icon: CircleHelp },
];

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "How is my kit actually built?",
    a: "In deliberate steps, not one big prompt: the company site is crawled for what they do and how they hire, public discussion of their interview process is searched, requirements are extracted from your job description, questions are generated per requirement and category, then flashcards and a day-by-day schedule are produced.",
  },
  {
    q: "What is the coverage second pass?",
    a: "After the first draft, every requirement is checked against the generated questions. Any must-have with no covering question is sent back for another generation round, and the check runs again — so kits don't ship with uncovered must-haves.",
  },
  {
    q: "Will regenerating a section wipe my edits?",
    a: "No. Regenerating the brief, a question category, or the schedule only touches that section. Questions you wrote or edited by hand are pinned and survive category regenerations.",
  },
  {
    q: "How does flashcard practice ordering work?",
    a: "Cards you rate 1–2 come back sooner; 3+ keeps your streak alive. Each session surfaces your least-confident cards first, and your XP, streak, and best streak track the run.",
  },
  {
    q: "How is the study schedule allocated?",
    a: "Deterministically in code, not by the model: your material is spread across exactly the number of days you asked for, with harder and higher-priority material placed earlier — never crammed into the night before.",
  },
  {
    q: "Can I prepare for several roles at once?",
    a: "Yes — use Batch upload on the kits page with a JSON file of { jd, company_url, days } objects. Each case generates independently, and one failure never aborts the rest.",
  },
  {
    q: "What if the company site is unreachable or the JD is tiny?",
    a: "The kit stays honest: unreachable sources are recorded and skipped rather than failing the run, and a thin description produces a thin kit that says so instead of inventing requirements.",
  },
  {
    q: "Who can see my kits?",
    a: "Only you. Sessions are cookie-based, every endpoint is scoped to your account, and there is no sharing or team access.",
  },
];

const SHORTCUTS: Array<{ keys: string[]; action: string }> = [
  { keys: ["Space"], action: "Flip flashcard" },
  { keys: ["1–5"], action: "Rate confidence (answer shown)" },
  { keys: ["←", "→"], action: "Previous / next card" },
  { keys: ["R"], action: "Restart practice session" },
  { keys: ["F"], action: "Card focus mode" },
];

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 py-5 sm:grid-cols-[180px_1fr] sm:gap-6">
      <div>
        <p className="text-sm font-bold text-[#0b1220]">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-[#8a8fa8]">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default function SettingsView() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [tab, setTab] = useState<Tab>("profile");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto w-full overflow-hidden rounded-3xl border border-[#e6e8f2] bg-white shadow-sm">
        {/* Header */}
        <div className="border-b border-[#f1f2f9] px-6 pt-6 sm:px-8">
          <h1 className="text-xl font-extrabold tracking-tight text-[#0b1220]">Settings</h1>
          <p className="mt-0.5 text-sm text-[#67708f]">Manage your profile and preferences.</p>
          <div
            className="mt-4 flex gap-1 overflow-x-auto no-scrollbar"
            role="tablist"
            aria-label="Settings sections"
            onKeyDown={(e) => {
              if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
              e.preventDefault();
              const i = TABS.findIndex((t) => t.key === tab);
              const next =
                e.key === "ArrowRight"
                  ? TABS[(i + 1) % TABS.length]!
                  : e.key === "ArrowLeft"
                    ? TABS[(i - 1 + TABS.length) % TABS.length]!
                    : e.key === "Home"
                      ? TABS[0]!
                      : TABS[TABS.length - 1]!;
              setTab(next.key);
              document.getElementById(`settings-tab-${next.key}`)?.focus();
            }}
          >
            {TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                id={`settings-tab-${key}`}
                type="button"
                role="tab"
                aria-selected={tab === key}
                aria-controls="settings-tabpanel"
                tabIndex={tab === key ? 0 : -1}
                onClick={() => setTab(key)}
                className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 pb-3 pt-1 text-sm font-bold transition-colors ${
                  tab === key
                    ? "border-[#5b5bf5] text-[#4f46e5]"
                    : "border-transparent text-[#8a8fa8] hover:text-[#0b1220]"
                }`}
              >
                <Icon size={14} aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div
          id="settings-tabpanel"
          role="tabpanel"
          aria-labelledby={`settings-tab-${tab}`}
          className="px-6 sm:px-8"
        >
          {tab === "profile" && (
            <div className="fade-up divide-y divide-[#f1f2f9]">
              <Row label="Your photo" hint="Shown across the app.">
                <div className="flex items-center gap-4">
                  <div
                    aria-hidden
                    className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#5b5bf5] to-[#b07cff] text-lg font-extrabold text-white shadow-md"
                  >
                    {userInitials(user)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-[#0b1220]">{userDisplayName(user)}</p>
                    <p className="truncate text-xs text-[#8a8fa8]">{user?.email ?? "Not signed in"}</p>
                  </div>
                  <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#ecfdf5] px-2.5 py-1 text-[11px] font-extrabold text-[#059669]">
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
                    Active
                  </span>
                </div>
              </Row>
              <Row label="Name">
                <p className="rounded-xl border border-[#e6e8f2] bg-[#f6f7fb] px-3.5 py-2.5 text-sm font-semibold text-[#0b1220]">
                  {user?.name?.trim() || "—"}
                </p>
              </Row>
              <Row label="Email" hint="Used for sign-in.">
                <p className="rounded-xl border border-[#e6e8f2] bg-[#f6f7fb] px-3.5 py-2.5 text-sm font-semibold text-[#0b1220]">
                  {user?.email ?? "—"}
                </p>
              </Row>
              <div className="flex justify-end gap-2 py-5">
                <Button variant="secondary" size="sm" onClick={() => void signOut()} disabled={signingOut}>
                  <LogOut size={14} aria-hidden /> {signingOut ? "Signing out…" : "Sign out"}
                </Button>
              </div>
            </div>
          )}

          {tab === "appearance" && (
            <div className="fade-up divide-y divide-[#f1f2f9]">
              <Row label="Theme" hint="Applies instantly across the app.">
                <div className="grid max-w-sm grid-cols-2 gap-1 rounded-full bg-[#f1f2f9] p-1" role="group" aria-label="Theme">
                  {(
                    [
                      { value: "light", label: "Light", Icon: Sun },
                      { value: "dark", label: "Dark", Icon: Moon },
                    ] as const
                  ).map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTheme(value)}
                      aria-pressed={theme === value}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all ${
                        theme === value ? "bg-white text-[#0b1220] shadow-sm" : "text-[#8a8fa8] hover:text-[#0b1220]"
                      }`}
                    >
                      <Icon size={14} aria-hidden />
                      {label}
                      {theme === value && <Check size={14} strokeWidth={3} className="text-[#059669]" aria-hidden />}
                    </button>
                  ))}
                </div>
              </Row>
              <div className="py-5">
                <p className="text-xs text-[#8a8fa8]">Keyboard theme toggle coming from the top bar still works.</p>
              </div>
            </div>
          )}

          {tab === "shortcuts" && (
            <div className="fade-up divide-y divide-[#f1f2f9]">
              {SHORTCUTS.map((s) => (
                <div key={s.action} className="flex items-center justify-between gap-3 py-4">
                  <span className="text-sm font-semibold text-[#0b1220]">{s.action}</span>
                  <span className="flex gap-1.5">
                    {s.keys.map((k) => (
                      <kbd
                        key={k}
                        className="rounded-lg border border-[#e6e8f2] bg-[#f6f7fb] px-2 py-1 font-mono text-[11px] font-bold text-[#67708f]"
                      >
                        {k}
                      </kbd>
                    ))}
                  </span>
                </div>
              ))}
              <div className="py-5">
                <p className="text-xs text-[#8a8fa8]">Available on kit and practice pages.</p>
              </div>
            </div>
          )}

          {tab === "faq" && (
            <div className="fade-up py-2">
              {FAQS.map((f, i) => {
                const open = openFaq === i;
                return (
                  <div key={f.q} className="border-b border-[#f1f2f9] last:border-0">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : i)}
                      aria-expanded={open}
                      aria-controls={`faq-answer-${i}`}
                      className="focus-ring flex w-full items-center justify-between gap-3 py-4 text-left"
                    >
                      <span className="text-sm font-bold text-[#0b1220]">{f.q}</span>
                      <span
                        aria-hidden
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition-all duration-300 ${
                          open ? "rotate-180 bg-[#0b1220] text-white" : "bg-[#f1f2f9] text-[#67708f]"
                        }`}
                      >
                        <ChevronDown size={14} strokeWidth={2.5} />
                      </span>
                    </button>
                    <div
                      id={`faq-answer-${i}`}
                      aria-hidden={!open}
                      className={`grid transition-all duration-300 ease-out ${
                        open ? "grid-rows-[1fr] pb-4 opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <p hidden={!open} className="overflow-hidden text-sm leading-relaxed text-[#67708f]">{f.a}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
