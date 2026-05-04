import {
  BookMarked,
  Calendar,
  LayoutDashboard,
  Map as MapIcon,
  Shield,
  User,
  type LucideIcon,
} from "lucide-react";

import type { UserRole } from "@/lib/auth";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: UserRole[];
  showInBottomNav?: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    showInBottomNav: true,
  },
  {
    href: "/events",
    label: "Events",
    icon: Calendar,
    showInBottomNav: true,
  },
  {
    href: "/map",
    label: "Karte",
    icon: MapIcon,
    showInBottomNav: true,
  },
  {
    href: "/admin/catalogs",
    label: "Kataloge",
    icon: BookMarked,
    roles: ["admin", "editor"],
    showInBottomNav: false,
  },
  {
    href: "/admin",
    label: "Admin",
    icon: Shield,
    roles: ["admin"],
    showInBottomNav: false,
  },
  {
    href: "/profile",
    label: "Profil",
    icon: User,
    showInBottomNav: true,
  },
];

export function visibleNavItems(role: UserRole | undefined): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || (role && item.roles.includes(role)));
}
