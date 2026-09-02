"use client";

import Link from "next/link";

export function NotFoundView({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "py-12" : "min-h-[60vh] flex items-center justify-center p-4 md:p-6"}>
      <div className="w-full max-w-[640px]">
        <div className="rounded-[24px] bg-white dark:bg-[#1e293b] border border-[#e6e8f2] dark:border-[#334155] shadow-[0_12px_40px_rgba(15,23,42,0.08)] overflow-hidden">
          <div className="p-7 md:p-9 text-center">
            {/* 404 mark */}
            <div className="mx-auto w-fit rounded-full bg-[#f6f7fb] dark:bg-[#18233a] border border-[#e6e8f2] dark:border-[#334155] px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-[#a0a6c2] dark:text-[#94a3b8]">
              ERROR 404
            </div>

            <div className="mt-4 flex justify-center">
              <span className="text-[56px] md:text-[72px] font-extrabold tracking-[-0.04em] leading-none bg-gradient-to-br from-[#5b5bf5] via-[#ff7eb0] to-[#ffb86a] bg-clip-text text-transparent">
                404
              </span>
            </div>

            <h1 className="mt-2 text-[22px] md:text-[26px] font-extrabold tracking-tight text-[#0b1220] dark:text-white">Lost in the pilot route?</h1>
            <p className="mt-2 text-sm leading-5 text-[#67708f] dark:text-[#94a3b8] max-w-[420px] mx-auto">
              The page you’re looking for doesn’t exist or was moved. Check the URL or jump back to your dashboard and continue prepping.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
              <Link
                href="/"
                className="inline-flex justify-center items-center gap-2 rounded-full bg-[#0b1220] dark:bg-[#f1f5f9] text-white dark:text-[#0f172a] px-6 py-2.5 text-sm font-bold shadow-sm hover:bg-[#1a2744] dark:hover:bg-white"
              >
                Back to dashboard
                <span className="w-5 h-5 rounded-full bg-white dark:bg-[#0b1220] text-[#0b1220] dark:text-white grid place-items-center text-xs">→</span>
              </Link>
              <Link
                href="/practice"
                className="inline-flex justify-center rounded-full bg-white dark:bg-[#18233a] border border-[#e6e8f2] dark:border-[#334155] px-6 py-2.5 text-sm font-semibold text-[#0b1220] dark:text-white hover:bg-[#f6f7fb] dark:hover:bg-[#1e2a4a]"
              >
                Browse practice
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs">
              <Link href="/resources" className="rounded-full bg-[#f6f7fb] dark:bg-[#1e2a4a] border border-[#e6e8f2] dark:border-[#334155] px-3 py-1.5 font-medium text-[#67708f] dark:text-[#cbd5e1] hover:bg-white dark:hover:bg-[#232f4a]">
                Resources
              </Link>
              <Link href="/community" className="rounded-full bg-[#f6f7fb] dark:bg-[#1e2a4a] border border-[#e6e8f2] dark:border-[#334155] px-3 py-1.5 font-medium text-[#67708f] dark:text-[#cbd5e1] hover:bg-white dark:hover:bg-[#232f4a]">
                Community
              </Link>
              <Link href="/settings" className="rounded-full bg-[#f6f7fb] dark:bg-[#1e2a4a] border border-[#e6e8f2] dark:border-[#334155] px-3 py-1.5 font-medium text-[#67708f] dark:text-[#cbd5e1] hover:bg-white dark:hover:bg-[#232f4a]">
                Settings
              </Link>
            </div>
          </div>

          <div className="px-7 md:px-9 py-4 bg-[#f6f7fb] dark:bg-[#0f172a] border-t border-[#e6e8f2] dark:border-[#1e2a4a] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#8a8fa8] dark:text-[#64748b]">
            <span>Need help? <Link href="/community" className="font-semibold text-[#5b5bf5] dark:text-[#818cf8] hover:underline">Ask the community</Link></span>
            <span className="font-mono text-[11px]">PrepPilot AI • 404</span>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-[#a0a6c2] dark:text-[#64748b]">
          If you think this is a bug, <Link href="/community" className="underline hover:text-[#67708f] dark:hover:text-[#94a3b8]">let us know</Link>.
        </p>
      </div>
    </div>
  );
}
