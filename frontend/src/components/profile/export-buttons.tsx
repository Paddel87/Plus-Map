import { Download } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import type { UserRole } from "@/lib/auth";
import { cn } from "@/lib/cn";

const EXPORT_LINKS = [
  {
    href: "/api/export/me",
    download: "hcmap-export.json",
    label: "Alle Daten als JSON",
  },
  {
    href: "/api/export/me/events.csv",
    download: "events.csv",
    label: "Events als CSV",
  },
  {
    href: "/api/export/me/applications.csv",
    download: "applications.csv",
    label: "Applications als CSV",
  },
] as const;

export function ExportButtons({ role }: { role: UserRole }) {
  return (
    <div className="flex flex-wrap gap-2">
      {EXPORT_LINKS.map((link) => (
        <a
          key={link.href}
          href={link.href}
          download={link.download}
          rel="nofollow"
          className={cn(buttonVariants({ variant: "secondary" }))}
        >
          <Download aria-hidden /> {link.label}
        </a>
      ))}
      {role === "admin" ? (
        <a
          href="/api/admin/export/all"
          download="hcmap-admin-export.json"
          rel="nofollow"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <Download aria-hidden /> Alle Daten (Admin) als JSON
        </a>
      ) : null}
    </div>
  );
}
