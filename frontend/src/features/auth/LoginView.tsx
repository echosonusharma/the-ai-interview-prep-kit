"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginView() {
  const [show, setShow] = useState(false);
  const router = useRouter();

  return (
    <div className="w-full max-w-[980px] grid lg:grid-cols-[1.05fr_1fr] rounded-[20px] overflow-hidden bg-white border border-[#e6e8f2] shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
      {/* Left — brand */}
      <div className="relative hidden lg:flex flex-col p-8 bg-[#0b1220] text-white overflow-hidden auth-keep-dark">
        {/* gradient blobs like RightPanel gradient */}
        <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full bg-gradient-to-br from-[#ff7eb0]/40 to-[#ffcc6a]/40 blur-2xl" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-gradient-to-br from-[#5b5bf5]/30 to-[#b07cff]/30 blur-2xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" /> Live coaching • 12k+ mocks
          </div>
          <h2 className="mt-6 text-[26px] font-extrabold leading-tight tracking-tight">Welcome back.<br />Your next loop is closer.</h2>
          <p className="mt-3 text-sm leading-5 text-white/70 max-w-[360px]">Sign in to continue your streak, review coach feedback, and jump into a 10-minute lightning mock.</p>

          <ul className="mt-8 space-y-3 text-sm">
            {["AI coach that interrupts & probes like a real panel", "Instant rubric: clarity, depth, trade-offs", "Peer mocks from 742 colleges"].map((t) => (
              <li key={t} className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[#ff7eb0] to-[#ffcc6a] grid place-items-center text-[10px] text-white shrink-0 mt-0.5">✓</span>
                <span className="text-white/80">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto relative">
          <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-white/90">★★★★★ <span className="font-normal text-white/60">4.8 from 1.4k learners</span></div>
            <p className="mt-2 text-sm leading-5 text-white/85">“The AI feedback was brutally honest — that&apos;s what got me offer-ready in 3 weeks.”</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-white/60">
              <span className="w-6 h-6 rounded-full bg-[#eef0ff] grid place-items-center text-[10px] font-bold text-[#0b1220]">AS</span> Aarav S. • Staff Engineer, Meesho
            </div>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="p-6 md:p-8 bg-white flex flex-col">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.14em] text-[#a0a6c2]">SIGN IN</div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0b1220]">Welcome back</h1>
          <p className="mt-1 text-sm text-[#67708f]">New here? <Link href="/signup" className="font-semibold text-[#5b5bf5] hover:underline">Create an account</Link></p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button className="inline-flex items-center justify-center gap-2 rounded-full bg-white border border-[#e6e8f2] py-2.5 text-xs font-semibold text-[#0b1220] hover:bg-[#f6f7fb]">
            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09A6.97 6.97 0 015.48 12a6.97 6.97 0 01.36-2.09V7.07H2.18A10.99 10.99 0 001.02 12c0 1.78.42 3.47 1.16 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Google
          </button>
          <button className="inline-flex items-center justify-center gap-2 rounded-full bg-white border border-[#e6e8f2] py-2.5 text-xs font-semibold text-[#0b1220] hover:bg-[#f6f7fb]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5a9.5 9.5 0 00-3 18.5c.47.09.64-.2.64-.45v-1.6c-2.6.56-3.15-1.1-3.15-1.1-.43-1.09-1.05-1.38-1.05-1.38-.86-.59.06-.58.06-.58.95.07 1.45.98 1.45.98.85 1.45 2.22 1.03 2.76.79.08-.62.33-1.03.6-1.27-2.1-.24-4.31-1.05-4.31-4.67 0-1.03.37-1.87.98-2.53-.1-.24-.43-1.2.09-2.5 0 0 .8-.26 2.63.96a9.03 9.03 0 014.79 0c1.82-1.22 2.62-.96 2.62-.96.52 1.3.2 2.26.1 2.5.61.66.98 1.5.98 2.53 0 3.63-2.21 4.43-4.32 4.67.34.3.64.88.64 1.78v2.64c0 .25.17.55.64.45A9.5 9.5 0 0012 2.5z"/></svg> GitHub
          </button>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-[#e6e8f2]" />
          <span className="text-[11px] font-semibold tracking-wide text-[#a0a6c2]">OR CONTINUE WITH EMAIL</span>
          <span className="h-px flex-1 bg-[#e6e8f2]" />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            router.push("/");
          }}
          className="mt-5 space-y-4"
        >
          <label className="block">
            <span className="text-xs font-semibold text-[#0b1220]">Email</span>
            <input
              type="email"
              required
              placeholder="jane@example.com"
              className="mt-1.5 w-full rounded-xl border border-[#e6e8f2] bg-[#f6f7fb] px-3.5 py-2.5 text-sm outline-none focus:bg-white focus:border-[#5b5bf5] focus:ring-4 focus:ring-[#eef0ff] placeholder:text-[#a0a6c2]"
            />
          </label>

          <label className="block">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#0b1220]">Password</span>
              <Link href="/login" className="text-xs font-medium text-[#5b5bf5] hover:underline">Forgot?</Link>
            </div>
            <div className="mt-1.5 relative">
              <input
                type={show ? "text" : "password"}
                required
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#e6e8f2] bg-[#f6f7fb] px-3.5 py-2.5 pr-16 text-sm outline-none focus:bg-white focus:border-[#5b5bf5] focus:ring-4 focus:ring-[#eef0ff] placeholder:text-[#a0a6c2]"
              />
              <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-1 top-1 bottom-1 rounded-full bg-white border border-[#e6e8f2] px-3 text-xs font-semibold text-[#67708f] hover:text-[#0b1220]">
                {show ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <label className="flex items-center gap-2 text-xs text-[#67708f]">
            <input type="checkbox" className="w-3.5 h-3.5 rounded border-[#d6d9eb] text-[#5b5bf5] focus:ring-[#5b5bf5]" defaultChecked />
            Remember me for 30 days
          </label>

          <button type="submit" className="w-full rounded-full bg-[#0b1220] py-3 text-sm font-bold text-white shadow-sm hover:bg-[#1a2744] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5b5bf5]">
            Sign in
          </button>

          <p className="text-center text-xs text-[#8a8fa8]">
            Don&apos;t have an account? <Link href="/signup" className="font-semibold text-[#0b1220] hover:underline">Sign up</Link> • By continuing you agree to our Terms.
          </p>
        </form>
      </div>
    </div>
  );
}
