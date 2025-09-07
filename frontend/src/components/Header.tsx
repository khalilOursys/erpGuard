"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Bell } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Try to import shadcn navigation-menu. If your CLI generated a different export name, open components/ui/navigation-menu/* to find it.
import {NavigationMenu} from "@/components/ui/navigation-menu"; // <- if this import fails, open the file and use the named export

export default function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <header className="flex items-center justify-between gap-4 p-4 border-b border-[rgba(var(--color-border),1)] bg-[rgb(var(--color-bg))]">
      <div className="flex items-center gap-4">
        <Link href="/" className="text-lg font-semibold">
          ERPGuard
        </Link>

        {/* navigation menu: if the import above doesn't match your generated file, swap it for the correct named import */}
        <div className="hidden md:block">
          {/* @ts-ignore */}
          <NavigationMenu />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          aria-label="toggle theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className={cn("p-2 rounded-md hover:bg-[rgba(var(--color-border),0.06)]")}
        >
          {mounted && (theme === "dark" ? <Sun size={16} /> : <Moon size={16} />)}
        </button>

        <button className="p-2 rounded-md hover:bg-[rgba(var(--color-border),0.06)]">
          <Bell size={16} />
        </button>

        <div className="ml-2">
          <button className="px-3 py-1 rounded-md border border-[rgba(var(--color-border),1)] hover:bg-[rgba(var(--color-border),0.04)]">
            admin
          </button>
        </div>
      </div>
    </header>
  );
}
