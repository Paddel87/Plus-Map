/**
 * Component coverage for the unified `EventDetailView` (M5c.2,
 * ADR-038). Three concerns:
 *
 *   1. Live-action card visibility — quick-action buttons appear only
 *      while the event is live (`ended_at === null`).
 *   2. Application timeline gaps — between two completed applications
 *      whose `ended_at`/`started_at` differ by ≥ 1 second, a "Pause"
 *      row appears.
 *   3. Participants list masking — `reveal_participants === false`
 *      shows the placeholder for everyone except the requester
 *      (defense-in-depth on top of the backend masking).
 *
 * Live-state mutations (insert / patch) are exercised in the M5b.4
 * e2e suite; here we drive the view via injected RxDB streams and
 * focus on render correctness.
 */

import "fake-indexeddb/auto";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BehaviorSubject } from "rxjs";

import { EventDetailView } from "@/components/event/event-detail-view";
import { MASK_PLACEHOLDER } from "@/lib/masking";
import type { ApplicationDocType, EventDocType } from "@/lib/rxdb/types";
import type { AuthUser } from "@/lib/auth";
import type { EventDetail, PersonRead } from "@/lib/types";

function renderWithProviders(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const useDatabaseMock = vi.fn();

vi.mock("@/lib/rxdb/provider", () => ({
  useDatabase: () => useDatabaseMock(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}));

const PERSON_SELF = "00000000-0000-0000-0000-000000000001";
const PERSON_ALICE = "00000000-0000-0000-0000-0000000000a1";
const PERSON_BOB = "00000000-0000-0000-0000-0000000000b2";
const EVENT_ID = "11111111-2222-3333-4444-555555555555";

const USER: AuthUser = {
  id: "00000000-0000-0000-0000-000000000099",
  email: "self@example.com",
  role: "editor",
  display_name: "Self",
  person_id: PERSON_SELF,
  is_active: true,
  is_verified: true,
};

function makePerson(id: string, name: string, alias: string | null = null): PersonRead {
  return {
    id,
    name,
    alias,
    note: null,
    origin: "managed",
    linkable: false,
    is_deleted: false,
    deleted_at: null,
    created_at: "2026-04-27T12:00:00Z",
  };
}

function makeEvent(overrides: Partial<EventDetail> = {}): EventDetail {
  return {
    id: EVENT_ID,
    started_at: "2026-04-27T12:00:00Z",
    ended_at: null,
    lat: 52.5,
    lon: 13.4,
    reveal_participants: false,
    note: null,
    legacy_external_ref: null,
    created_by: null,
    created_at: "2026-04-27T12:00:00Z",
    updated_at: "2026-04-27T12:00:00Z",
    plus_code: "9F4MGCC8+VC",
    participants: [makePerson(PERSON_SELF, "Self"), makePerson(PERSON_ALICE, "Alice")],
    ...overrides,
  };
}

function makeApplication(
  seq: number,
  overrides: Partial<ApplicationDocType> = {},
): ApplicationDocType {
  const startBase = new Date("2026-04-27T12:00:00Z").getTime();
  const startedAt = new Date(startBase + (seq - 1) * 5 * 60_000).toISOString();
  return {
    id: `app-${seq.toString().padStart(8, "0")}-aaaa-bbbb-cccc-dddddddddddd`,
    event_id: EVENT_ID,
    performer_id: PERSON_SELF,
    recipient_id: PERSON_ALICE,
    arm_position_id: null,
    hand_position_id: null,
    hand_orientation_id: null,
    sequence_no: seq,
    started_at: startedAt,
    ended_at: null,
    note: null,
    created_by: null,
    created_at: startedAt,
    updated_at: startedAt,
    deleted_at: null,
    _deleted: false,
    restraint_type_ids: [],
    ...overrides,
  };
}

interface FakeDatabase {
  events: { findOne: () => { $: BehaviorSubject<{ toJSON: () => EventDocType } | null> } };
  applications: {
    find: () => { $: BehaviorSubject<{ toJSON: () => ApplicationDocType }[]> };
  };
}

function makeDatabase(applications: ApplicationDocType[]): FakeDatabase {
  const eventSubject = new BehaviorSubject<{ toJSON: () => EventDocType } | null>(null);
  const appsSubject = new BehaviorSubject<{ toJSON: () => ApplicationDocType }[]>(
    applications.map((a) => ({ toJSON: () => a })),
  );
  return {
    events: { findOne: () => ({ $: eventSubject }) },
    applications: { find: () => ({ $: appsSubject }) },
  };
}

beforeEach(() => {
  useDatabaseMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("EventDetailView — render decision tree (M5c.2, ADR-038)", () => {
  it("shows live-action buttons while the event is running", () => {
    useDatabaseMock.mockReturnValue(makeDatabase([]));
    renderWithProviders(<EventDetailView user={USER} initialEvent={makeEvent()} />);
    expect(screen.getByRole("button", { name: /Neue Application/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Event beenden/ })).toBeInTheDocument();
  });

  it("hides live-action buttons once the event has ended", () => {
    useDatabaseMock.mockReturnValue(makeDatabase([]));
    renderWithProviders(
      <EventDetailView
        user={USER}
        initialEvent={makeEvent({ ended_at: "2026-04-27T13:30:00Z" })}
      />,
    );
    expect(screen.queryByRole("button", { name: /Neue Application/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Event beenden/ })).toBeNull();
    // Status header switches.
    expect(screen.getByText("Event beendet")).toBeInTheDocument();
  });

  it("renders an explicit pause row between two completed applications", () => {
    // app1 ends at 12:05, app2 starts at 12:10 → 5 min gap.
    const app1 = makeApplication(1, {
      started_at: "2026-04-27T12:00:00Z",
      ended_at: "2026-04-27T12:05:00Z",
    });
    const app2 = makeApplication(2, {
      started_at: "2026-04-27T12:10:00Z",
      ended_at: "2026-04-27T12:15:00Z",
    });
    useDatabaseMock.mockReturnValue(makeDatabase([app1, app2]));
    renderWithProviders(
      <EventDetailView
        user={USER}
        initialEvent={makeEvent({ ended_at: "2026-04-27T12:15:00Z" })}
      />,
    );
    const gaps = screen.getAllByTestId("applications-timeline-gap");
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toHaveTextContent(/Pause · 05:00/);
  });

  it("does not render a gap when the previous application is still running", () => {
    const app1 = makeApplication(1, {
      started_at: "2026-04-27T12:00:00Z",
      ended_at: null, // still active
    });
    const app2 = makeApplication(2, { started_at: "2026-04-27T12:10:00Z" });
    useDatabaseMock.mockReturnValue(makeDatabase([app1, app2]));
    renderWithProviders(<EventDetailView user={USER} initialEvent={makeEvent()} />);
    expect(screen.queryAllByTestId("applications-timeline-gap")).toHaveLength(0);
  });

  it("masks non-self participants when reveal_participants is false", () => {
    useDatabaseMock.mockReturnValue(makeDatabase([]));
    renderWithProviders(
      <EventDetailView
        user={USER}
        initialEvent={makeEvent({
          reveal_participants: false,
          participants: [
            makePerson(PERSON_SELF, "Self", "selfie"),
            makePerson(PERSON_ALICE, "Alice", "ali"),
            makePerson(PERSON_BOB, "Bob"),
          ],
        })}
      />,
    );
    const items = screen.getAllByTestId("participants-list-item");
    expect(items).toHaveLength(3);
    const masked = items.filter((el) => el.dataset.masked === "true");
    const unmasked = items.filter((el) => el.dataset.masked === "false");
    expect(masked).toHaveLength(2);
    expect(unmasked).toHaveLength(1);
    expect(unmasked[0]).toHaveTextContent("Self");
    masked.forEach((el) => expect(el).toHaveTextContent(MASK_PLACEHOLDER));
    // Self alias still visible because the requester sees themselves
    // unmasked.
    expect(screen.getByText(/selfie/)).toBeInTheDocument();
    // Alice's alias must NOT leak through the mask.
    expect(screen.queryByText(/ali$/)).toBeNull();
  });

  it("shows the Edit-button when the user can edit (admin)", () => {
    useDatabaseMock.mockReturnValue(makeDatabase([]));
    const admin: AuthUser = { ...USER, role: "admin" };
    renderWithProviders(
      <EventDetailView user={admin} initialEvent={makeEvent({ created_by: "someone-else" })} />,
    );
    expect(screen.getByTestId("edit-event-button")).toBeInTheDocument();
  });

  it("shows the Edit-button when the editor created the event", () => {
    useDatabaseMock.mockReturnValue(makeDatabase([]));
    renderWithProviders(
      <EventDetailView user={USER} initialEvent={makeEvent({ created_by: USER.id })} />,
    );
    expect(screen.getByTestId("edit-event-button")).toBeInTheDocument();
  });

  it("hides the Edit-button when the editor did not create the event", () => {
    useDatabaseMock.mockReturnValue(makeDatabase([]));
    renderWithProviders(
      <EventDetailView user={USER} initialEvent={makeEvent({ created_by: "someone-else" })} />,
    );
    expect(screen.queryByTestId("edit-event-button")).not.toBeInTheDocument();
  });

  it("hides the Edit-button for viewers", () => {
    useDatabaseMock.mockReturnValue(makeDatabase([]));
    const viewer: AuthUser = { ...USER, role: "viewer" };
    renderWithProviders(
      <EventDetailView user={viewer} initialEvent={makeEvent({ created_by: viewer.id })} />,
    );
    expect(screen.queryByTestId("edit-event-button")).not.toBeInTheDocument();
  });

  it("hides the legacy_external_ref label when the value is null (M5c-NACH, ADR-050)", () => {
    useDatabaseMock.mockReturnValue(makeDatabase([]));
    renderWithProviders(
      <EventDetailView user={USER} initialEvent={makeEvent({ legacy_external_ref: null })} />,
    );
    expect(screen.queryByTestId("event-detail-legacy-ref")).toBeNull();
  });

  it("shows the legacy_external_ref label when the value is set (M5c-NACH, ADR-050)", () => {
    useDatabaseMock.mockReturnValue(makeDatabase([]));
    renderWithProviders(
      <EventDetailView
        user={USER}
        initialEvent={makeEvent({ legacy_external_ref: "w3w://demo.alpha.foxtrot" })}
      />,
    );
    const ref = screen.getByTestId("event-detail-legacy-ref");
    expect(ref).toHaveTextContent("Externe Referenz");
    expect(ref).toHaveTextContent("w3w://demo.alpha.foxtrot");
  });

  it("shows real names when reveal_participants is true", () => {
    useDatabaseMock.mockReturnValue(makeDatabase([]));
    renderWithProviders(
      <EventDetailView
        user={USER}
        initialEvent={makeEvent({
          reveal_participants: true,
          participants: [
            makePerson(PERSON_SELF, "Self"),
            makePerson(PERSON_ALICE, "Alice"),
            makePerson(PERSON_BOB, "Bob"),
          ],
        })}
      />,
    );
    const items = screen.getAllByTestId("participants-list-item");
    expect(items).toHaveLength(3);
    items.forEach((el) => expect(el.dataset.masked).toBe("false"));
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });
});
