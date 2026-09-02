import Link from "next/link";
import { Card, CardSoft } from "@/components/ui/Card";
import { Badge, Label } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function DashboardView() {
  return (
    <div className="px-4 md:px-6 lg:px-8 py-6 pb-20 md:pb-6">
      {/* — Header — */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div>
          <Label>Career dashboard</Label>
          <h1 className="mt-1 text-[30px] md:text-[34px] font-extrabold tracking-tight text-[#0b1220] leading-none">
            Good morning, Jane
          </h1>
          <p className="mt-2 text-sm leading-5 text-[#67708f] max-w-[560px]">
            You&apos;re making strong progress. 3 sessions this week — keep the streak going and sharpen your System Design edge.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link href="/practice" className="inline-flex items-center gap-2 bg-[#0b1220] text-white rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm hover:bg-[#1a2744]">
              Start mock interview
              <span className="w-5 h-5 rounded-full bg-white text-[#0b1220] grid place-items-center text-[10px]">→</span>
            </Link>
            <button className="inline-flex items-center gap-2 bg-white border border-[#e6e8f2] rounded-full px-4 py-2.5 text-sm font-medium text-[#0b1220] shadow-sm">
              Watch walkthrough
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#ff7eb0] to-[#ffcc6a] grid place-items-center text-white text-[10px]">▶</span>
            </button>
          </div>
        </div>

        <Card className="p-4 flex items-center gap-4 min-w-[220px] self-start lg:self-auto">
          <div className="w-12 h-12 rounded-2xl bg-[#0b1220] text-white grid place-items-center">
            <span className="text-sm font-bold">82</span>
          </div>
          <div>
            <div className="text-[11px] font-semibold tracking-[0.12em] text-[#a0a6c2]">READINESS SCORE</div>
            <div className="text-sm font-bold text-[#0b1220]">82 / 100 <span className="text-xs font-medium text-[#10b981]">↑ 4 this week</span></div>
            <div className="mt-1.5 h-1.5 w-32 rounded-full bg-[#eef0ff] overflow-hidden">
              <div className="h-full w-[82%] bg-[#0b1220] rounded-full" />
            </div>
          </div>
        </Card>
      </div>

      {/* — Stats — */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { k: "Sessions", v: "24", sub: "last 30 days", accent: "bg-[#eef0ff] text-[#5b5bf5]" },
          { k: "Avg. score", v: "8.4", sub: "/10 • +0.6", accent: "bg-[#e6fffa] text-[#0d9488]" },
          { k: "Day streak", v: "12", sub: "days • keep it up", accent: "bg-[#fef3c7] text-[#d97706]" },
          { k: "Completion", v: "68%", sub: "of your plan", accent: "bg-[#fce7f3] text-[#db2777]" },
        ].map((s) => (
          <Card key={s.k} className="p-4">
            <div className="text-[10px] font-semibold tracking-[0.14em] text-[#a0a6c2]">{s.k.toUpperCase()}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[22px] font-extrabold tracking-tight text-[#0b1220]">{s.v}</span>
              <span className="text-xs text-[#8a8fa8]">{s.sub}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* — Main grid — */}
      <div className="mt-6 grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* Left */}
        <div className="space-y-6">
          {/* Filter pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-xs font-semibold bg-[#0b1220] text-white rounded-full px-4 py-1.5 shrink-0">For you</span>
            <Link href="/practice" className="shrink-0 bg-white border border-[#e6e8f2] text-[#67708f] rounded-full px-4 py-1.5 text-xs font-medium">Tech</Link>
            <Link href="/practice" className="shrink-0 bg-white border border-[#e6e8f2] text-[#67708f] rounded-full px-4 py-1.5 text-xs font-medium">Behavioral</Link>
            <Link href="/practice" className="shrink-0 bg-white border border-[#e6e8f2] text-[#67708f] rounded-full px-4 py-1.5 text-xs font-medium">Case Study</Link>
            <Link href="/practice" className="shrink-0 bg-white border border-[#e6e8f2] text-[#67708f] rounded-full px-4 py-1.5 text-xs font-medium">Leadership</Link>
            <Link href="/practice" className="shrink-0 w-7 h-7 grid place-items-center bg-white border border-[#e6e8f2] rounded-full text-[#67708f]">+</Link>
          </div>

          {/* Continue / Recent */}
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#0b1220]">Recent sessions</h2>
              <Link href="/practice" className="text-xs font-semibold text-[#4f46e5] hover:underline">View all</Link>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* New session - primary action */}
              <Link href="/practice" className="rounded-2xl border border-dashed border-[#d6d9eb] bg-white p-5 flex flex-col items-center justify-center text-center min-h-[168px] hover:bg-[#f6f7fb] transition-colors group">
                <span className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff7eb0] to-[#ffcc6a] text-white grid place-items-center text-lg shadow-sm group-hover:scale-105 transition-transform">+</span>
                <div className="mt-3 text-sm font-semibold text-[#0b1220]">New mock session</div>
                <div className="mt-1 text-xs leading-4 text-[#8a8fa8] max-w-[180px]">Pick a role, get AI coaching, and improve with instant feedback.</div>
                <span className="mt-3 text-xs font-semibold text-[#5b5bf5]">Start now →</span>
              </Link>

              {[
                { role: "Senior React Dev", when: "Today • 24 min", score: "9.0", coach: "Alex", color: "bg-[#ff8fa0]", pct: 92 },
                { role: "Product Designer", when: "Yesterday • 18 min", score: "8.4", coach: "Sam", color: "bg-[#a78bfa]", pct: 84 },
                { role: "Backend Architect", when: "12 May • 32 min", score: "7.6", coach: "Jordan", color: "bg-[#fb7185]", pct: 76 },
              ].map((c) => (
                <Card key={c.role} className="p-4 flex flex-col min-h-[168px] hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <span className={`w-8 h-8 rounded-lg ${c.color} grid place-items-center text-white text-xs font-bold`}>{c.role[0]}</span>
                    <Badge>{c.score} /10</Badge>
                  </div>
                  <div className="mt-3 text-[13px] font-bold text-[#0b1220] leading-tight">{c.role}</div>
                  <div className="text-[11px] text-[#a0a6c2]">{c.when}</div>
                  <div className="mt-auto pt-4">
                    <div className="flex items-center justify-between text-[11px] text-[#67708f]">
                      <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" /> Coach {c.coach}</span>
                      <span className="text-[#a0a6c2]">{c.pct}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-[#eef0ff] overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#6d5cff] to-[#b07cff] rounded-full" style={{ width: `${c.pct}%` }} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#0b1220]">Your skills</h2>
              <span className="text-xs text-[#8a8fa8]">Based on last 12 sessions</span>
            </div>

            <div className="mt-3 space-y-3">
              {[
                { name: "System Design", note: "Strong momentum", eng: 88, score: 86, icon: "◈", bg: "bg-[#eef0ff]" },
                { name: "Communication", note: "Consistently high", eng: 92, score: 90, icon: "◎", bg: "bg-[#e6fffa]" },
                { name: "Problem Solving", note: "Needs focus", eng: 71, score: 74, icon: "⬢", bg: "bg-[#fef3c7]" },
                { name: "Behavioral & Leadership", note: "New focus area", eng: 64, score: 68, icon: "✦", bg: "bg-[#fce7f3]" },
              ].map((row) => (
                <Card key={row.name} className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className={`w-9 h-9 rounded-xl ${row.bg} grid place-items-center text-sm shrink-0`}>{row.icon}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#0b1220] leading-none truncate">{row.name}</div>
                      <div className="text-[11px] text-[#a0a6c2] tracking-wide">{row.note}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 md:gap-8">
                    <div className="text-center">
                      <div className="text-[10px] font-semibold tracking-[0.12em] text-[#a0a6c2]">ENGAGEMENT</div>
                      <div className="mt-1 inline-flex items-center rounded-full bg-[#f6f7fb] border border-[#e6e8f2] px-3 py-1 text-xs font-bold">{row.eng}%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-semibold tracking-[0.12em] text-[#a0a6c2]">SCORE</div>
                      <div className="mt-1 inline-flex items-center rounded-full bg-[#f6f7fb] border border-[#e6e8f2] px-3 py-1 text-xs font-bold">{row.score}%</div>
                    </div>
                    <div className="hidden sm:flex items-center -space-x-2">
                      <span className="w-7 h-7 rounded-full bg-[#ffcc8a] border-2 border-white grid place-items-center text-[10px]">A</span>
                      <span className="w-7 h-7 rounded-full bg-[#a5b4fc] border-2 border-white grid place-items-center text-[10px]">B</span>
                      <span className="w-7 h-7 rounded-full bg-[#0b1220] border-2 border-white grid place-items-center text-[10px] font-bold text-white">+12</span>
                    </div>
                  </div>

                  <Button variant="primary" size="sm" className="w-full md:w-auto shrink-0">
                    Open report
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          <CardSoft className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold tracking-[0.12em] text-[#a0a6c2]">WEEKLY GOAL</div>
                <div className="mt-1 text-sm font-bold text-[#0b1220]">3 / 4 sessions</div>
                <div className="text-xs text-[#8a8fa8]">One more to hit your target</div>
              </div>
              <span className="w-8 h-8 rounded-full bg-white border border-[#e6e8f2] grid place-items-center text-[#0b1220]">+</span>
            </div>
            <div className="mt-4 h-2 rounded-full bg-white border border-[#e6e8f2] overflow-hidden p-0.5">
              <div className="h-full w-[75%] bg-gradient-to-r from-[#6d5cff] to-[#ff7eb0] rounded-full" />
            </div>
            <Link href="/practice" className="mt-3 inline-flex w-full justify-center rounded-full bg-[#0b1220] text-white text-xs font-semibold py-2.5 hover:bg-[#1a2744]">
              Plan next session
            </Link>
          </CardSoft>

          <Card className="p-5">
            <div className="text-xs font-semibold tracking-[0.12em] text-[#a0a6c2]">UP NEXT</div>
            <div className="mt-3 flex gap-3 rounded-xl bg-[#f6f7fb] border border-[#e6e8f2] p-3">
              <div className="w-10 h-10 rounded-xl bg-[#0b1220] text-white grid place-items-center text-xs font-bold shrink-0">LIVE</div>
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-tight text-[#0b1220]">DSA Deep Dive — Live cohort</div>
                <div className="text-xs text-[#8a8fa8]">Today • 7:30 PM IST • 45 min</div>
                <button className="mt-2 text-xs font-semibold text-[#5b5bf5]">Reserve spot →</button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                { n: "742", l: "Peers online" },
                { n: "4.8", l: "Avg rating" },
                { n: "12k+", l: "Mocks done" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl bg-[#f6f7fb] border border-[#e6e8f2] p-2.5">
                  <div className="text-sm font-extrabold text-[#0b1220]">{s.n}</div>
                  <div className="text-[10px] font-semibold tracking-wide text-[#8a8fa8]">{s.l}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-xs font-semibold tracking-[0.12em] text-[#a0a6c2]">FROM YOUR NETWORK</div>
            <div className="mt-3 space-y-3">
              {[
                { a: "Aarav", t: "cracked Staff Engineer loop at Meesho — shared his System Design notes." },
                { a: "Priya", t: "started a 7-day Behavioral sprint. Join and keep each other accountable?" },
              ].map((p) => (
                <div key={p.a} className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-[#eef0ff] grid place-items-center text-[11px] font-bold text-[#5b5bf5] shrink-0">{p.a[0]}</span>
                  <p className="text-xs leading-4 text-[#0b1220]">
                    <span className="font-semibold">{p.a}</span> <span className="text-[#67708f]">{p.t}</span>
                  </p>
                </div>
              ))}
            </div>
            <Link href="/community" className="mt-3 inline-flex text-xs font-semibold text-[#4f46e5] hover:underline">
              Open community →
            </Link>
          </Card>

          {/* Gradient coach card — brand moment */}
          <div className="rounded-2xl bg-gradient-to-br from-[#ff7eb0] via-[#ff9eb5] to-[#ffcc6a] p-4 text-white shadow-sm">
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-full bg-white/90 grid place-items-center text-[#ff7eb0] text-sm">✦</span>
              <div>
                <div className="text-sm font-semibold">Need a nudge, Jane?</div>
                <div className="text-xs leading-4 opacity-90 mt-1">Try a 10-min lightning round to stay warm before your next mock.</div>
                <Link href="/practice" className="mt-3 inline-flex rounded-full bg-white text-[#0b1220] px-4 py-1.5 text-xs font-bold">Start lightning round</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* — Footer hint — */}
      <div className="mt-8 rounded-2xl bg-white border border-[#e6e8f2] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="text-sm text-[#0b1220]">
          <span className="font-semibold">Interview Kit is free for learners.</span> <span className="text-[#67708f]">Upgrade for unlimited AI coaching and detailed reports.</span>
        </div>
        <Link href="/resources" className="inline-flex rounded-full bg-[#eef0ff] text-[#4f46e5] px-4 py-2 text-xs font-bold hover:bg-[#e0e7ff]">
          Explore resources
        </Link>
      </div>
    </div>
  );
}
