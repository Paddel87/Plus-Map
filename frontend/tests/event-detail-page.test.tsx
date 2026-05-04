/**
 * Render-decision-tree coverage for the M5c.1a client-only detail page.
 *
 * The page composes three async signals (auth, RxDB doc, REST detail);
 * this suite pins the four user-visible outcomes named in ADR-036 §H:
 *
 *   1. loading skeleton while either signal is unresolved
 *   2. REST OK → EventDetailView with the server-supplied EventDetail
 *   3. REST 404 + RxDB has the doc → synthesized EventDetail (offline-
 *      insert-then-direct-nav), participants/plus_code empty
 *   4. REST 404 + RxDB resolved-empty → next/navigation `notFound()`
 *
 * The downstream `EventDetailView` (M5c.2, ADR-038) is replaced by a
 * minimal stub — its own integration with RxDB and masking lives in
 * `tests/event-detail-view.test.tsx`.
 */

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { Subscription } from "rxjs";
import { BehaviorSubject } from "rxjs";

import type { AuthUser } from "@/lib/auth";
import type { EventDocType } from "@/lib/rxdb/types";
import type { EventDetail } from "@/lib/types";

const apiFetchMock = vi.fn();
const useMeMock = vi.fn();
const useDatabaseMock = vi.fn();
// In production, `notFound()` throws a sentinel error that React's
// 404 boundary catches. In jsdom we just record the call — the test
// then asserts that the page reached this branch without having to
// reconstruct the boundary.
const notFoundMock = vi.fn();
const routerReplaceMock = vi.fn();

vi.mock("@/lib/api", () => ({
  apiFetch: (path: string) => apiFetchMock(path),
  ApiError: class ApiError extends Error {
    readonly status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("@/lib/auth", () => ({
  useMe: () => useMeMock(),
}));

vi.mock("@/lib/rxdb/provider", () => ({
  useDatabase: () => useDatabaseMock(),
}));

const useParamsMock = vi.fn();

vi.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
  useRouter: () => ({ replace: routerReplaceMock, push: vi.fn(), refresh: vi.fn() }),
  useParams: () => useParamsMock(),
}));

vi.mock("@/components/event/event-detail-view", () => ({
  EventDetailView: ({ initialEvent }: { user: AuthUser; initialEvent: EventDetail }) => (
    <div
      data-testid="event-detail-view"
      data-event-id={initialEvent.id}
      data-plus-code={initialEvent.plus_code}
      data-participants={initialEvent.participants.length}
    />
  ),
}));

import EventDetailPage from "@/app/(protected)/events/[id]/page";

const EVENT_ID = "11111111-2222-3333-4444-555555555555";
const USER: AuthUser = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "tester@example.com",
  role: "editor",
  display_name: "Tester",
  person_id: "00000000-0000-0000-0000-0000000000aa",
  is_active: true,
  is_verified: true,
};

function freshEventDoc(): EventDocType {
  const now = new Date("2026-04-27T12:00:00Z").toISOString();
  return {
    id: EVENT_ID,
    started_at: now,
    ended_at: null,
    lat: 52.5,
    lon: 13.4,
    legacy_external_ref: null,
    reveal_participants: false,
    note: null,
    created_by: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    _deleted: false,
  };
}

function freshEventDetail(overrides: Partial<EventDetail> = {}): EventDetail {
  const now = new Date("2026-04-27T12:00:00Z").toISOString();
  return {
    id: EVENT_ID,
    started_at: now,
    ended_at: null,
    lat: 52.5,
    lon: 13.4,
    reveal_participants: false,
    note: null,
    legacy_external_ref: null,
    created_by: null,
    created_at: now,
    updated_at: now,
    plus_code: "9F4MGCC8+VC",
    participants: [
      {
        id: "00000000-0000-0000-0000-0000000000aa",
        name: "Tester",
        alias: null,
        note: null,
        origin: "managed",
        linkable: false,
        is_deleted: false,
        deleted_at: null,
        created_at: now,
      },
    ],
    ...overrides,
  };
}

interface FakeDatabase {
  events: {
    findOne: (id: string) => {
      $: {
        subscribe: (next: (doc: { toJSON: () => EventDocType } | null) => void) => Subscription;
      };
    };
  };
  event_participants: {
    find: (query?: unknown) => {
      $: {
        subscribe: (next: (rows: { toJSON: () => unknown }[]) => void) => Subscription;
      };
    };
  };
}

