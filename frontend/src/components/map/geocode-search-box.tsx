"use client";

/**
 * Geocoding search box for the `MapView` (M6.5, ADR-041 §J).
 *
 * Wraps a debounced text input around the M6.1 backend
 * (`GET /api/geocode`). On submit / result-pick the parent flies the
 * map to the chosen feature; the box never persists a marker — pure
 * navigation aid.
 *
 * Online-only by design: the rest of the map keeps working when
 * geocoding is unavailable. 429 / 503 / 502 surface as `sonner`
 * toasts so the user understands why no results came back.
 */

import { Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;
const RESULT_LIMIT = 5;

export interface GeocodeFeature {
  id: string;
  place_name: string;
  /** ``[longitude, latitude]`` — MapTiler convention, kept verbatim. */
  center: [number, number];
}

interface UpstreamFeature {
  id?: string | number;
  place_name?: unknown;
  center?: unknown;
  geometry?: { coordinates?: unknown };
}

interface UpstreamCollection {
  features?: UpstreamFeature[];
}

export interface GeocodeSearchBoxProps {
  className?: string;
  /** Optional bias (lat, lon) — typically the current viewport center. */
  getProximity?: () => { lat: number; lon: number } | null;
  /** Called with ``(lat, lon)`` when the user picks a result. */
  onSelect: (lat: number, lon: number) => void;
}

export function GeocodeSearchBox({ className, getProximity, onSelect }: GeocodeSearchBoxProps) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<GeocodeFeature[]>([]);
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const requestSeq = useRef(0);
  // Stash the proximity callback in a ref so prop-identity churn
  // (parents often pass an inline arrow) does not retrigger the
  // fetch effect; only `debouncedQuery` changes count.
  const getProximityRef = useRef(getProximity);
  getProximityRef.current = getProximity;

  useEffect(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setDebouncedQuery("");
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      setPending(false);
      return;
    }
    const seq = ++requestSeq.current;
    let cancelled = false;
    setPending(true);

    const proximity = getProximityRef.current?.() ?? null;
    const queryParams: Record<string, string | number | undefined> = {
      q: debouncedQuery,
      limit: RESULT_LIMIT,
    };
    if (proximity) {
      queryParams.proximity = `${proximity.lat},${proximity.lon}`;
    }

    apiFetch<UpstreamCollection>("/api/geocode", { query: queryParams })
      .then((payload) => {
        if (cancelled || seq !== requestSeq.current) return;
        setResults(normaliseFeatures(payload));
        setOpen(true);
        setPending(false);
      })
      .catch((error) => {
        if (cancelled || seq !== requestSeq.current) return;
        setPending(false);
        setResults([]);
        toastFromError(error);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  function handleSelect(feature: GeocodeFeature) {
    const [lon, lat] = feature.center;
    onSelect(lat, lon);
    setOpen(false);
    setQuery(feature.place_name);
  }

  function clear() {
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  const showDropdown = open && results.length > 0 && query.trim().length >= MIN_QUERY_LENGTH;
  const showEmptyHint =
    open && !pending && !showDropdown && debouncedQuery.length >= MIN_QUERY_LENGTH;

  const ariaList = useMemo(() => `${inputId}-results`, [inputId]);

  return (
    <div className={cn("relative", className)} data-testid="map-geocode-search">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
      <Input
        id={inputId}
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Delay so the click handler on a result fires first.
          window.setTimeout(() => setOpen(false), 120);
        }}
        placeholder="Adresse suchen…"
        aria-label="Adresse suchen"
        aria-controls={ariaList}
        aria-expanded={showDropdown}
        autoComplete="off"
        className="h-9 w-72 max-w-[80vw] bg-white pl-9 pr-9 shadow-md dark:bg-slate-950"
        data-testid="map-geocode-input"
      />
      {query.length > 0 ? (
        <button
          type="button"
          onClick={clear}
          aria-label="Suche löschen"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          data-testid="map-geocode-clear"
        >
          <X className="h-3 w-3" aria-hidden />
        </button>
      ) : null}
      {showDropdown ? (
        <ul
          id={ariaList}
          role="listbox"
          aria-label="Geocoding-Treffer"
          className="absolute left-0 right-0 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950"
          data-testid="map-geocode-results"
        >
          {results.map((feature) => (
            <li key={feature.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={(event) => {
                  // Prevent the input's blur from running before we
                  // process the click.
                  event.preventDefault();
                  handleSelect(feature);
                }}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-900"
                data-testid="map-geocode-result"
                data-place-id={feature.id}
              >
                <span className="flex-1 truncate">{feature.place_name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {showEmptyHint ? (
        <div
          className="absolute left-0 right-0 top-full z-10 mt-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-md dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
          data-testid="map-geocode-empty"
        >
          Keine Treffer für „{debouncedQuery}“.
        </div>
      ) : null}
    </div>
  );
}

function normaliseFeatures(payload: UpstreamCollection): GeocodeFeature[] {
  const features = Array.isArray(payload?.features) ? payload.features : [];
  const result: GeocodeFeature[] = [];
  for (const [index, raw] of features.entries()) {
    const placeName = typeof raw.place_name === "string" ? raw.place_name : "";
    if (!placeName) continue;
    const center = pickCenter(raw);
    if (!center) continue;
    const id =
      typeof raw.id === "string" || typeof raw.id === "number"
        ? String(raw.id)
        : `${index}-${placeName}`;
    result.push({ id, place_name: placeName, center });
  }
  return result;
}

function pickCenter(raw: UpstreamFeature): [number, number] | null {
  const candidates = [raw.center, raw.geometry?.coordinates];
  for (const candidate of candidates) {
    if (
      Array.isArray(candidate) &&
      candidate.length >= 2 &&
      typeof candidate[0] === "number" &&
      typeof candidate[1] === "number" &&
      Number.isFinite(candidate[0]) &&
      Number.isFinite(candidate[1])
    ) {
      return [candidate[0], candidate[1]];
    }
  }
  return null;
}

function toastFromError(error: unknown): void {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      toast.error("Geocoding-Limit erreicht", {
        description: "Bitte einen Moment warten und erneut suchen.",
      });
      return;
    }
    if (error.status === 503) {
      toast.error("Adress-Suche nicht konfiguriert", {
        description: "Der Server hat keinen MapTiler-Schlüssel hinterlegt.",
      });
      return;
    }
    if (error.status === 502) {
      toast.error("Adress-Suche nicht erreichbar", {
        description: "MapTiler antwortet aktuell nicht.",
      });
      return;
    }
  }
  toast.error("Adress-Suche fehlgeschlagen", {
    description: "Die Karte funktioniert weiter ohne Suche.",
  });
}
