/**
 * Smoke coverage for `MapView` (M6.2 / M6.3 / M6.4, ADR-041
 * §C/§E/§H/§I).
 *
 * `react-map-gl/maplibre` needs WebGL, which jsdom does not provide
 * (see ADR-027 §J2 for the same rationale on `LocationPickerMap`).
 * The map shell, `Source`, `Layer` and `Popup` are mocked alongside
 * the `MapFilterPanel` and Next's navigation hooks so we can verify:
 *   - the GeoJSON `Source` is configured for clustering and gets
 *     exactly one feature per mappable event,
 *   - clicking an unclustered point opens a popup,
 *   - clicking a cluster zooms in via `getClusterExpansionZoom` +
 *     `easeTo`,
 *   - the empty-state copy appears when no events are mappable,
 *   - URL-driven viewport + filters seed the initial render and the
 *     filter status is reflected in the bottom-status bar.
 *
 * Pure helpers (`selectMappableEvents`, `eventsToGeoJSON`, URL state
 * codec, event-filter logic) are exercised in their own suites under
 * `tests/event-marker-data.test.ts`, `tests/map-url-state.test.ts`
 * and `tests/map-event-filter.test.ts`.
 */

import "fake-indexeddb/auto";

import { fireEvent, render, screen } from "@testing-library/react";
import { act, forwardRef, useImperativeHandle } from "react";
import type { ReactNode } from "react";
import { BehaviorSubject } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MapFilters, MappableEventCollection } from "@/lib/map";
import type { EventDocType, EventParticipantDocType } from "@/lib/rxdb/types";

interface MapMockProps {
  children: ReactNode;
  initialViewState?: { latitude: number; longitude: number; zoom: number };
  onClick?: (event: FakeMapMouseEvent) => void;
  onMoveEnd?: (event: { viewState: { latitude: number; longitude: number; zoom: number } }) => void;
  interactiveLayerIds?: string[];
}

interface FakeFeature {
  layer?: { id?: string };
  properties?: Record<string, unknown>;
  geometry?: { type: string; coordinates?: [number, number] };
}

interface FakeMapTarget {
  getSource?: (id: string) => unknown;
  easeTo?: (opts: { center: [number, number]; zoom: number }) => void;
}

interface FakeMapMouseEvent {
  features?: FakeFeature[];
  target?: FakeMapTarget;
}

interface SourceMockProps {
  id: string;
  data: MappableEventCollection;
  cluster?: boolean;
  clusterRadius?: number;
  clusterMaxZoom?: number;
  children: ReactNode;
}

interface LayerMockProps {
  id: string;
}

interface PopupMockProps {
  latitude: number;
  longitude: number;
  onClose: () => void;
  children: ReactNode;
}

interface FilterPanelMockProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: MapFilters;
  onChange: (next: MapFilters) => void;
}

interface GeocodeSearchBoxMockProps {
  getProximity?: () => { lat: number; lon: number } | null;
  onSelect: (lat: number, lon: number) => void;
}

let mapProps: MapMockProps | null = null;
let sourceProps: SourceMockProps | null = null;
let layerProps: LayerMockProps[] = [];
let filterPanelProps: FilterPanelMockProps | null = null;
let geocodeSearchProps: GeocodeSearchBoxMockProps | null = null;

const flyToMock = vi.fn();

vi.mock("react-map-gl/maplibre", () => ({
  default: forwardRef<unknown, MapMockProps>((props, ref) => {
    mapProps = props;
    useImperativeHandle(
      ref,
      () => ({
        flyTo: flyToMock,
        easeTo: vi.fn(),
      }),
      [],
    );
    return <div data-testid="mock-map">{props.children}</div>;
  }),
  Source: (props: SourceMockProps) => {
    sourceProps = props;
    return (
      <div
        data-testid="mock-source"
        data-cluster={String(props.cluster ?? false)}
        data-feature-count={props.data.features.length}
      >
        {props.children}
      </div>
    );
  },
  Layer: (props: LayerMockProps) => {
    layerProps.push(props);
    return <div data-testid="mock-layer" data-layer-id={props.id} />;
  },
  Popup: ({ latitude, longitude, onClose, children }: PopupMockProps) => (
    <div data-testid="mock-popup" data-lat={latitude} data-lon={longitude}>
      <button type="button" data-testid="mock-popup-close" onClick={onClose} />
      {children}
    </div>
  ),
  NavigationControl: () => <div data-testid="mock-nav" />,
  GeolocateControl: () => <div data-testid="mock-geolocate" />,
}));

