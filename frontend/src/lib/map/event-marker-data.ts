/**
 * Pure helpers for converting RxDB event docs into marker payloads
 * (M6.2 / M6.3, ADR-041 §C/§F).
 *
 * Lives in `lib/map/` so the `MapView` shell stays a thin wrapper and
 * the filter / mapping / GeoJSON logic is unit-testable without WebGL.
 */

import type { EventDocType, TimePrecision } from "@/lib/rxdb/types";

export interface MappableEvent {
  id: string;
  lat: number;
  lon: number;
  started_at: string;
  ended_at: string | null;
  title: string | null;
  note: string | null;
  time_precision: TimePrecision;
  reveal_participants: boolean;
}

export interface MappableEventFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    /** GeoJSON convention: ``[longitude, latitude]``. */
    coordinates: [number, number];
  };
  properties: {
    id: string;
    started_at: string;
    /** ``null`` is preserved as JSON ``null``; cluster_count is added by MapLibre. */
    ended_at: string | null;
    reveal_participants: boolean;
  };
}

export interface MappableEventCollection {
  type: "FeatureCollection";
  features: MappableEventFeature[];
}

export function isMappableEvent(doc: EventDocType): boolean {
  if (doc._deleted) return false;
  const { lat, lon } = doc;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lon < -180 || lon > 180) return false;
  // (0, 0) is a valid coordinate (Null Island), but in this product
  // it almost always indicates a missing GPS fix that slipped through.
  // Keep it for now — backend validation already rejects truly missing
  // coordinates, and a real Null-Island Event can be filtered manually.
  return true;
}

export function selectMappableEvents(docs: readonly EventDocType[]): MappableEvent[] {
  const result: MappableEvent[] = [];
  for (const doc of docs) {
    if (!isMappableEvent(doc)) continue;
    result.push({
      id: doc.id,
      lat: doc.lat,
      lon: doc.lon,
      started_at: doc.started_at,
      ended_at: doc.ended_at,
      title: doc.title,
      note: doc.note,
      time_precision: doc.time_precision ?? "minute",
      reveal_participants: doc.reveal_participants,
    });
  }
  return result;
}

/**
 * Convert mappable events into a GeoJSON FeatureCollection that
 * MapLibre's clustering source can consume directly (M6.3, ADR-041 §C).
 *
 * Note the coordinate order: GeoJSON requires ``[longitude, latitude]``,
 * while the rest of Plus-Map keeps the ``lat, lon`` order. The flip
 * happens here and only here.
 */
export function eventsToGeoJSON(events: readonly MappableEvent[]): MappableEventCollection {
  return {
    type: "FeatureCollection",
    features: events.map((event) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [event.lon, event.lat],
      },
      properties: {
        id: event.id,
        started_at: event.started_at,
        ended_at: event.ended_at,
        reveal_participants: event.reveal_participants,
      },
    })),
  };
}
