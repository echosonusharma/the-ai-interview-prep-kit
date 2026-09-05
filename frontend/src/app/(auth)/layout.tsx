import Link from "next/link";
import { ShaderBackground } from "@/components/shader/ShaderBackground";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col relative isolate overflow-x-clip">
      {/* minimal top bar for auth - back to home */}
      <header className="w-full bg-transparent relative z-10">
        <div className="max-w-[1440px] w-full mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#0b1220] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="currentColor" />
              </svg>
            </div>
            <span className="font-semibold text-sm tracking-tight text-[#0b1220]">PrepPilot AI</span>
            <span className="hidden sm:inline text-[10px] font-semibold tracking-widest text-[#0b1220] ml-1 border border-[#0b1220]/10 bg-white rounded-full px-2 py-0.5">INTERVIEW KIT</span>
          </Link>
        </div>
      </header>
      <ShaderBackground />
      <main className="flex-1 flex items-center justify-center p-4 md:p-6 relative z-10">{children}</main>
      <footer className="py-4 text-center text-[11px] text-white/70 relative z-10">© {new Date().getFullYear()} PrepPilot AI • <Link href="/resources" className="hover:text-white hover:underline">Privacy</Link> • <Link href="/resources" className="hover:text-white hover:underline">Terms</Link></footer>
    </div>
  );
}
