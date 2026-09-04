"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#f6f7fb]">
      <Topbar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        onMobileToggle={() => setMobileOpen((v) => !v)}
      />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Desktop sidebar - fixed, expandable */}
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex" role="dialog" aria-modal="true" aria-label="Navigation">
            <button
              type="button"
              aria-label="Close navigation"
              className="flex-1 bg-black/30 backdrop-blur-sm cursor-default"
              onClick={() => setMobileOpen(false)}
            />
            <div className="w-[260px] bg-white border-r border-[#e6e8f2] flex flex-col overflow-hidden shadow-xl">
              <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} mobile />
            </div>
          </div>
        )}

        {/* Main - scrollable, full width */}
        <main className="flex-1 min-w-0 overflow-auto bg-[#f6f7fb]">{children}</main>
      </div>
    </div>
  );
}
