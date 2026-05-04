import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getServerMe } from "@/lib/auth-server";

/**
 * Admin-only sub-tree under `/admin`. The parent layout already
 * enforces "logged in + editor-or-admin"; this one tightens to admin.
 */
export default async function AdminOnlyLayout({ children }: { children: ReactNode }) {
  const user = await getServerMe();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");
  return <>{children}</>;
}
