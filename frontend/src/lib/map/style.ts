import type { StyleSpecification } from "maplibre-gl";

export const TILE_URL_TEMPLATE: string =
  process.env.NEXT_PUBLIC_TILE_URL ?? "/api/tiles/{z}/{x}/{y}";

/**
 * Glyph-URL for MapLibre symbol layers (cluster-count text). Same proxy
 * pattern as TILE_URL — MapTiler key stays server-side. MapLibre
 * substitutes ``{fontstack}`` and ``{range}`` at request time.
 */
export const GLYPHS_URL_TEMPLATE: string =
  process.env.NEXT_PUBLIC_GLYPHS_URL ?? "/api/glyphs/{fontstack}/{range}.pbf";

export const DEFAULT_MAP_CENTER: { lat: number; lon: number } = parseCenter(
  process.env.NEXT_PUBLIC_DEFAULT_MAP_CENTER ?? "52.5200,13.4050",
);

function parseCenter(raw: string): { lat: number; lon: number } {
  const [latStr, lonStr] = raw.split(",", 2);
  const lat = Number(latStr);
  const lon = Number(lonStr);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return { lat: 52.52, lon: 13.405 };
  }
  return { lat, lon };
}

export function rasterTileStyle(
  tileUrl: string = TILE_URL_TEMPLATE,
  glyphsUrl: string = GLYPHS_URL_TEMPLATE,
): StyleSpecification {
  return {
    version: 8,
    glyphs: absoluteTileUrl(glyphsUrl),
    sources: {
      "plusmap-raster": {
        type: "raster",
        tiles: [absoluteTileUrl(tileUrl)],
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noreferrer">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>',
      },
    },
    layers: [
      {
        id: "plusmap-raster",
        type: "raster",
        source: "plusmap-raster",
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  };
}

function absoluteTileUrl(template: string): string {
  if (/^https?:\/\//i.test(template)) return template;
  if (typeof window === "undefined") return template;
  const base = window.location.origin;
  return template.startsWith("/") ? `${base}${template}` : `${base}/${template}`;
}
