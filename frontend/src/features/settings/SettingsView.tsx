"use client";

import Link from "next/link";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Badge";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function SettingsView() {
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const { theme, toggle } = useTheme();

  return (
    <div className="px-4 md:px-6 lg:px-8 py-6 pb-20 md:pb-6">
      {/* Header */}
      <div>
        <Label>Settings</Label>
        <h1 className="mt-1 text-[26px] font-extrabold tracking-tight text-[#0b1220]">Preferences</h1>
        <p className="mt-1 text-sm text-[#67708f] max-w-[560px]">Manage your profile, interview focus, and how PrepPilot AI nudges you. All changes save instantly — no backend wired yet.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* Left stack */}
        <div className="space-y-6">
          {/* Profile */}
          <Card className="p-5 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-[#0b1220]">Profile</h2>
                <p className="text-xs text-[#8a8fa8] mt-0.5">How you appear on reports and peer mocks.</p>
              </div>
              <span className="hidden sm:inline text-[11px] font-semibold bg-[#eef0ff] text-[#4f46e5] rounded-full px-2.5 py-1">Pro • Level 12</span>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-5">
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#ffcc8a] to-[#ff8fa0] p-[2px]">
                  <div className="w-full h-full rounded-2xl bg-white dark:bg-[#1e293b] grid place-items-center text-xl font-bold text-[#0b1220] dark:text-white">JD</div>
                </div>
                <button className="text-xs font-semibold text-[#5b5bf5] hover:underline">Change avatar</button>
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-semibold text-[#0b1220]">Full name</span>
                  <input defaultValue="Jane Doe" className="mt-1.5 w-full rounded-xl border border-[#e6e8f2] dark:border-[#334155] bg-[#f6f7fb] dark:bg-[#18233a] px-3.5 py-2.5 text-sm text-[#0b1220] dark:text-[#f1f5f9] placeholder:text-[#a0a6c2] dark:placeholder:text-[#64748b] outline-none focus:bg-white dark:focus:bg-[#1e293b] focus:border-[#5b5bf5] dark:focus:border-[#818cf8] focus:ring-2 focus:ring-[#eef0ff] dark:focus:ring-[#818cf8]/20" />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-[#0b1220]">Email</span>
                  <input defaultValue="jane@example.com" type="email" className="mt-1.5 w-full rounded-xl border border-[#e6e8f2] dark:border-[#334155] bg-[#f6f7fb] dark:bg-[#18233a] px-3.5 py-2.5 text-sm text-[#0b1220] dark:text-[#f1f5f9] placeholder:text-[#a0a6c2] dark:placeholder:text-[#64748b] outline-none focus:bg-white dark:focus:bg-[#1e293b] focus:border-[#5b5bf5] dark:focus:border-[#818cf8] focus:ring-2 focus:ring-[#eef0ff] dark:focus:ring-[#818cf8]/20" />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-[#0b1220]">Target role</span>
                  <select className="mt-1.5 w-full rounded-xl border border-[#e6e8f2] dark:border-[#334155] bg-[#f6f7fb] dark:bg-[#18233a] px-3.5 py-2.5 text-sm text-[#0b1220] dark:text-[#f1f5f9] outline-none focus:bg-white dark:focus:bg-[#1e293b] focus:border-[#5b5bf5] dark:focus:border-[#818cf8]">
                    <option>Frontend Engineer</option>
                    <option>Backend Engineer</option>
                    <option>Fullstack</option>
                    <option>Product Designer</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-[#0b1220]">Timezone</span>
                  <select className="mt-1.5 w-full rounded-xl border border-[#e6e8f2] dark:border-[#334155] bg-[#f6f7fb] dark:bg-[#18233a] px-3.5 py-2.5 text-sm text-[#0b1220] dark:text-[#f1f5f9] outline-none focus:bg-white dark:focus:bg-[#1e293b] focus:border-[#5b5bf5] dark:focus:border-[#818cf8]">
                    <option>IST — Asia/Kolkata</option>
                    <option>UTC</option>
                    <option>EST — America/New_York</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button className="rounded-full bg-[#0b1220] text-white px-5 py-2 text-xs font-bold hover:bg-[#1a2744]">Save profile</button>
              <button className="rounded-full bg-white border border-[#e6e8f2] px-5 py-2 text-xs font-semibold text-[#0b1220]">Cancel</button>
            </div>
          </Card>

          {/* Interview Focus */}
          <Card className="p-5 md:p-6">
            <h2 className="text-sm font-bold text-[#0b1220]">Interview focus</h2>
            <p className="text-xs text-[#8a8fa8] mt-0.5">Pick pillars to prioritize. Affects your daily drills and mock weighting.</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { label: "System Design", active: true },
                { label: "DSA", active: true },
                { label: "Behavioral", active: false },
                { label: "Leadership", active: false },
                { label: "Case Study", active: true },
                { label: "Communication", active: false },
              ].map((p) => (
                <button
                  key={p.label}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition-colors ${p.active ? "bg-[#0b1220] text-white border-[#0b1220]" : "bg-white border-[#e6e8f2] text-[#67708f] hover:bg-[#f6f7fb]"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-[#0b1220]">Difficulty</span>
                <select className="mt-1.5 w-full rounded-xl border border-[#e6e8f2] dark:border-[#334155] bg-[#f6f7fb] dark:bg-[#18233a] px-3.5 py-2.5 text-sm text-[#0b1220] dark:text-[#f1f5f9] outline-none focus:bg-white dark:focus:bg-[#1e293b] focus:border-[#5b5bf5] dark:focus:border-[#818cf8]">
                  <option>Adaptive (recommended)</option>
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[#0b1220]">Pace</span>
                <select className="mt-1.5 w-full rounded-xl border border-[#e6e8f2] dark:border-[#334155] bg-[#f6f7fb] dark:bg-[#18233a] px-3.5 py-2.5 text-sm text-[#0b1220] dark:text-[#f1f5f9] outline-none focus:bg-white dark:focus:bg-[#1e293b] focus:border-[#5b5bf5] dark:focus:border-[#818cf8]">
                  <option>3 sessions / week</option>
                  <option>5 sessions / week</option>
                  <option>Daily</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[#0b1220]">Coach tone</span>
                <select className="mt-1.5 w-full rounded-xl border border-[#e6e8f2] dark:border-[#334155] bg-[#f6f7fb] dark:bg-[#18233a] px-3.5 py-2.5 text-sm text-[#0b1220] dark:text-[#f1f5f9] outline-none focus:bg-white dark:focus:bg-[#1e293b] focus:border-[#5b5bf5] dark:focus:border-[#818cf8]">
                  <option>Supportive + direct</option>
                  <option>Brutally honest</option>
                  <option>Encouraging</option>
                </select>
              </label>
            </div>
          </Card>

          {/* Notifications */}
          <Card className="p-5 md:p-6">
            <h2 className="text-sm font-bold text-[#0b1220]">Notifications</h2>
            <div className="mt-4 space-y-4">
              {[
                { title: "Email reminders", desc: "Mock due, streak at risk, weekly recap.", value: emailNotif, setter: setEmailNotif },
                { title: "Push notifications", desc: "Only for live cohorts and peer invites.", value: pushNotif, setter: setPushNotif },
                { title: "Weekly digest", desc: "Sunday summary with next-week plan.", value: weeklyDigest, setter: setWeeklyDigest },
              ].map((row) => (
                <div key={row.title} className="flex items-center justify-between gap-4 rounded-xl bg-[#f6f7fb] border border-[#e6e8f2] px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-[#0b1220]">{row.title}</div>
                    <div className="text-xs text-[#8a8fa8]">{row.desc}</div>
                  </div>
                  <button
                    onClick={() => row.setter((v) => !v)}
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${row.value ? "bg-[#5b5bf5]" : "bg-[#d6d9eb]"}`}
                    aria-pressed={row.value}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${row.value ? "right-0.5" : "left-0.5"}`} />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Danger */}
          <Card className="p-5 border-amber-200">
            <h2 className="text-sm font-bold text-[#b45309]">Danger zone</h2>
            <p className="text-xs text-[#8a8fa8] mt-1">Export your data or delete your account. This UI is static.</p>
            <div className="mt-3 flex gap-2">
              <button className="rounded-full bg-white border border-[#e6e8f2] px-4 py-2 text-xs font-semibold text-[#0b1220]">Export data</button>
              <button className="rounded-full bg-[#fef2f2] border border-[#fecaca] px-4 py-2 text-xs font-semibold text-[#b91c1c]">Delete account</button>
            </div>
          </Card>
        </div>

        {/* Right rail */}
        <div className="space-y-4 self-start">
          <Card className="p-5">
            <div className="text-xs font-semibold tracking-[0.12em] text-[#a0a6c2]">APPEARANCE</div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[#e6e8f2] px-3 py-2.5 bg-[#f6f7fb]">
                <div>
                  <div className="text-sm font-medium text-[#0b1220]">Dark theme</div>
                  <div className="text-xs text-[#8a8fa8]">Toggle dark mode (persists)</div>
                </div>
                <button
                  onClick={toggle}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${theme === "dark" ? "bg-[#5b5bf5]" : "bg-[#d6d9eb]"}`}
                  aria-pressed={theme === "dark"}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${theme === "dark" ? "right-0.5" : "left-0.5"}`} />
                </button>
              </div>
              <label className="flex items-center justify-between gap-3 rounded-xl border border-[#e6e8f2] px-3 py-2.5 bg-[#f6f7fb]">
                <span className="text-sm font-medium text-[#0b1220]">Collapsed sidebar by default</span>
                <input type="checkbox" className="w-4 h-4 rounded border-[#d6d9eb] text-[#5b5bf5]" />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-xl border border-[#e6e8f2] px-3 py-2.5">
                <span className="text-sm font-medium text-[#0b1220]">Compact density</span>
                <input type="checkbox" className="w-4 h-4 rounded border-[#d6d9eb] text-[#5b5bf5]" />
              </label>
            </div>
            <div className="mt-3 text-xs leading-4 text-[#8a8fa8]">Sidebar expand/collapse is fixed + animated (full-height), matching your request. Toggle with the chevron in header/sidebar or the theme switch above.</div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-[#0b1220] to-[#1e1b4b] text-white border-[#0b1220]">
            <div className="text-sm font-bold">Pro tip</div>
            <div className="text-xs leading-4 opacity-80 mt-1">Keep your focus to 2 pillars for 14 days. Your readiness bar moves fastest with depth, not breadth.</div>
            <button className="mt-3 rounded-full bg-white text-[#0b1220] px-4 py-2 text-xs font-bold">View readiness history →</button>
          </Card>

          <Card className="p-5">
            <div className="text-xs font-semibold tracking-[0.12em] text-[#a0a6c2]">NAVIGATION</div>
            <ul className="mt-3 space-y-1.5 text-sm">
              <li><Link href="/" className="text-[#5b5bf5] font-semibold hover:underline">→ Dashboard</Link></li>
              <li><Link href="/practice" className="text-[#67708f] hover:text-[#0b1220]">→ Practice</Link></li>
              <li><Link href="/resources" className="text-[#67708f] hover:text-[#0b1220]">→ Resources</Link></li>
              <li><Link href="/community" className="text-[#67708f] hover:text-[#0b1220]">→ Community</Link></li>
            </ul>
            <div className="mt-3 text-xs text-[#8a8fa8]">All sidebar items now route correctly. No more /resources mis-wire.</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
