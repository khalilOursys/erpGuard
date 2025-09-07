"use client";

import Link from "next/link";
import { Home, Users, ClipboardList, CalendarDays, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/services", label: "Services", icon: ClipboardList },
  { href: "/personnel", label: "Personnel", icon: Users },
  { href: "/missions", label: "Missions", icon: CalendarDays },
  { href: "/billing", label: "Billing", icon: ClipboardList },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col h-full">
      <div className="px-2 py-4">
        <h2 className="text-lg font-semibold">ERPGuard</h2>
        <p className="text-sm text-muted">Operations</p>
      </div>

      <ul className="flex-1 px-2 space-y-1">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                  active ? "bg-[rgba(var(--color-primary),0.12)] font-semibold" : "hover:bg-[rgba(var(--color-border),0.04)]"
                )}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="px-2 pb-6">
        <div className="text-xs text-muted">v0.1 • ERPGuard</div>
      </div>
    </nav>
  );
}
