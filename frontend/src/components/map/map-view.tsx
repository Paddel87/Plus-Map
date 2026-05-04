"use client";

/**
 * Full-screen MapView for the /map route (M6.2 / M6.3 / M6.4,
 * ADR-041 §C/§E/§F/§G/§H/§I).
 *
 * - Subscribes to the RxDB `events` collection live, filters by
 *   `_deleted=false` server-side (selector) and by valid lat/lon
 *   client-side via `selectMappableEvents`.
 * - Renders events through a single GeoJSON `Source` with native
 *   MapLibre clustering (`cluster: true`). Three layers stack on it:
 *   `clusters` (filled circle), `cluster-count` (count text),
 *   `unclustered-point` (single-event circle). No `supercluster`
 *   dependency — see ADR-041 §C.
 * - Click on a cluster zooms in via `getClusterExpansionZoom` and
 *   `easeTo`. Click on an unclustered point opens the popup.
 * - URL is the single source of truth for viewport + filters
 *   (ADR-041 §H). Initial state is read once from `useSearchParams`;
 *   pan/zoom triggers a debounced URL update; filter changes are
 *   immediate. Filters are applied client-side via `applyEventFilter`
 *   over the RxDB `events` and `event_participants` collections.
 * - Geocoding search box lands in M6.5.
 */

import { Filter } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  GeolocateControl,
  Layer,
  NavigationControl,
  Popup,
  Source,
  type LayerProps,
  type MapLayerMouseEvent,
  type MapRef,
  type ViewStateChangeEvent,
} from "react-map-gl/maplibre";

import { GeocodeSearchBox } from "@/components/map/geocode-search-box";
import { MapFilterPanel } from "@/components/map/map-filter-panel";
import { Button } from "@/components/ui/button";
import { formatEventTime } from "@/lib/event-time";
import {
  DEFAULT_MAP_CENTER,
  applyEventFilter,
  buildParticipantsIndex,
  eventsToGeoJSON,
  filtersAreEmpty,
  filtersEqual,
  parseMapUrlState,
  rasterTileStyle,
  selectMappableEvents,
  serializeMapUrlState,
  type MapFilters,
  type MapViewport,
  type MappableEvent,
} from "@/lib/map";
import { useDatabase } from "@/lib/rxdb/provider";
import type { EventDocType, EventParticipantDocType } from "@/lib/rxdb/types";

const INITIAL_ZOOM = 11;
const GEOCODE_FLYTO_ZOOM = 14;
const SOURCE_ID = "events";
const CLUSTER_LAYER_ID = "events-clusters";
const CLUSTER_COUNT_LAYER_ID = "events-cluster-count";
const UNCLUSTERED_LAYER_ID = "events-unclustered";
const URL_DEBOUNCE_MS = 300;

const clusterLayer: LayerProps = {
  id: CLUSTER_LAYER_ID,
  type: "circle",
  source: SOURCE_ID,
  filter: ["has", "point_count"],
  paint: {
    "circle-color": ["step", ["get", "point_count"], "#3b82f6", 10, "#2563eb", 30, "#1d4ed8"],
    "circle-radius": ["step", ["get", "point_count"], 18, 10, 24, 30, 30],
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 2,
  },
};

const clusterCountLayer: LayerProps = {
  id: CLUSTER_COUNT_LAYER_ID,
  type: "symbol",
  source: SOURCE_ID,
  filter: ["has", "point_count"],
  layout: {
    "text-field": ["get", "point_count_abbreviated"],
    "text-size": 12,
    "text-allow-overlap": true,
  },
  paint: {
    "text-color": "#ffffff",
  },
};

const unclusteredLayer: LayerProps = {
  id: UNCLUSTERED_LAYER_ID,
  type: "circle",
  source: SOURCE_ID,
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": "#2563eb",
    "circle-radius": 8,
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 2,
  },
};

const interactiveLayerIds = [CLUSTER_LAYER_ID, UNCLUSTERED_LAYER_ID];

