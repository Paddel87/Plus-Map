import { redirect } from "next/navigation";

import { EventCreateForm } from "@/components/event/event-create-form";
import { getServerMe } from "@/lib/auth-server";

export default async function NewEventPage() {
  const user = await getServerMe();
  if (!user) redirect("/login?next=/events/new");
  if (user.role === "viewer") {
    redirect("/?error=role");
  }
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Neue Tour starten</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Live-Erfassung mit GPS, Karten-Korrektur und optionaler Begleitung.
        </p>
      </header>
      <EventCreateForm user={user} />
    </div>
  );
}
