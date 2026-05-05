/**
 * Component coverage for the M5c.3 backfill form (ADR-039).
 *
 * Heavy lifting (timestamp consistency, overlap, sort order) lives
 * in `tests/event-backfill-validation.test.ts`; here we exercise the
 * thin React layer:
 *
 *   1. Add / remove application rows.
 *   2. Block submission when location or started_at is missing —
 *      the toast fires and no RxDB insert happens.
 *   3. Successful submit with two applications inserts them in
 *      chronological order with sequence_no 1..N (server-overrides
 *      not modelled here; we just check the optimistic value).
 *
 * `LocationPickerMap`, `RecipientPicker` and `useGeolocation` are
 * replaced by stubs so the test stays a pure component test.
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EventBackfillForm } from "@/components/event/event-backfill-form";
import type { AuthUser } from "@/lib/auth";
import type { PersonRead } from "@/lib/types";

const eventInsertMock = vi.fn();
const applicationInsertMock = vi.fn();
const useDatabaseMock = vi.fn();
const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();
const routerPushMock = vi.fn();
const routerRefreshMock = vi.fn();
const routerBackMock = vi.fn();

vi.mock("@/lib/rxdb/provider", () => ({
  useDatabase: () => useDatabaseMock(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPushMock,
    refresh: routerRefreshMock,
    back: routerBackMock,
    replace: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}));

vi.mock("@/hooks/use-geolocation", () => ({
  useGeolocation: () => ({
    fix: null,
    status: "idle" as const,
    error: null,
    request: () => {},
  }),
}));

vi.mock("@/components/map/location-picker-map", () => ({
  LocationPickerMap: ({
    onChange,
    lat,
    lon,
  }: {
    lat: number | null;
    lon: number | null;
    onChange: (next: { lat: number; lon: number }) => void;
  }) => (
    <button
      type="button"
      data-testid="location-picker-stub"
      data-lat={lat ?? ""}
      data-lon={lon ?? ""}
      onClick={() => onChange({ lat: 52.5, lon: 13.4 })}
    >
      set-location
    </button>
  ),
}));

const ALICE: PersonRead = {
  id: "00000000-0000-0000-0000-0000000000a1",
  name: "Alice",
  alias: null,
  note: null,
  origin: "managed",
  linkable: false,
  is_deleted: false,
  deleted_at: null,
  created_at: "2026-04-27T12:00:00Z",
};

vi.mock("@/components/person/recipient-picker", () => ({
  RecipientPicker: ({
    value,
    onChange,
  }: {
    value: PersonRead | null;
    onChange: (p: PersonRead | null) => void;
  }) => (
    <button
      type="button"
      data-testid="recipient-picker-stub"
      data-recipient-id={value?.id ?? ""}
      onClick={() => onChange(ALICE)}
    >
      pick-alice
    </button>
  ),
}));

vi.mock("@/components/catalog/equipment-picker", () => ({
  EquipmentPicker: ({
    value,
    onChange,
  }: {
    value: readonly string[];
    onChange: (ids: string[]) => void;
  }) => (
    <button
      type="button"
      data-testid="equipment-picker-stub"
      data-restraints={value.join(",")}
      onClick={() => onChange(["00000000-0000-0000-0000-0000000000ff"])}
    >
      pick-restraint
    </button>
  ),
}));

const USER: AuthUser = {
  id: "00000000-0000-0000-0000-000000000099",
  email: "self@example.com",
  role: "editor",
  display_name: "Self",
  person_id: "00000000-0000-0000-0000-000000000010",
  is_active: true,
  is_verified: true,
};

beforeEach(() => {
  eventInsertMock.mockReset();
  applicationInsertMock.mockReset();
  toastErrorMock.mockReset();
  toastSuccessMock.mockReset();
  routerPushMock.mockReset();
  routerRefreshMock.mockReset();
  routerBackMock.mockReset();
  useDatabaseMock.mockReset();
  useDatabaseMock.mockReturnValue({
    events: { insert: eventInsertMock },
    applications: { insert: applicationInsertMock },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function setEventStartedAt(value: string): void {
  fireEvent.change(screen.getByTestId("event-backfill-started-at"), {
    target: { value },
  });
}

function setEventEndedAt(value: string): void {
  fireEvent.change(screen.getByTestId("event-backfill-ended-at"), {
    target: { value },
  });
}

function clickLocation(): void {
  fireEvent.click(screen.getByTestId("location-picker-stub"));
}

function addApplication(): void {
  fireEvent.click(screen.getByTestId("event-backfill-add-application"));
}

function submit(): void {
  fireEvent.click(screen.getByRole("button", { name: /Tour speichern/ }));
}

describe("EventBackfillForm — submit guards (M5c.3, ADR-039 §E)", () => {
  it("refuses to submit without a location", () => {
    render(<EventBackfillForm user={USER} />);
    setEventStartedAt("2026-04-27T12:00");
    submit();
    expect(toastErrorMock).toHaveBeenCalled();
    expect(eventInsertMock).not.toHaveBeenCalled();
  });

  it("refuses to submit without an event started_at", () => {
    render(<EventBackfillForm user={USER} />);
    clickLocation();
    submit();
    expect(toastErrorMock).toHaveBeenCalled();
    expect(eventInsertMock).not.toHaveBeenCalled();
  });

  it("flags an application without a recipient", () => {
    // `addApplication()` prefills `startedAt` from the event's
    // `startedAt` (UX nicety) but recipient stays null until the user
    // picks one — this test exercises that exact gap.
    render(<EventBackfillForm user={USER} />);
    clickLocation();
    setEventStartedAt("2026-04-27T12:00");
    addApplication();
    submit();
    expect(toastErrorMock).toHaveBeenCalled();
    const row = screen.getByTestId("event-backfill-application-row");
    expect(row.textContent).toMatch(/Begleitung ist Pflicht/);
    expect(eventInsertMock).not.toHaveBeenCalled();
  });
});

describe("EventBackfillForm — application list", () => {
  it("adds and removes application rows", () => {
    render(<EventBackfillForm user={USER} />);
    expect(screen.queryAllByTestId("event-backfill-application-row")).toHaveLength(0);
    addApplication();
    addApplication();
    expect(screen.queryAllByTestId("event-backfill-application-row")).toHaveLength(2);
    fireEvent.click(screen.getAllByTestId("event-backfill-remove-application")[0]!);
    expect(screen.queryAllByTestId("event-backfill-application-row")).toHaveLength(1);
  });
});

describe("EventBackfillForm — legacy_external_ref (M5c-NACH, ADR-050)", () => {
  it("forwards a trimmed legacy_external_ref into the event insert", async () => {
    render(<EventBackfillForm user={USER} />);
    clickLocation();
    setEventStartedAt("2026-04-27T12:00");
    fireEvent.change(screen.getByTestId("event-backfill-legacy-ref"), {
      target: { value: "  w3w://demo.alpha.foxtrot  " },
    });
    submit();

    await vi.waitFor(() => expect(toastSuccessMock).toHaveBeenCalled());
    const inserted = eventInsertMock.mock.calls[0]![0];
    expect(inserted.legacy_external_ref).toBe("w3w://demo.alpha.foxtrot");
  });

  it("inserts null when the legacy_external_ref input is left blank", async () => {
    render(<EventBackfillForm user={USER} />);
    clickLocation();
    setEventStartedAt("2026-04-27T12:00");
    submit();

    await vi.waitFor(() => expect(toastSuccessMock).toHaveBeenCalled());
    const inserted = eventInsertMock.mock.calls[0]![0];
    expect(inserted.legacy_external_ref).toBeNull();
  });
});

describe("EventBackfillForm — happy path", () => {
  it("inserts an event followed by two applications in chronological order", async () => {
    render(<EventBackfillForm user={USER} />);
    clickLocation();
    setEventStartedAt("2026-04-27T12:00");
    setEventEndedAt("2026-04-27T13:00");

    addApplication();
    addApplication();

    const rows = screen.getAllByTestId("event-backfill-application-row");
    // Row 0: started 12:30 (later), Row 1: started 12:10 (earlier).
    // The form must sort them on submit so sequence_no follows
    // chronological order.
    fireEvent.change(within(rows[0]!).getByLabelText("Start"), {
      target: { value: "2026-04-27T12:30" },
    });
    fireEvent.change(within(rows[0]!).getByLabelText("Ende (optional)"), {
      target: { value: "2026-04-27T12:45" },
    });
    fireEvent.click(within(rows[0]!).getByTestId("recipient-picker-stub"));

    fireEvent.change(within(rows[1]!).getByLabelText("Start"), {
      target: { value: "2026-04-27T12:10" },
    });
    fireEvent.change(within(rows[1]!).getByLabelText("Ende (optional)"), {
      target: { value: "2026-04-27T12:25" },
    });
    fireEvent.click(within(rows[1]!).getByTestId("recipient-picker-stub"));

    submit();

    // Submission is async — wait for the success toast.
    await vi.waitFor(() => expect(toastSuccessMock).toHaveBeenCalled());

    expect(eventInsertMock).toHaveBeenCalledTimes(1);
    expect(applicationInsertMock).toHaveBeenCalledTimes(2);

    const firstApp = applicationInsertMock.mock.calls[0]![0];
    const secondApp = applicationInsertMock.mock.calls[1]![0];
    // Chronological: 12:10 first, 12:30 second.
    expect(firstApp.started_at).toBe(new Date("2026-04-27T12:10").toISOString());
    expect(secondApp.started_at).toBe(new Date("2026-04-27T12:30").toISOString());
    expect(firstApp.sequence_no).toBe(1);
    expect(secondApp.sequence_no).toBe(2);

    expect(routerPushMock).toHaveBeenCalledWith(expect.stringMatching(/^\/events\//));
  });
});
