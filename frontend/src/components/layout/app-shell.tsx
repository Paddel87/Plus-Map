"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { BottomNav } from "@/components/layout/bottom-nav";
import { SearchBox } from "@/components/layout/search-box";
import { Sidebar } from "@/components/layout/sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { SyncStatusIndicator } from "@/components/sync/sync-status-indicator";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { AuthUser } from "@/lib/auth";
import { visibleNavItems } from "@/components/layout/nav";

export function AppShell({ user, children }: { user: AuthUser; children: ReactNode }) {
  const items = visibleNavItems(user.role);
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex flex-col gap-2 border-b border-slate-200 bg-white px-4 pb-2 pt-2 dark:border-slate-800 dark:bg-slate-950 md:hidden">
          <div className="flex h-10 items-center justify-between gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Navigation">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetHeader>
                  <SheetTitle>Plus-Map</SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>
            <Link href="/" className="font-semibold tracking-tight">
              Plus-Map
            </Link>
            <div className="flex items-center gap-2">
              <SyncStatusIndicator />
              <UserMenu user={user} compact />
            </div>
          </div>
          <SearchBox />
        </header>
        <main className="flex-1 overflow-x-hidden px-4 py-6 md:px-8 md:py-10">{children}</main>
        <BottomNav user={user} />
      </div>
    </div>
  );
}
