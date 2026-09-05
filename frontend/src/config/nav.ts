import { BookOpen, Layers, LayoutDashboard, Settings, Sparkles, Users, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  desc: string;
  Icon: LucideIcon;
  /** Prefix match (default) or exact match against the pathname. */
  match?: "prefix" | "exact";
}

export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", desc: "Your kits", Icon: LayoutDashboard, match: "exact" },
  { href: "/kits/new", label: "New kit", desc: "Create prep kit", Icon: Sparkles },
  { href: "/practice", label: "Practice", desc: "Flashcards", Icon: Layers },
  { href: "/resources", label: "Resources", desc: "Playbooks", Icon: BookOpen },
  { href: "/community", label: "Community", desc: "Peer mocks", Icon: Users },
  { href: "/settings", label: "Settings", desc: "Preferences", Icon: Settings },
];

export function isNavActive(item: NavItem, pathname: string): boolean {
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
