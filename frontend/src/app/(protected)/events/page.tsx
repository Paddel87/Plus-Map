import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function EventsPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Liste, Filter und Bearbeitung folgen mit M5c.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platzhalter</CardTitle>
          <CardDescription>
            Die Events-Tabelle (Filter nach Zeitraum, Personen, Tags) wird in M5c und M16
            implementiert. Bis dahin liefert das Dashboard die letzten fünf sichtbaren Events.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-500 dark:text-slate-400">
          Backend-Routen sind verfügbar:{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-800">
            GET /api/events
          </code>
          .
        </CardContent>
      </Card>
    </div>
  );
}