export function MapView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialState = useMemo(() => parseMapUrlState(searchParams), [searchParams]);

  const [filters, setFilters] = useState<MapFilters>(initialState.filters);
  const filtersRef = useRef<MapFilters>(initialState.filters);
  filtersRef.current = filters;

  const viewportRef = useRef<MapViewport | null>(initialState.viewport);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writingFromUrlSyncRef = useRef<boolean>(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  const allEvents = useEvents();
  const participants = useEventParticipants();
  const participantsByEvent = useMemo(() => buildParticipantsIndex(participants), [participants]);
  const events = useMemo(
    () =>
      filtersAreEmpty(filters)
        ? allEvents
        : applyEventFilter(allEvents, {
            from: filters.from,
            to: filters.to,
            participantIds: filters.participantIds,
            participantsByEvent,
          }),
    [allEvents, filters, participantsByEvent],
  );

  const mapStyle = useMemo(() => rasterTileStyle(), []);
  const geojson = useMemo(() => eventsToGeoJSON(events), [events]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const mapRef = useRef<MapRef | null>(null);

  const active = useMemo(
    () => (activeId ? (events.find((e) => e.id === activeId) ?? null) : null),
    [activeId, events],
  );

  const initialViewState = useMemo(
    () =>
      initialState.viewport
        ? {
            latitude: initialState.viewport.lat,
            longitude: initialState.viewport.lon,
            zoom: initialState.viewport.zoom,
          }
        : {
            latitude: DEFAULT_MAP_CENTER.lat,
            longitude: DEFAULT_MAP_CENTER.lon,
            zoom: INITIAL_ZOOM,
          },
    [initialState.viewport],
  );

  const writeUrl = useCallback(
    (viewport: MapViewport | null, nextFilters: MapFilters) => {
      const fragment = serializeMapUrlState({
        viewport,
        filters: nextFilters,
      });
      writingFromUrlSyncRef.current = true;
      const next = fragment ? `/map?${fragment}` : "/map";
      router.replace(next, { scroll: false });
    },
    [router],
  );

  const scheduleUrlWrite = useCallback(
    (viewport: MapViewport | null, nextFilters: MapFilters) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        writeUrl(viewport, nextFilters);
      }, URL_DEBOUNCE_MS);
    },
    [writeUrl],
  );

  // Browser-back / forward and external param changes feed the URL
  // back into local state. Skip when *we* just wrote it.
  useEffect(() => {
    if (writingFromUrlSyncRef.current) {
      writingFromUrlSyncRef.current = false;
      return;
    }
    const next = parseMapUrlState(searchParams);
    setFilters((prev) => (filtersEqual(prev, next.filters) ? prev : next.filters));
  }, [searchParams]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const handleMoveEnd = useCallback(
    (event: ViewStateChangeEvent) => {
      const { latitude, longitude, zoom } = event.viewState;
      const viewport: MapViewport = {
        lat: roundCoord(latitude),
        lon: roundCoord(longitude),
        zoom: Math.round(zoom * 100) / 100,
      };
      viewportRef.current = viewport;
      scheduleUrlWrite(viewport, filtersRef.current);
    },
    [scheduleUrlWrite],
  );

  const handleFiltersChange = useCallback(
    (next: MapFilters) => {
      setFilters(next);
      writeUrl(viewportRef.current, next);
    },
    [writeUrl],
  );

  const getProximity = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return null;
    return { lat: viewport.lat, lon: viewport.lon };
  }, []);

  const handleGeocodeSelect = useCallback(
    (lat: number, lon: number) => {
      const map = mapRef.current;
      if (!map) return;
      map.flyTo({ center: [lon, lat], zoom: GEOCODE_FLYTO_ZOOM });
      const viewport: MapViewport = {
        lat: roundCoord(lat),
        lon: roundCoord(lon),
        zoom: GEOCODE_FLYTO_ZOOM,
      };
      viewportRef.current = viewport;
      scheduleUrlWrite(viewport, filtersRef.current);
    },
    [scheduleUrlWrite],
  );

  const handleMapClick = useCallback((event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (!feature) return;
    const layerId = (feature.layer as { id?: string } | undefined)?.id ?? null;
    if (layerId === CLUSTER_LAYER_ID) {
      const props = feature.properties as { cluster_id?: number } | null | undefined;
      const clusterId = props?.cluster_id;
      const map = event.target;
      if (typeof clusterId !== "number" || !map) return;
      const source = map.getSource(SOURCE_ID) as
        | {
            getClusterExpansionZoom?: (id: number) => Promise<number> | undefined;
          }
        | null
        | undefined;
      const promise = source?.getClusterExpansionZoom?.(clusterId);
      if (!promise) return;
      const geom = feature.geometry as { type: string; coordinates?: [number, number] } | undefined;
      const center = geom?.coordinates ?? null;
      promise
        .then((zoom: number) => {
          if (!center) return;
          map.easeTo({ center, zoom });
        })
        .catch(() => {
          /* swallow upstream errors — UX falls back to manual zoom */
        });
      return;
    }
    if (layerId === UNCLUSTERED_LAYER_ID) {
      const props = feature.properties as { id?: string } | null | undefined;
      const id = props?.id;
      if (typeof id === "string") setActiveId(id);
    }
  }, []);

  const filtersActive = !filtersAreEmpty(filters);

  return (
    <div
      className="relative h-full w-full"
      style={{ height: "calc(100vh - 8rem)" }}
      data-testid="map-view"
    >
      <Map
        ref={mapRef}
        mapStyle={mapStyle}
        initialViewState={initialViewState}
        interactiveLayerIds={interactiveLayerIds}
        onClick={handleMapClick}
        onMoveEnd={handleMoveEnd}
        cursor="auto"
      >
        <NavigationControl position="top-right" showCompass={false} />
        <GeolocateControl
          position="top-right"
          positionOptions={{ enableHighAccuracy: true }}
          trackUserLocation={false}
          showAccuracyCircle={false}
        />
        <Source
          id={SOURCE_ID}
          type="geojson"
          data={geojson}
          cluster
          clusterRadius={50}
          clusterMaxZoom={14}
        >
          <Layer {...clusterLayer} />
          <Layer {...clusterCountLayer} />
          <Layer {...unclusteredLayer} />
        </Source>
        {active ? (
          <Popup
            latitude={active.lat}
            longitude={active.lon}
            anchor="bottom"
            offset={16}
            onClose={() => setActiveId(null)}
            closeOnClick={false}
            closeButton
          >
            <EventPopupContent event={active} />
          </Popup>
        ) : null}
      </Map>
      <div className="absolute left-2 top-2 flex flex-col gap-2 sm:flex-row sm:items-start">
        <FilterToggleButton active={filtersActive} onClick={() => setFilterPanelOpen(true)} />
        <GeocodeSearchBox getProximity={getProximity} onSelect={handleGeocodeSelect} />
      </div>
      <MapStatusBar
        count={events.length}
        totalCount={allEvents.length}
        filtersActive={filtersActive}
      />
      <MapFilterPanel
        open={filterPanelOpen}
        onOpenChange={setFilterPanelOpen}
        filters={filters}
        onChange={handleFiltersChange}
      />
    </div>
  );
}

function FilterToggleButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "secondary"}
      size="sm"
      className="shadow-md"
      onClick={onClick}
      data-testid="map-filter-toggle"
      data-filter-active={active ? "true" : "false"}
    >
      <Filter aria-hidden /> {active ? "Filter aktiv" : "Filter"}
    </Button>
  );
}

function EventPopupContent({ event }: { event: MappableEvent }) {
  const isLive = event.ended_at === null;
  const trimmedTitle = event.title?.trim();
  return (
    <div className="flex flex-col gap-1 text-sm" data-testid="map-event-popup">
      {trimmedTitle ? (
        <div className="font-medium" data-testid="map-event-popup-title">
          {trimmedTitle}
        </div>
      ) : null}
      <div className={trimmedTitle ? "text-xs text-slate-600" : "font-medium"}>
        {formatEventTime(event.started_at, event.time_precision)}
      </div>
      <div className="text-xs text-slate-600">
        {event.lat.toFixed(5)}, {event.lon.toFixed(5)}
      </div>
      <div className="text-xs">
        <span
          className={
            isLive
              ? "inline-flex items-center gap-1 font-medium text-emerald-700"
              : "inline-flex items-center gap-1 text-slate-600"
          }
        >
          <span
            className={
              isLive
                ? "inline-block h-2 w-2 rounded-full bg-emerald-500"
                : "inline-block h-2 w-2 rounded-full bg-slate-400"
            }
            aria-hidden
          />
          {isLive ? "läuft" : "beendet"}
        </span>
      </div>
      <Link
        href={`/events/${event.id}`}
        className="pt-1 text-xs font-medium text-blue-600 hover:underline"
        data-testid="map-event-popup-link"
      >
        Detailseite öffnen →
      </Link>
    </div>
  );
}

function MapStatusBar({
  count,
  totalCount,
  filtersActive,
}: {
  count: number;
  totalCount: number;
  filtersActive: boolean;
}) {
  let label: string;
  if (totalCount === 0) {
    label = "Keine sichtbaren Events";
  } else if (filtersActive) {
    label = `${count} von ${totalCount} Event${totalCount === 1 ? "" : "s"} (gefiltert)`;
  } else {
    label = `${count} Event${count === 1 ? "" : "s"} sichtbar`;
  }
  return (
    <div
      className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-white/90 px-2 py-1 text-xs text-slate-700 shadow-sm dark:bg-slate-900/90 dark:text-slate-200"
      data-testid="map-status-bar"
    >
      {label}
    </div>
  );
}

function useEvents(): MappableEvent[] {
  const database = useDatabase();
  const [docs, setDocs] = useState<EventDocType[]>([]);
  useEffect(() => {
    if (!database) return;
    const sub = database.events
      .find({
        selector: { _deleted: { $eq: false } },
      })
      .$.subscribe((rows) => setDocs(rows.map((r) => r.toJSON() as EventDocType)));
    return () => sub.unsubscribe();
  }, [database]);
  return useMemo(() => selectMappableEvents(docs), [docs]);
}

function useEventParticipants(): EventParticipantDocType[] {
  const database = useDatabase();
  const [rows, setRows] = useState<EventParticipantDocType[]>([]);
  useEffect(() => {
    if (!database) return;
    const sub = database.event_participants
      .find({ selector: { _deleted: { $eq: false } } })
      .$.subscribe((docs) => setRows(docs.map((d) => d.toJSON() as EventParticipantDocType)));
    return () => sub.unsubscribe();
  }, [database]);
  return rows;
}

function roundCoord(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
