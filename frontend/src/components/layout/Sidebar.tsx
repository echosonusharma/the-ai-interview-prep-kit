"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { isNavActive, navItems } from "@/config/nav";
import { useAuth, userDisplayName, userInitials } from "@/contexts/AuthContext";

export function Sidebar({
  collapsed = false,
  onToggle,
  mobile = false,
}: {
  collapsed?: boolean;
  onToggle?: () => void;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  // collapsed => 68px, expanded => 220px
  const width = collapsed ? "w-[68px]" : "w-[220px]";
  const containerClass = mobile
    ? "w-full h-full bg-white flex flex-col py-4"
    : `hidden md:flex ${width} shrink-0 bg-white border-r border-[#e6e8f2] flex-col py-3 transition-all duration-300 ease-in-out sticky top-14 h-[calc(100vh-56px)] self-start overflow-hidden z-20`;

  return (
    <aside className={containerClass}>
      <nav className={`flex flex-col gap-1.5 ${collapsed ? "items-center px-2" : "px-2"}`} aria-label="Primary">
        {navItems.map((item) => {
          const active = isNavActive(item, pathname);
          const Icon = item.Icon ?? LayoutDashboard;
          if (collapsed) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={`w-10 h-10 rounded-2xl grid place-items-center border transition-all ${
                  active
                    ? "bg-[#eef0ff] border-[#e6e8f2] shadow-sm"
                    : "bg-[#f1f2f9] border-transparent hover:bg-[#eef0ff]"
                }`}
              >
                <Icon
                  size={17}
                  strokeWidth={2.1}
                  aria-hidden
                  className={active ? "text-[#5b5bf5]" : "text-[#8a8fa8]"}
                />
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group flex items-center gap-3 rounded-2xl px-2.5 py-2 border transition-all ${
                active
                  ? "bg-[#eef0ff] border-[#e6e8f2] text-[#0b1220] shadow-sm"
                  : "border-transparent text-[#67708f] hover:bg-[#f6f7fb] hover:text-[#0b1220]"
              }`}
            >
              <span
                className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 transition-colors ${
                  active
                    ? "bg-white border border-[#e6e8f2] shadow-sm"
                    : "bg-[#f1f2f9] group-hover:bg-white group-hover:border group-hover:border-[#e6e8f2]"
                }`}
              >
                <Icon
                  size={17}
                  strokeWidth={2.1}
                  aria-hidden
                  className={active ? "text-[#5b5bf5]" : "text-[#8a8fa8]"}
                />
              </span>
              <span className="flex-1 min-w-0 text-left">
                <span className="block text-[13px] font-bold leading-tight truncate">{item.label}</span>
                <span className="mt-0.5 block text-[11px] font-medium leading-tight truncate text-[#8a8fa8]">
                  {item.desc}
                </span>
              </span>
              {active && <span className="w-1.5 h-1.5 rounded-full bg-[#5b5bf5] shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom profile */}
      <div className={`mt-auto pt-4 border-t border-[#e6e8f2] ${collapsed ? "mx-2 flex flex-col items-center gap-2" : "mx-2 p-2 rounded-xl bg-[#f6f7fb] border"}`}>
        <div className={`flex items-center gap-2.5 ${collapsed ? "justify-center" : ""}`}>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ffcc8a] to-[#ff8fa0] p-[2px] shrink-0">
            <div className="w-full h-full rounded-full bg-white dark:bg-[#1e293b] grid place-items-center text-[10px] font-bold text-[#0b1220] dark:text-white">{loading ? "" : userInitials(user)}</div>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-xs font-semibold leading-none text-[#0b1220] truncate">
                {loading ? "…" : userDisplayName(user)}
              </div>
              <div className="text-[11px] leading-none text-[#8a8fa8] truncate">{user?.email ?? ""}</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <Link href="/settings" className="mt-2 w-full inline-flex justify-center rounded-full bg-white border border-[#e6e8f2] py-1.5 text-xs font-semibold text-[#0b1220] hover:bg-white">
            Settings
          </Link>
        )}
      </div>

      {/* Expand button when collapsed (desktop) */}
      {collapsed && !mobile && (
        <button
          onClick={onToggle}
          className="mt-2 mx-auto w-7 h-7 rounded-full bg-white border border-[#e6e8f2] grid place-items-center text-[#67708f] hover:text-[#0b1220] shadow-sm"
          aria-label="Expand sidebar"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}
    </aside>
  );
}
