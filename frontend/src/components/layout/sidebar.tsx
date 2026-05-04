"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SearchBox } from "@/components/layout/search-box";
import { UserMenu } from "@/components/layout/user-menu";
import { visibleNavItems } from "@/components/layout/nav";
import { SyncStatusIndicator } from "@/components/sync/sync-status-indicator";
import type { AuthUser } from "@/lib/auth";
import { cn } from "@/lib/cn";

export function Sidebar({ user }: { user: AuthUser }) {
  const pathname = usePathname();
  const items = visibleNavItems(user.role);
  return (
    <aside className="hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6 dark:border-slate-800 dark:bg-slate-950 md:flex">
      <div className="px-2 pb-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          HC-Map
        </Link>
      </div>
      <div className="px-1 pb-4">
        <SearchBox />
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-50",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <SyncStatusIndicator showLabel className="px-2" />
        <UserMenu user={user} />
      </div>
    </aside>
  );
}