vi.mock("@/components/map/map-filter-panel", () => ({
  MapFilterPanel: (props: FilterPanelMockProps) => {
    filterPanelProps = props;
    return <div data-testid="mock-filter-panel" data-open={props.open ? "true" : "false"} />;
  },
}));

vi.mock("@/components/map/geocode-search-box", () => ({
  GeocodeSearchBox: (props: GeocodeSearchBoxMockProps) => {
    geocodeSearchProps = props;
    return <div data-testid="mock-geocode-search" />;
  },
}));

const useDatabaseMock = vi.fn();
const routerReplaceMock = vi.fn();
const useSearchParamsMock = vi.fn(() => new URLSearchParams(""));

vi.mock("@/lib/rxdb/provider", () => ({
  useDatabase: () => useDatabaseMock(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: routerReplaceMock,
    refresh: vi.fn(),
  }),
  useSearchParams: () => useSearchParamsMock(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { MapView } from "@/components/map/map-view";

function makeDoc(overrides: Partial<EventDocType>): EventDocType {
  return {
    id: "evt-1",
    started_at: "2026-04-27T12:00:00Z",
    ended_at: null,
    lat: 52.52,
    lon: 13.405,
    legacy_external_ref: null,
    reveal_participants: false,
    note: null,
    created_by: null,
    created_at: "2026-04-27T12:00:00Z",
    updated_at: "2026-04-27T12:00:00Z",
    deleted_at: null,
    _deleted: false,
    ...overrides,
  };
}

function makeParticipant(
  event_id: string,
  person_id: string,
  overrides: Partial<EventParticipantDocType> = {},
): EventParticipantDocType {
  return {
    id: `${event_id}-${person_id}`,
    event_id,
    person_id,
    created_at: "2026-04-27T12:00:00Z",
    updated_at: "2026-04-27T12:00:00Z",
    deleted_at: null,
    _deleted: false,
    ...overrides,
  };
}

interface FakeDatabase {
  events: {
    find: () => { $: BehaviorSubject<{ toJSON: () => EventDocType }[]> };
  };
  event_participants: {
    find: () => {
      $: BehaviorSubject<{ toJSON: () => EventParticipantDocType }[]>;
    };
  };
}

function makeDatabase(
  docs: EventDocType[],
  participants: EventParticipantDocType[] = [],
): FakeDatabase {
  const eventsSubject = new BehaviorSubject<{ toJSON: () => EventDocType }[]>(
    docs.map((d) => ({ toJSON: () => d })),
  );
  const partsSubject = new BehaviorSubject<{ toJSON: () => EventParticipantDocType }[]>(
    participants.map((p) => ({ toJSON: () => p })),
  );
  return {
    events: { find: () => ({ $: eventsSubject }) },
    event_participants: { find: () => ({ $: partsSubject }) },
  };
}

beforeEach(() => {
  useDatabaseMock.mockReset();
  routerReplaceMock.mockReset();
  useSearchParamsMock.mockReturnValue(new URLSearchParams(""));
  flyToMock.mockReset();
  mapProps = null;
  sourceProps = null;
  layerProps = [];
  filterPanelProps = null;
  geocodeSearchProps = null;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MapView (M6.2 / M6.3 / M6.4)", () => {
  it("registers cluster, count and unclustered layers on the events source", () => {
    useDatabaseMock.mockReturnValue(makeDatabase([makeDoc({ id: "a" })]));
    render(<MapView />);

    expect(sourceProps?.id).toBe("events");
    expect(sourceProps?.cluster).toBe(true);
    expect(sourceProps?.clusterRadius).toBe(50);
    expect(sourceProps?.clusterMaxZoom).toBe(14);

    const ids = layerProps.map((l) => l.id);
    expect(ids).toEqual(
      expect.arrayContaining(["events-clusters", "events-cluster-count", "events-unclustered"]),
    );
    expect(mapProps?.interactiveLayerIds).toEqual(
      expect.arrayContaining(["events-clusters", "events-unclustered"]),
    );
  });

  it("emits one GeoJSON feature per mappable event", () => {
    useDatabaseMock.mockReturnValue(
      makeDatabase([
        makeDoc({ id: "a", lat: 52.5, lon: 13.4 }),
        makeDoc({ id: "b", lat: 48.1, lon: 11.5 }),
        makeDoc({ id: "deleted", _deleted: true }),
        makeDoc({ id: "out-of-range", lat: 999 }),
      ]),
    );
    render(<MapView />);
    expect(sourceProps?.data.features.map((f) => f.properties.id)).toEqual(["a", "b"]);
  });

  it("shows the empty status when no events are mappable", () => {
    useDatabaseMock.mockReturnValue(makeDatabase([]));
    render(<MapView />);
    expect(screen.getByTestId("map-status-bar")).toHaveTextContent("Keine sichtbaren Events");
    expect(sourceProps?.data.features).toHaveLength(0);
  });

  it("handles a still-loading database (null) without throwing", () => {
    useDatabaseMock.mockReturnValue(null);
    render(<MapView />);
    expect(screen.getByTestId("map-view")).toBeInTheDocument();
    expect(sourceProps?.data.features).toHaveLength(0);
  });

  it("reports the event count in the status bar (singular)", () => {
    useDatabaseMock.mockReturnValue(makeDatabase([makeDoc({ id: "only" })]));
    render(<MapView />);
    expect(screen.getByTestId("map-status-bar")).toHaveTextContent("1 Event sichtbar");
  });

  it("reports the event count in the status bar (plural)", () => {
    useDatabaseMock.mockReturnValue(
      makeDatabase([makeDoc({ id: "a" }), makeDoc({ id: "b", lat: 48.1, lon: 11.5 })]),
    );
    render(<MapView />);
    expect(screen.getByTestId("map-status-bar")).toHaveTextContent("2 Events sichtbar");
  });

  it("opens a popup with a detail link when an unclustered point is clicked", () => {
    useDatabaseMock.mockReturnValue(makeDatabase([makeDoc({ id: "evt-1", lat: 50, lon: 10 })]));
    render(<MapView />);
    expect(screen.queryByTestId("map-event-popup")).toBeNull();

    act(() => {
      mapProps?.onClick?.({
        features: [
          {
            layer: { id: "events-unclustered" },
            properties: { id: "evt-1" },
            geometry: { type: "Point", coordinates: [10, 50] },
          },
        ],
        target: {},
      });
    });

    const popup = screen.getByTestId("map-event-popup");
    expect(popup).toBeInTheDocument();
    expect(screen.getByTestId("map-event-popup-link")).toHaveAttribute("href", "/events/evt-1");
    expect(popup).toHaveTextContent("läuft");
  });

  it("marks ended events as 'beendet' in the popup", () => {
    useDatabaseMock.mockReturnValue(
      makeDatabase([
        makeDoc({
          id: "ended",
          ended_at: "2026-04-27T13:00:00Z",
        }),
      ]),
    );
    render(<MapView />);
    act(() => {
      mapProps?.onClick?.({
        features: [
          {
            layer: { id: "events-unclustered" },
            properties: { id: "ended" },
            geometry: { type: "Point", coordinates: [13.405, 52.52] },
          },
        ],
        target: {},
      });
    });
    expect(screen.getByTestId("map-event-popup")).toHaveTextContent("beendet");
  });

  it("zooms into a cluster on click via getClusterExpansionZoom + easeTo", async () => {
    useDatabaseMock.mockReturnValue(
      makeDatabase([
        makeDoc({ id: "a", lat: 52.5, lon: 13.4 }),
        makeDoc({ id: "b", lat: 52.51, lon: 13.41 }),
      ]),
    );
    render(<MapView />);

    const easeTo = vi.fn();
    const getClusterExpansionZoom = vi.fn().mockResolvedValue(16);
    const target: FakeMapTarget = {
      easeTo,
      getSource: () => ({ getClusterExpansionZoom }),
    };

    await act(async () => {
      mapProps?.onClick?.({
        features: [
          {
            layer: { id: "events-clusters" },
            properties: { cluster_id: 42 },
            geometry: { type: "Point", coordinates: [13.405, 52.505] },
          },
        ],
        target,
      });
      await Promise.resolve();
    });

    expect(getClusterExpansionZoom).toHaveBeenCalledWith(42);
    expect(easeTo).toHaveBeenCalledWith({
      center: [13.405, 52.505],
      zoom: 16,
    });
    expect(screen.queryByTestId("map-event-popup")).toBeNull();
  });

  it("ignores clicks on non-interactive features", () => {
    useDatabaseMock.mockReturnValue(makeDatabase([makeDoc({ id: "evt-1" })]));
    render(<MapView />);
    act(() => {
      mapProps?.onClick?.({
        features: [],
        target: {},
      });
    });
    expect(screen.queryByTestId("map-event-popup")).toBeNull();
  });

  it("closes the popup when the close button is clicked", () => {
    useDatabaseMock.mockReturnValue(makeDatabase([makeDoc({ id: "evt-1" })]));
    render(<MapView />);
    act(() => {
      mapProps?.onClick?.({
        features: [
          {
            layer: { id: "events-unclustered" },
            properties: { id: "evt-1" },
            geometry: { type: "Point", coordinates: [13.405, 52.52] },
          },
        ],
        target: {},
      });
    });
    expect(screen.getByTestId("map-event-popup")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("mock-popup-close"));
    expect(screen.queryByTestId("map-event-popup")).toBeNull();
  });

  it("seeds the viewport from URL params", () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("lat=48.1&lon=11.5&zoom=13"));
    useDatabaseMock.mockReturnValue(makeDatabase([]));
    render(<MapView />);
    expect(mapProps?.initialViewState).toEqual({
      latitude: 48.1,
      longitude: 11.5,
      zoom: 13,
    });
  });

  it("falls back to the default centre when no viewport is in the URL", () => {
    useDatabaseMock.mockReturnValue(makeDatabase([]));
    render(<MapView />);
    expect(mapProps?.initialViewState?.latitude).toBeCloseTo(52.52, 2);
    expect(mapProps?.initialViewState?.longitude).toBeCloseTo(13.405, 2);
  });

  it("seeds the filter panel from URL filter params", () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("from=2026-04-01&to=2026-04-30&p=11111111-1111-1111-1111-111111111111"),
    );
    useDatabaseMock.mockReturnValue(makeDatabase([]));
    render(<MapView />);
    expect(filterPanelProps?.filters).toEqual({
      from: "2026-04-01",
      to: "2026-04-30",
      participantIds: ["11111111-1111-1111-1111-111111111111"],
    });
  });

  it("applies the date filter to the rendered features", () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("from=2026-04-15"));
    useDatabaseMock.mockReturnValue(
      makeDatabase([
        makeDoc({ id: "before", started_at: "2026-04-01T08:00:00Z" }),
        makeDoc({ id: "after", started_at: "2026-04-20T08:00:00Z" }),
      ]),
    );
    render(<MapView />);
    expect(sourceProps?.data.features.map((f) => f.properties.id)).toEqual(["after"]);
    expect(screen.getByTestId("map-status-bar")).toHaveTextContent("1 von 2 Events (gefiltert)");
  });

  it("applies the participant filter using event_participants", () => {
    const personId = "aaaaaaaa-bbbb-cccc-dddd-000000000001";
    useSearchParamsMock.mockReturnValue(new URLSearchParams(`p=${personId}`));
    useDatabaseMock.mockReturnValue(
      makeDatabase(
        [makeDoc({ id: "with-person" }), makeDoc({ id: "without-person", lat: 48.1, lon: 11.5 })],
        [makeParticipant("with-person", personId)],
      ),
    );
    render(<MapView />);
    expect(sourceProps?.data.features.map((f) => f.properties.id)).toEqual(["with-person"]);
  });

  it("writes filter changes immediately to the URL", () => {
    useDatabaseMock.mockReturnValue(makeDatabase([]));
    render(<MapView />);
    act(() => {
      filterPanelProps?.onChange({
        from: "2026-04-01",
        to: null,
        participantIds: [],
      });
    });
    expect(routerReplaceMock).toHaveBeenCalledWith("/map?from=2026-04-01", { scroll: false });
  });

  it("debounces viewport URL writes by 300 ms", () => {
    vi.useFakeTimers();
    try {
      useDatabaseMock.mockReturnValue(makeDatabase([]));
      render(<MapView />);

      act(() => {
        mapProps?.onMoveEnd?.({
          viewState: { latitude: 50.1, longitude: 8.7, zoom: 12 },
        });
      });

      expect(routerReplaceMock).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(routerReplaceMock).toHaveBeenCalledTimes(1);
      expect(routerReplaceMock.mock.calls[0]?.[0]).toContain("lat=50.1");
      expect(routerReplaceMock.mock.calls[0]?.[0]).toContain("lon=8.7");
      expect(routerReplaceMock.mock.calls[0]?.[0]).toContain("zoom=12");
    } finally {
      vi.useRealTimers();
    }
  });

  it("collapses successive moves into a single URL write", () => {
    vi.useFakeTimers();
    try {
      useDatabaseMock.mockReturnValue(makeDatabase([]));
      render(<MapView />);
      act(() => {
        mapProps?.onMoveEnd?.({
          viewState: { latitude: 50.1, longitude: 8.7, zoom: 12 },
        });
        mapProps?.onMoveEnd?.({
          viewState: { latitude: 50.2, longitude: 8.8, zoom: 12.5 },
        });
        mapProps?.onMoveEnd?.({
          viewState: { latitude: 50.3, longitude: 8.9, zoom: 13 },
        });
      });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(routerReplaceMock).toHaveBeenCalledTimes(1);
      expect(routerReplaceMock.mock.calls[0]?.[0]).toContain("lat=50.3");
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows the active-filter badge when filters are applied", () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("from=2026-04-01"));
    useDatabaseMock.mockReturnValue(makeDatabase([]));
    render(<MapView />);
    expect(screen.getByTestId("map-filter-toggle")).toHaveAttribute("data-filter-active", "true");
    expect(screen.getByTestId("map-filter-toggle")).toHaveTextContent("Filter aktiv");
  });

  it("flies to the picked geocoding result", () => {
    useDatabaseMock.mockReturnValue(makeDatabase([]));
    render(<MapView />);
    expect(geocodeSearchProps).not.toBeNull();
    act(() => {
      geocodeSearchProps?.onSelect(48.137, 11.575);
    });
    expect(flyToMock).toHaveBeenCalledWith({
      center: [11.575, 48.137],
      zoom: 14,
    });
  });

  it("forwards the current viewport as proximity to the search box", () => {
    vi.useFakeTimers();
    try {
      useSearchParamsMock.mockReturnValue(new URLSearchParams("lat=48.1&lon=11.5&zoom=12"));
      useDatabaseMock.mockReturnValue(makeDatabase([]));
      render(<MapView />);

      // Initial viewport seeded from URL but viewportRef is set in
      // onMoveEnd; simulate one to populate it.
      act(() => {
        mapProps?.onMoveEnd?.({
          viewState: { latitude: 48.1, longitude: 11.5, zoom: 12 },
        });
      });

      const proximity = geocodeSearchProps?.getProximity?.() ?? null;
      expect(proximity).toEqual({ lat: 48.1, lon: 11.5 });
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns null proximity before any pan/zoom or URL viewport", () => {
    useDatabaseMock.mockReturnValue(makeDatabase([]));
    render(<MapView />);
    expect(geocodeSearchProps?.getProximity?.()).toBeNull();
  });
});
