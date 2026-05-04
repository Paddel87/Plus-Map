import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { EventEditForm } from "@/components/event/event-edit-form";
import { getServerMe } from "@/lib/auth-server";
import { canEditEvent } from "@/lib/rbac";
import type { EventDetail } from "@/lib/types";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000";

async function loadEvent(
  id: string,
  cookieHeader: string,
): Promise<EventDetail | null | "not-found"> {
  const response = await fetch(`${BACKEND_URL}/api/events/${id}`, {
    headers: { Cookie: cookieHeader },
    cache: "no-store",
  });
  if (response.status === 404) return "not-found";
  if (!response.ok) return null;
  return (await response.json()) as EventDetail;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EventEditPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getServerMe();
  if (!user) redirect(`/login?next=/events/${id}/edit`);
  if (user.role === "viewer") redirect(`/events/${id}`);

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const result = await loadEvent(id, cookieHeader);
  if (result === "not-found") notFound();
  if (!result) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Event bearbeiten</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Konnte nicht geladen werden. Bitte später erneut versuchen.
        </p>
      </div>
    );
  }
  if (!canEditEvent(user, result)) {
    redirect(`/events/${id}`);
  }
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Event bearbeiten</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Editierbar gemäß ADR-029-Conflict-Matrix; nicht-editierbare Felder werden read-only
          dargestellt.
        </p>
      </header>
      <EventEditForm user={user} initialEvent={result} />
    </div>
  );
}
