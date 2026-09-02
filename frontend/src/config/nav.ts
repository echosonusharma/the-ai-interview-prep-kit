export const navItems = [
  { href: "/", label: "Dashboard", icon: "home" as const, desc: "Overview" },
  { href: "/practice", label: "Practice", icon: "doc" as const, desc: "Mock interviews" },
  { href: "/resources", label: "Resources", icon: "book" as const, desc: "Guides & banks" },
  { href: "/community", label: "Community", icon: "users" as const, desc: "Peers & events" },
  { href: "/settings", label: "Settings", icon: "settings" as const, desc: "Preferences" },
] as const;
