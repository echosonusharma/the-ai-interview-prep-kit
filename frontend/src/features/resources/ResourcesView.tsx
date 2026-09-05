import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Badge";

const featured = [
  { title: "System Design: The Field Guide", tag: "Playbook", read: "18 min", color: "bg-[#eef0ff]" },
  { title: "Behavioral: Writing STAR stories that land", tag: "Essay", read: "9 min", color: "bg-[#e6fffa]" },
  { title: "DSA Patterns you actually need for 2026", tag: "Cheat sheet", read: "12 min", color: "bg-[#fef3c7]" },
];

export default function ResourcesView() {
  return (
    <div className="px-4 md:px-6 lg:px-8 py-6 pb-20 md:pb-6">
      <div>
        <Label>Resources</Label>
        <h1 className="mt-1 text-[26px] font-extrabold tracking-tight text-[#0b1220]">Learn with intent</h1>
        <p className="mt-1 text-sm text-[#67708f] max-w-[640px]">Curated playbooks, annotated recordings, and drills, all mapped to the same rubric your mock coach uses.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
        <Card className="p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-[#0b1220] via-[#1e1b4b] to-[#4f46e5] p-6 text-white">
            <div className="inline-flex rounded-full bg-white/15 border border-white/20 px-3 py-1 text-[11px] font-semibold tracking-wide">NEW • Cohort starts Apr 14</div>
            <h2 className="mt-3 text-xl font-bold leading-tight max-w-[420px]">The AI Interview OS: 4 weeks, 8 mocks, 1 offer loop</h2>
            <p className="mt-2 text-sm leading-5 opacity-80 max-w-[520px]">A mentor-led program with daily drills, live reviews, and a final panel. Built for the 2026 hiring bar.</p>
            <div className="mt-4 flex gap-2">
              <Link href="/practice" className="rounded-full bg-white text-[#0b1220] px-4 py-2 text-xs font-bold">Join waitlist</Link>
              <button className="rounded-full bg-white/10 border border-white/20 px-4 py-2 text-xs font-semibold">View syllabus</button>
            </div>
          </div>
          <div className="p-4 flex items-center justify-between text-xs">
            <span className="text-[#67708f]">12 mentors • 1.4k alumni • 4.8★</span>
            <Link href="/community" className="font-semibold text-[#4f46e5]">Hear from alumni →</Link>
          </div>
        </Card>

        <div className="space-y-3">
          {featured.map((f) => (
            <Card key={f.title} className="p-4 flex gap-3 hover:shadow-md transition-shadow">
              <span className={`w-10 h-10 rounded-xl ${f.color} grid place-items-center text-sm shrink-0`}>◆</span>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold tracking-wide text-[#a0a6c2]">{f.tag} • {f.read}</div>
                <div className="text-sm font-semibold leading-tight text-[#0b1220] mt-0.5">{f.title}</div>
                <button className="mt-2 text-xs font-semibold text-[#4f46e5]">Read →</button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { h: "Question Bank", p: "600+ prompts tagged by company, role, and rubric. Filter and practice in 2 clicks.", cta: "Explore bank" },
          { h: "Recordings Library", p: "Watch real mocks with time-stamped coaching. See what a 9/10 looks like.", cta: "Watch library" },
          { h: "Weekly Drills", p: "15-min daily reps for DSA, comms, and system design. Streak-friendly.", cta: "Start drill" },
        ].map((b) => (
          <Card key={b.h} className="p-5">
            <div className="text-sm font-bold text-[#0b1220]">{b.h}</div>
            <div className="mt-1 text-xs leading-4 text-[#67708f] min-h-[48px]">{b.p}</div>
            <Link href="/practice" className="mt-4 inline-flex rounded-full border border-[#e6e8f2] bg-[#f6f7fb] px-4 py-2 text-xs font-semibold text-[#0b1220]">{b.cta} →</Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
