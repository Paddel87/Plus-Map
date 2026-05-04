import { MapView } from "@/components/map/map-view";

export default function MapPage() {
  return (
    <div className="flex w-full flex-col gap-3">
      <header className="px-1">
        <h1 className="text-2xl font-semibold tracking-tight">Karte</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sichtbare Events als Marker. Klick auf einen Marker öffnet die Details.
        </p>
      </header>
      <MapView />
    </div>
  );
}
