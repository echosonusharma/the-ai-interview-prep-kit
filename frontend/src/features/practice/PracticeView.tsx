import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Badge";

const tracks = [
  {
    id: "tech",
    title: "Tech & DSA",
    desc: "Arrays, graphs, DP, and system design. AI rates code, clarity, and trade-offs.",
    level: "Popular",
    color: "bg-[#eef0ff]",
    icon: "◈",
    stats: "1.2k practicing",
  },
  {
    id: "behavioral",
    title: "Behavioral",
    desc: "STAR stories, leadership, conflict. Get feedback on structure and empathy.",
    level: "New drop",
    color: "bg-[#e6fffa]",
    icon: "◎",
    stats: "420 practicing",
  },
  {
    id: "case",
    title: "Case Study",
    desc: "Product sense, metrics, and execution under timed pressure.",
    level: "Intermediate",
    color: "bg-[#fef3c7]",
    icon: "⬢",
    stats: "890 practicing",
  },
  {
    id: "leadership",
    title: "Leadership",
    desc: "Hiring, ownership, and org design — for EM & Staff loops.",
    level: "Advanced",
    color: "bg-[#fce7f3]",
    icon: "✦",
    stats: "310 practicing",
  },
  {
    id: "frontend",
    title: "Frontend System",
    desc: "Design UIs at scale: performance, accessibility, state, and SSR.",
    level: "Featured",
    color: "bg-[#e0e7ff]",
    icon: "▦",
    stats: "650 practicing",
  },
  {
    id: "marketing",
    title: "Marketing & GTMS",
    desc: "Positioning, funnels, and narrative for GTM interviews.",
    level: "Beginner",
    color: "bg-[#f1f5f9]",
    icon: "⬣",
    stats: "180 practicing",
  },
];

export default function PracticeView() {
  return (
    <div className="px-4 md:px-6 lg:px-8 py-6 pb-20 md:pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Label>Practice</Label>
          <h1 className="mt-1 text-[26px] font-extrabold tracking-tight text-[#0b1220]">Pick your arena</h1>
          <p className="mt-1 text-sm text-[#67708f] max-w-[600px]">Choose a track. Every session is a real interview simulation with an AI coach who interrupts, probes, and scores you.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-white border border-[#e6e8f2] px-3 py-2">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <span className="text-xs font-medium text-[#0b1220]">Live coaching available</span>
          </div>
          <Link href="/" className="rounded-full bg-[#0b1220] text-white px-4 py-2 text-xs font-semibold">Resume last →</Link>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {["All", "Tech", "Behavioral", "Case Study", "Leadership", "Marketing"].map((t, i) => (
          <button
            key={t}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium border ${i === 0 ? "bg-[#0b1220] text-white border-[#0b1220]" : "bg-white border-[#e6e8f2] text-[#67708f]"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tracks.map((track) => (
          <Card key={track.id} className="p-5 flex flex-col hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-3">
              <span className={`w-9 h-9 rounded-xl ${track.color} grid place-items-center text-sm`}>{track.icon}</span>
              <span className="text-[10px] font-bold tracking-wide bg-[#f6f7fb] border border-[#e6e8f2] rounded-full px-2.5 py-1">{track.level}</span>
            </div>
            <h3 className="mt-3 text-sm font-bold text-[#0b1220]">{track.title}</h3>
            <p className="mt-1 text-xs leading-4 text-[#67708f] min-h-[40px]">{track.desc}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[11px] text-[#8a8fa8]">{track.stats}</span>
              <span className="text-[11px] font-semibold text-[#5b5bf5]">12 mock sets</span>
            </div>
            <div className="mt-4 flex gap-2">
              <Link href="/" className="flex-1 inline-flex justify-center rounded-full bg-[#0b1220] text-white text-xs font-semibold py-2.5 hover:bg-[#1a2744]">
                Start session
              </Link>
              <button className="rounded-full bg-white border border-[#e6e8f2] px-4 py-2.5 text-xs font-semibold text-[#0b1220]">Preview</button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="text-sm font-bold text-[#0b1220]">Can&apos;t decide?</div>
          <div className="text-xs text-[#67708f] mt-1">Take a 3-minute placement. We&apos;ll map your weakest loop and schedule it.</div>
        </div>
        <Link href="/" className="inline-flex rounded-full bg-gradient-to-br from-[#ff7eb0] to-[#ffcc6a] text-white px-5 py-2.5 text-xs font-bold shadow-sm">Run placement →</Link>
      </Card>
    </div>
  );
}
