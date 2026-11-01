"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Today", icon: "◉" },
  { href: "/program", label: "Program", icon: "▦" },
  { href: "/exercises", label: "Exercises", icon: "☰" },
  { href: "/history", label: "History", icon: "↺" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default function Nav() {
  const path = usePathname();
  if (path.startsWith("/workout")) return null;
  return (
    <nav className="tabbar">
      {TABS.map((t) => {
        const on = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={on ? "on" : ""}>
            <span className="tab-icon">{t.icon}</span>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
