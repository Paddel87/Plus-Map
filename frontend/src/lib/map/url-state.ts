/**
 * URL-state encoding/decoding for the map page (M6.4, ADR-041 §H).
 *
 * The URL is the single source of truth for viewport and filters; the
 * MapView mirrors it both ways. Pure functions live here so they can
 * be exercised offline without spinning up Next.js routing.
 *
 * Schema:
 *   ?lat=<n>&lon=<n>&zoom=<n>      — viewport (optional, all three or none)
 *   &from=<YYYY-MM-DD>             — inclusive start (events.started_at)
 *   &to=<YYYY-MM-DD>               — inclusive end (events.started_at)
 *   &p=<uuid>,<uuid>,...           — participant person_ids (comma-separated)
 *
 * Invalid or out-of-range values are silently dropped — a shared URL
 * with garbled params should still load a usable map, not crash.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface MapViewport {
  lat: number;
  lon: number;
  zoom: number;
}

export interface MapFilters {
  from: string | null;
  to: string | null;
  participantIds: readonly string[];
}

export interface MapUrlState {
  viewport: MapViewport | null;
  filters: MapFilters;
}

interface ParamReader {
  get(name: string): string | null;
}

export function parseMapUrlState(params: ParamReader): MapUrlState {
  return {
    viewport: parseViewport(params),
    filters: parseFilters(params),
  };
}

function parseViewport(params: ParamReader): MapViewport | null {
  const lat = parseFloatParam(params.get("lat"));
  const lon = parseFloatParam(params.get("lon"));
  const zoom = parseFloatParam(params.get("zoom"));
  if (lat === null || lon === null || zoom === null) return null;
  if (lat < -90 || lat > 90) return null;
  if (lon < -180 || lon > 180) return null;
  if (zoom < 0 || zoom > 22) return null;
  return { lat, lon, zoom };
}

function parseFilters(params: ParamReader): MapFilters {
  return {
    from: parseIsoDate(params.get("from")),
    to: parseIsoDate(params.get("to")),
    participantIds: parseParticipantIds(params.get("p")),
  };
}

function parseFloatParam(raw: string | null): number | null {
  if (raw === null || raw === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseIsoDate(raw: string | null): string | null {
  if (raw === null) return null;
  if (!ISO_DATE.test(raw)) return null;
  const ts = Date.parse(`${raw}T00:00:00Z`);
  if (!Number.isFinite(ts)) return null;
  return raw;
}

function parseParticipantIds(raw: string | null): readonly string[] {
  if (!raw) return [];
  const ids = new Set<string>();
  for (const part of raw.split(",")) {
    const candidate = part.trim();
    if (UUID_RE.test(candidate)) ids.add(candidate.toLowerCase());
  }
  return Array.from(ids);
}

/**
 * Serialise the URL state into a query-string fragment **without**
 * the leading "?". Empty / null fields are dropped so the URL stays
 * minimal. Caller decides whether to prepend "?" or merge into an
 * existing query string.
 */
export function serializeMapUrlState(state: MapUrlState): string {
  const params: string[] = [];
  const { viewport, filters } = state;
  if (viewport) {
    params.push(`lat=${trimFloat(viewport.lat)}`);
    params.push(`lon=${trimFloat(viewport.lon)}`);
    params.push(`zoom=${trimFloat(viewport.zoom)}`);
  }
  if (filters.from) params.push(`from=${filters.from}`);
  if (filters.to) params.push(`to=${filters.to}`);
  if (filters.participantIds.length > 0) {
    params.push(`p=${filters.participantIds.join(",")}`);
  }
  return params.join("&");
}

function trimFloat(value: number): string {
  return value.toFixed(5).replace(/\.?0+$/, "");
}

/**
 * True iff two `MapFilters` are content-equal — used to skip
 * redundant URL writes during pan/zoom.
 */
export function filtersEqual(a: MapFilters, b: MapFilters): boolean {
  if (a.from !== b.from) return false;
  if (a.to !== b.to) return false;
  if (a.participantIds.length !== b.participantIds.length) return false;
  for (let i = 0; i < a.participantIds.length; i += 1) {
    if (a.participantIds[i] !== b.participantIds[i]) return false;
  }
  return true;
}
