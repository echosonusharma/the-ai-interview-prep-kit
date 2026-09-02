"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/config/nav";

function Icon({ name, active }: { name: string; active?: boolean }) {
  const cls = active ? "text-[#5b5bf5]" : "text-[#a0a6c2]";
  if (name === "home")
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cls}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    );
  if (name === "doc")
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={cls}>
        <path d="M14 2H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M10 13H8M14 17H8" />
      </svg>
    );
  if (name === "book")
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={cls}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    );
  if (name === "settings")
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={cls}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
      </svg>
    );
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={cls}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

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

  // collapsed => 68px, expanded => 220px
  const width = collapsed ? "w-[68px]" : "w-[220px]";
  const containerClass = mobile
    ? "w-full h-full bg-white flex flex-col py-4"
    : `hidden md:flex ${width} shrink-0 bg-white border-r border-[#e6e8f2] flex-col py-3 transition-all duration-300 ease-in-out sticky top-14 h-[calc(100vh-56px)] self-start overflow-hidden z-20`;

  return (
    <aside className={containerClass}>
      {/* Brand / toggle area */}
      <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between px-3"} gap-2`}>
        <Link href="/" className={`flex items-center gap-2.5 ${collapsed ? "justify-center" : ""}`}>
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#ff7eb0] via-[#ff8fa0] to-[#ffcc6a] grid place-items-center shadow-sm shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M12 2l2.4 5.8H20l-4.6 3.4 1.8 5.8L12 13.6 6.8 17l1.8-5.8L4 7.8h5.6L12 2z" fill="currentColor" />
            </svg>
          </span>
          {!collapsed && <span className="text-xs font-bold tracking-tight text-[#0b1220] truncate">PrepPilot AI</span>}
        </Link>
        {!collapsed && !mobile && (
          <button
            onClick={onToggle}
            className="w-6 h-6 rounded-full border border-[#e6e8f2] bg-[#f6f7fb] grid place-items-center text-[#67708f] hover:text-[#0b1220] shrink-0"
            aria-label="Collapse"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
      </div>

      {!collapsed && <div className="mx-3 mt-3 h-px bg-[#e6e8f2]" />}
      {collapsed && <div className="mx-auto mt-3 w-8 h-px bg-[#e6e8f2]" />}

      <nav className={`flex flex-col gap-1 mt-3 ${collapsed ? "items-center px-2" : "px-2"}`} aria-label="Primary">
        {navItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          if (collapsed) {
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`w-9 h-9 rounded-xl grid place-items-center border transition-colors ${
                  active ? "bg-[#eef0ff] border-[#e6e8f2] shadow-sm" : "border-transparent hover:bg-[#f6f7fb]"
                }`}
              >
                <Icon name={item.icon} active={active} />
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-2.5 py-2.5 border transition-colors ${
                active
                  ? "bg-[#eef0ff] border-[#e6e8f2] text-[#0b1220] shadow-sm"
                  : "border-transparent text-[#67708f] hover:bg-[#f6f7fb] hover:text-[#0b1220]"
              }`}
            >
              <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${active ? "bg-white border border-[#e6e8f2]" : "bg-transparent"}`}>
                <Icon name={item.icon} active={active} />
              </span>
              <span className="flex-1 min-w-0 text-left">
                <span className="block text-[12px] font-semibold leading-none truncate">{item.label}</span>
                <span className="block text-[11px] leading-none truncate opacity-60">{item.desc}</span>
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
            <div className="w-full h-full rounded-full bg-white dark:bg-[#1e293b] grid place-items-center text-[10px] font-bold text-[#0b1220] dark:text-white">JD</div>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-xs font-semibold leading-none text-[#0b1220] truncate">Jane Doe</div>
              <div className="text-[11px] leading-none text-[#8a8fa8] truncate">Pro • Level 12</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <Link href="/login" className="mt-2 w-full inline-flex justify-center rounded-full bg-white border border-[#e6e8f2] py-1.5 text-xs font-semibold text-[#0b1220] hover:bg-white">
            View profile
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
