import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getServerMe } from "@/lib/auth-server";
import { canViewCatalogAdmin } from "@/lib/rbac";

/**
 * `/admin/**` requires at least the editor role — admin-only sub-trees
 * (e.g. `(admin-only)/page.tsx`) tighten further via their own layout.
 * The catalog-management routes (M7.2 ff., ADR-042 §F) are reachable by
 * editors so they can submit and withdraw proposals.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getServerMe();
  if (!user) redirect("/login");
  if (!canViewCatalogAdmin(user)) redirect("/");
  return <>{children}</>;
}
