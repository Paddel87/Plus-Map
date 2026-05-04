import { cookies } from "next/headers";

import type { AuthUser } from "@/lib/auth";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000";

export async function getServerMe(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  if (!cookieHeader) return null;
  const response = await fetch(`${BACKEND_URL}/api/users/me`, {
    headers: { Cookie: cookieHeader },
    cache: "no-store",
  });
  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error(`Failed to load current user (${response.status})`);
  }
  return (await response.json()) as AuthUser;
}
