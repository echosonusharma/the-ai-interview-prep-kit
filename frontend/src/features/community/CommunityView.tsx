import Link from "next/link";
import { Card, CardSoft } from "@/components/ui/Card";
import { Label } from "@/components/ui/Badge";

export default function CommunityView() {
  return (
    <div className="px-4 md:px-6 lg:px-8 py-6 pb-20 md:pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Label>Community</Label>
          <h1 className="mt-1 text-[26px] font-extrabold tracking-tight text-[#0b1220]">You&apos;re not prepping alone</h1>
          <p className="mt-1 text-sm text-[#67708f] max-w-[600px]">Peer mocks, live reviews, and a feed of wins, because momentum is social.</p>
        </div>
        <Link href="/practice" className="rounded-full bg-[#0b1220] text-white px-5 py-2.5 text-xs font-bold shadow-sm">Find a peer mock →</Link>
      </div>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#eef0ff] grid place-items-center text-xs font-bold text-[#5b5bf5]">JD</span>
              <input placeholder="Share a win or ask for a mock..." className="flex-1 rounded-full bg-[#f6f7fb] border border-[#e6e8f2] px-4 py-2 text-sm outline-none focus:border-[#5b5bf5]" />
              <button className="rounded-full bg-[#0b1220] text-white px-4 py-2 text-xs font-semibold">Post</button>
            </div>
          </Card>

          {[
            { name: "Aarav Mehta", role: "Staff Engineer @ Meesho", time: "2h ago", text: "Shared my System Design rubric for Design WhatsApp, scored 9/10. Key was explicit trade-offs on fanout vs. latency. Happy to review yours!", likes: 24 },
            { name: "Sanya Patel", role: "Product Designer", time: "5h ago", text: "Did 3 behavioral mocks this week. The AI coach kept flagging vague ownership. Forced me to rewrite 4 STAR stories. Now they’re actually crisp.", likes: 18 },
            { name: "Rohan Gupta", role: "Backend • 12 mocks", time: "Yesterday", text: "Looking for a DSA partner, targeting 7am IST daily for 30 min. Consistency > intensity. DM if you’re in.", likes: 31 },
          ].map((post) => (
            <Card key={post.name} className="p-5">
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ffcc8a] to-[#a5b4fc] grid place-items-center text-xs font-bold text-white shrink-0">{post.name[0]}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[#0b1220]">{post.name}</span>
                    <span className="text-xs text-[#8a8fa8]">• {post.role}</span>
                    <span className="text-xs text-[#a0a6c2]">• {post.time}</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-5 text-[#1f2937]">{post.text}</p>
                  <div className="mt-3 flex items-center gap-4 text-xs font-medium text-[#8a8fa8]">
                    <button className="hover:text-[#0b1220]">♡ {post.likes}</button>
                    <button className="hover:text-[#0b1220]">↗ Share</button>
                    <button className="hover:text-[#0b1220]">Offer mock</button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <CardSoft className="p-5">
            <div className="text-xs font-semibold tracking-[0.12em] text-[#a0a6c2]">LEADERBOARD</div>
            <div className="mt-3 space-y-2.5">
              {[
                { n: "D. Kim", s: "9.6", c: "32 mocks" },
                { n: "You (Jane)", s: "8.4", c: "24 mocks", me: true },
                { n: "M. Singh", s: "8.3", c: "28 mocks" },
              ].map((r) => (
                <div key={r.n} className={`flex items-center justify-between rounded-xl px-3 py-2.5 border ${r.me ? "bg-white border-[#5b5bf5]/20 shadow-sm" : "bg-white border-[#e6e8f2]"}`}>
                  <span className={`text-sm font-semibold ${r.me ? "text-[#4f46e5]" : "text-[#0b1220]"}`}>{r.n}</span>
                  <span className="text-xs text-[#8a8fa8]">{r.c} • <span className="font-bold text-[#0b1220]">{r.s}</span></span>
                </div>
              ))}
            </div>
            <Link href="/practice" className="mt-3 inline-flex w-full justify-center rounded-full bg-white border border-[#e6e8f2] py-2 text-xs font-semibold text-[#0b1220]">View full board</Link>
          </CardSoft>

          <Card className="p-5">
            <div className="text-xs font-semibold tracking-[0.12em] text-[#a0a6c2]">UPCOMING EVENTS</div>
            <div className="mt-3 space-y-3">
              {[
                { t: "Live AMA: Hiring managers spill", d: "Tomorrow • 8 PM IST" },
                { t: "System Design throwdown", d: "Sat • 11 AM IST" },
                { t: "Mock marathon week", d: "Apr 20–26" },
              ].map((e) => (
                <div key={e.t} className="flex gap-3 rounded-xl bg-[#f6f7fb] border border-[#e6e8f2] p-3">
                  <span className="w-8 h-8 rounded-lg bg-[#0b1220] text-white grid place-items-center text-[11px] font-bold shrink-0">◉</span>
                  <div>
                    <div className="text-sm font-semibold leading-tight text-[#0b1220]">{e.t}</div>
                    <div className="text-xs text-[#8a8fa8]">{e.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="rounded-2xl bg-[#0b1220] p-5 text-white">
            <div className="text-sm font-bold">742 colleges, 12k learners</div>
            <div className="text-xs opacity-70 mt-1 leading-4">Join the cohort that preps together. Peer mocks are the fastest way to close the last 10%.</div>
            <Link href="/practice" className="mt-3 inline-flex rounded-full bg-white text-[#0b1220] px-4 py-2 text-xs font-bold">Invite a friend</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
