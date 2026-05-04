import { redirect } from "next/navigation";

import { EventBackfillForm } from "@/components/event/event-backfill-form";
import { getServerMe } from "@/lib/auth-server";

export default async function NewEventBackfillPage() {
  const user = await getServerMe();
  if (!user) redirect("/login?next=/events/new/backfill");
  if (user.role === "viewer") {
    redirect("/?error=role");
  }
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Nachträglich erfassen</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Event und Applications mit selbst gewählten Zeitstempeln eintragen.
        </p>
      </header>
      <EventBackfillForm user={user} />
    </div>
  );
}
