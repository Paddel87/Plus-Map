"use client";

import { LogOut, Monitor, Moon, Sun, User as UserIcon } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { AuthUser } from "@/lib/auth";
import { useLogout } from "@/lib/auth";

function initialsFor(user: AuthUser): string {
  const source = user.display_name?.trim() || user.email;
  const parts = source
    .replace(/@.*/, "")
    .split(/[\s.\-_]+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

export function UserMenu({ user, compact = false }: { user: AuthUser; compact?: boolean }) {
  const logout = useLogout();
  const { theme, setTheme } = useTheme();
  const onLogout = () => {
    logout.mutate(undefined, {
      onError: (error) => {
        toast.error("Logout fehlgeschlagen", {
          description: error instanceof Error ? error.message : String(error),
        });
      },
    });
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <Button variant="ghost" size="icon" aria-label="Benutzermenü">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initialsFor(user)}</AvatarFallback>
            </Avatar>
          </Button>
        ) : (
          <Button variant="ghost" className="h-auto w-full justify-start gap-3 px-2 py-2 text-left">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initialsFor(user)}</AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">
                {user.display_name || user.email}
              </span>
              <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                {user.role}
              </span>
            </span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserIcon /> Profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Sun className="mr-2 h-4 w-4" /> Hell
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="mr-2 h-4 w-4" /> Dunkel
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor className="mr-2 h-4 w-4" /> System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onLogout} disabled={logout.isPending}>
          <LogOut /> Abmelden
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
