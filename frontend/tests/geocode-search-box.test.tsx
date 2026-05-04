/**
 * Component coverage for `GeocodeSearchBox` (M6.5, ADR-041 §J).
 *
 * Stubs `globalThis.fetch` for the `/api/geocode` proxy and `sonner`
 * for the toast assertions. The ApiError → toast mapping is verified
 * end-to-end through `apiFetch`, which is the production code path.
 *
 * Tests use real timers and `waitFor` (the debounce window is short
 * enough for direct waits); a single dedicated test exercises the
 * debounce window with fake timers.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock("sonner", () => ({
  toast: { error: toastError, success: vi.fn(), message: vi.fn() },
}));

import { GeocodeSearchBox } from "@/components/map/geocode-search-box";

function makeFeature(overrides: Record<string, unknown> = {}) {
  return {
    id: "place-1",
    place_name: "Berlin, Germany",
    center: [13.405, 52.52],
    ...overrides,
  };
}

function mockFetch(handler: (url: string) => Response | Promise<Response>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      return handler(url);
    }),
  );
}

beforeEach(() => {
  toastError.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("GeocodeSearchBox (M6.5)", () => {
  it("does not query while the input is below the minimum length", async () => {
    mockFetch(() => new Response("{}", { status: 200 }));
    render(<GeocodeSearchBox onSelect={() => {}} />);
    fireEvent.change(screen.getByTestId("map-geocode-input"), {
      target: { value: "B" },
    });
    // Wait past the debounce window with real timers.
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("debounces successive keystrokes into a single fetch for the final value", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify({ features: [makeFeature()] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    render(<GeocodeSearchBox onSelect={() => {}} />);

    fireEvent.change(screen.getByTestId("map-geocode-input"), {
      target: { value: "Be" },
    });
    fireEvent.change(screen.getByTestId("map-geocode-input"), {
      target: { value: "Ber" },
    });
    fireEvent.change(screen.getByTestId("map-geocode-input"), {
      target: { value: "Berlin" },
    });
    // Mid-debounce: nothing should have hit the network yet.
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(globalThis.fetch).not.toHaveBeenCalled();

    // Past the 300 ms debounce window — exactly one fetch for the
    // final value, not three.
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });
    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("/api/geocode");
    expect(calledUrl).toContain("q=Berlin");
    expect(calledUrl).toContain("limit=5");
  });

  it("appends the proximity bias when getProximity returns coordinates", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify({ features: [makeFeature()] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    render(
      <GeocodeSearchBox getProximity={() => ({ lat: 48.137, lon: 11.575 })} onSelect={() => {}} />,
    );
    fireEvent.change(screen.getByTestId("map-geocode-input"), {
      target: { value: "Park" },
    });
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(url).toMatch(/proximity=48\.137(%2C|,)11\.575/);
  });

  it("renders results and selects one on click", async () => {
    mockFetch(
      () =>
        new Response(
          JSON.stringify({
            features: [
              makeFeature({ id: "p1", place_name: "Berlin" }),
              makeFeature({ id: "p2", place_name: "Berlin Mitte", center: [13.4, 52.5] }),
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );
    const onSelect = vi.fn();
    render(<GeocodeSearchBox onSelect={onSelect} />);

    fireEvent.change(screen.getByTestId("map-geocode-input"), {
      target: { value: "Berlin" },
    });
    await waitFor(() => {
      expect(screen.getByTestId("map-geocode-results")).toBeInTheDocument();
    });
    const items = screen.getAllByTestId("map-geocode-result");
    expect(items).toHaveLength(2);

    fireEvent.mouseDown(items[1]!);
    expect(onSelect).toHaveBeenCalledWith(52.5, 13.4);
  });

  it("shows an empty hint when the API returns no features", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify({ features: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    render(<GeocodeSearchBox onSelect={() => {}} />);

    fireEvent.change(screen.getByTestId("map-geocode-input"), {
      target: { value: "Nirgendwo" },
    });
    await waitFor(() => {
      expect(screen.getByTestId("map-geocode-empty")).toBeInTheDocument();
    });
  });

  it("shows a 429 toast when the rate limit is exceeded", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify({ detail: "Rate limit exceeded." }), {
          status: 429,
          headers: { "content-type": "application/json" },
        }),
    );
    render(<GeocodeSearchBox onSelect={() => {}} />);
    fireEvent.change(screen.getByTestId("map-geocode-input"), {
      target: { value: "Berlin" },
    });
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        "Geocoding-Limit erreicht",
        expect.objectContaining({
          description: expect.stringMatching(/erneut/i),
        }),
      );
    });
  });

  it("shows a 503 toast when the provider is not configured", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify({ detail: "Geocoding provider not configured." }), {
          status: 503,
          headers: { "content-type": "application/json" },
        }),
    );
    render(<GeocodeSearchBox onSelect={() => {}} />);
    fireEvent.change(screen.getByTestId("map-geocode-input"), {
      target: { value: "Berlin" },
    });
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        "Adress-Suche nicht konfiguriert",
        expect.any(Object),
      );
    });
  });

  it("shows a 502 toast when MapTiler is unreachable", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify({ detail: "Geocoding upstream unreachable." }), {
          status: 502,
          headers: { "content-type": "application/json" },
        }),
    );
    render(<GeocodeSearchBox onSelect={() => {}} />);
    fireEvent.change(screen.getByTestId("map-geocode-input"), {
      target: { value: "Berlin" },
    });
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Adress-Suche nicht erreichbar", expect.any(Object));
    });
  });

  it("clears the input via the X button", () => {
    mockFetch(() => new Response(JSON.stringify({ features: [] }), { status: 200 }));
    render(<GeocodeSearchBox onSelect={() => {}} />);
    fireEvent.change(screen.getByTestId("map-geocode-input"), {
      target: { value: "abc" },
    });
    expect(screen.getByTestId("map-geocode-clear")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("map-geocode-clear"));
    expect((screen.getByTestId("map-geocode-input") as HTMLInputElement).value).toBe("");
  });

  it("ignores stale responses when the user typed faster than the network", async () => {
    let resolveFirst: ((response: Response) => void) | null = null;
    const fetchMock = vi.fn(async (input: RequestInfo) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("q=Berlin")) {
        return new Promise<Response>((resolve) => {
          resolveFirst = resolve;
        });
      }
      return new Response(JSON.stringify({ features: [makeFeature({ place_name: "Bonn" })] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<GeocodeSearchBox onSelect={() => {}} />);
    fireEvent.change(screen.getByTestId("map-geocode-input"), {
      target: { value: "Berlin" },
    });
    // Wait past the debounce window so the first request fires.
    await new Promise((resolve) => setTimeout(resolve, 350));

    fireEvent.change(screen.getByTestId("map-geocode-input"), {
      target: { value: "Bonn" },
    });
    await waitFor(() => {
      expect(screen.getByText("Bonn")).toBeInTheDocument();
    });

    // Late first response — should be ignored.
    resolveFirst?.(
      new Response(JSON.stringify({ features: [makeFeature({ place_name: "Berlin" })] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    // The DOM should still show Bonn, not Berlin.
    expect(screen.queryByText("Berlin")).toBeNull();
  });
});