function makeFakeDatabase(initial: EventDocType | null): {
  database: FakeDatabase;
  emit: (next: EventDocType | null) => void;
} {
  const subject = new BehaviorSubject<{ toJSON: () => EventDocType } | null>(
    initial ? { toJSON: () => initial } : null,
  );
  // M5c.1b: the page also subscribes to `database.event_participants`.
  // Tests don't exercise auto-participant flows here (that's the
  // replication.e2e.test.ts territory) — just hand the page an empty
  // rows stream so the subscription completes its first emission.
  const participants$ = new BehaviorSubject<{ toJSON: () => unknown }[]>([]);
  return {
    database: {
      events: {
        findOne: () => ({ $: subject }),
      },
      event_participants: {
        find: () => ({ $: participants$ }),
      },
    },
    emit: (next: EventDocType | null) => subject.next(next ? { toJSON: () => next } : null),
  };
}

function renderWith(params: { id: string }): ReactNode {
  useParamsMock.mockReturnValue(params);
  return <EventDetailPage />;
}

beforeEach(() => {
  apiFetchMock.mockReset();
  useMeMock.mockReset();
  useDatabaseMock.mockReset();
  useParamsMock.mockReset();
  notFoundMock.mockClear();
  routerReplaceMock.mockClear();
  useMeMock.mockReturnValue({ isPending: false, data: USER });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("EventDetailPage — render decision tree (M5c.1a, ADR-036 §H)", () => {
  it("renders the loading skeleton while REST and RxDB are still resolving", async () => {
    // RxDB unresolved: subscribe never fires.
    useDatabaseMock.mockReturnValue({
      events: {
        findOne: () => ({ $: { subscribe: () => ({ unsubscribe: () => {} }) } }),
      },
      event_participants: {
        find: () => ({ $: { subscribe: () => ({ unsubscribe: () => {} }) } }),
      },
    });
    // REST hangs.
    apiFetchMock.mockReturnValue(new Promise(() => {}));

    render(renderWith({ id: EVENT_ID }));
    expect(await screen.findByTestId("event-detail-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("event-detail-view")).not.toBeInTheDocument();
  });

  it("renders LiveEventView with the REST detail when the server returns 200", async () => {
    const { database } = makeFakeDatabase(null);
    useDatabaseMock.mockReturnValue(database);
    apiFetchMock.mockResolvedValue(freshEventDetail());

    render(renderWith({ id: EVENT_ID }));

    const view = await screen.findByTestId("event-detail-view");
    expect(view.dataset.eventId).toBe(EVENT_ID);
    expect(view.dataset.plusCode).toBe("9F4MGCC8+VC");
    expect(view.dataset.participants).toBe("1");
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("falls back to a synthesized EventDetail when REST returns 404 but RxDB has the doc", async () => {
    const { database } = makeFakeDatabase(freshEventDoc());
    useDatabaseMock.mockReturnValue(database);
    const { ApiError } = await import("@/lib/api");
    apiFetchMock.mockRejectedValue(new ApiError("not found", 404));

    render(renderWith({ id: EVENT_ID }));

    const view = await screen.findByTestId("event-detail-view");
    expect(view.dataset.eventId).toBe(EVENT_ID);
    // Synthesized payload has empty plus_code and zero participants until
    // M5c.1b promotes participants to a sync collection.
    expect(view.dataset.plusCode).toBe("");
    expect(view.dataset.participants).toBe("0");
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("calls notFound() when REST returns 404 and RxDB is resolved-empty", async () => {
    const { database } = makeFakeDatabase(null);
    useDatabaseMock.mockReturnValue(database);
    const { ApiError } = await import("@/lib/api");
    apiFetchMock.mockRejectedValue(new ApiError("gone", 404));

    render(renderWith({ id: EVENT_ID }));
    await waitFor(() => expect(notFoundMock).toHaveBeenCalled());
    expect(screen.queryByTestId("event-detail-view")).not.toBeInTheDocument();
  });

  it("redirects anonymous users to /login with a next param", async () => {
    useMeMock.mockReturnValue({ isPending: false, data: null });
    useDatabaseMock.mockReturnValue({
      events: {
        findOne: () => ({ $: { subscribe: () => ({ unsubscribe: () => {} }) } }),
      },
      event_participants: {
        find: () => ({ $: { subscribe: () => ({ unsubscribe: () => {} }) } }),
      },
    });
    apiFetchMock.mockReturnValue(new Promise(() => {}));

    render(renderWith({ id: EVENT_ID }));

    await waitFor(() =>
      expect(routerReplaceMock).toHaveBeenCalledWith(`/login?next=/events/${EVENT_ID}`),
    );
    expect(await screen.findByTestId("event-detail-skeleton")).toBeInTheDocument();
  });
});
