"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { visibleNavItems } from "@/components/layout/nav";
import type { AuthUser } from "@/lib/auth";
import { cn } from "@/lib/cn";

export function BottomNav({ user }: { user: AuthUser }) {
  const pathname = usePathname();
  const items = visibleNavItems(user.role).filter((item) => item.showInBottomNav);
  return (
    <nav className="sticky bottom-0 z-40 grid grid-cols-4 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-950 md:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-[56px] flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-medium",
              active ? "text-slate-900 dark:text-slate-50" : "text-slate-500 dark:text-slate-400",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
