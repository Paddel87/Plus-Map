/**
 * Component coverage for the M5c.4 edit form (ADR-040).
 *
 * Mutation rule recap (ADR-029, ADR-040 §C):
 *   - editable: event note, event reveal_participants, event ended_at
 *               (only when null), application note/recipient,
 *               application ended_at (only when null).
 *   - immutable: lat, lon, started_at, performer, position FKs,
 *                sequence_no, created_by.
 *
 * Tests focus on the diff-and-patch behaviour (only changed docs are
 * touched) and the soft-delete path (window.confirm + RxDB-Patch).
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EventEditForm } from "@/components/event/event-edit-form";
import type { AuthUser } from "@/lib/auth";
import type { ApplicationDocType, EventDocType } from "@/lib/rxdb/types";
import type { EventDetail, PersonRead } from "@/lib/types";

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

vi.mock("@/components/catalog/restraint-picker", () => ({
  RestraintPicker: ({
    value,
    onChange,
  }: {
    value: readonly string[];
    onChange: (ids: string[]) => void;
  }) => (
    <button
      type="button"
      data-testid="restraint-picker-stub"
      data-restraints={value.join(",")}
      onClick={() => onChange(["00000000-0000-0000-0000-0000000000ff"])}
    >
      pick-restraint
    </button>
  ),
}));

const EVENT_ID = "11111111-2222-3333-4444-555555555555";
const APP_ID = "22222222-3333-4444-5555-666666666666";
const PERSON_SELF = "00000000-0000-0000-0000-000000000010";

const USER: AuthUser = {
  id: "00000000-0000-0000-0000-000000000099",
  email: "self@example.com",
  role: "editor",
  display_name: "Self",
  person_id: PERSON_SELF,
  is_active: true,
  is_verified: true,
};

function makeInitialEvent(overrides: Partial<EventDetail> = {}): EventDetail {
  return {
    id: EVENT_ID,
    started_at: "2026-04-27T12:00:00.000Z",
    ended_at: null,
    lat: 52.5,
    lon: 13.4,
    reveal_participants: false,
    note: "old note",
    legacy_external_ref: null,
    created_by: USER.id,
    created_at: "2026-04-27T12:00:00.000Z",
    updated_at: "2026-04-27T12:00:00.000Z",
    plus_code: "9F4MGCC8+VC",
    participants: [
      {
        id: PERSON_SELF,
        name: "Self",
        alias: null,
        note: null,
        origin: "managed",
        linkable: false,
        is_deleted: false,
        deleted_at: null,
        created_at: "2026-04-27T12:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

function makeApplication(overrides: Partial<ApplicationDocType> = {}): ApplicationDocType {
  return {
    id: APP_ID,
    event_id: EVENT_ID,
    performer_id: PERSON_SELF,
    recipient_id: PERSON_SELF,
    sequence_no: 1,
    started_at: "2026-04-27T12:05:00.000Z",
    ended_at: null,
    note: "before",
    created_by: USER.id,
    created_at: "2026-04-27T12:05:00.000Z",
    updated_at: "2026-04-27T12:05:00.000Z",
    deleted_at: null,
    _deleted: false,
    ...overrides,
  };
}

interface MockDoc<T> {
  toJSON: () => T;
  patch: ReturnType<typeof vi.fn>;
  // RxDB returns a self-reference from `patch`; we return undefined to keep the mock tiny.
  _data: T;
}

function makeDocMock<T extends Record<string, unknown>>(data: T): MockDoc<T> {
  return {
    toJSON: () => ({ ...data }),
    patch: vi.fn().mockImplementation(async () => undefined),
    _data: data,
  };
}

interface FakeDatabase {
  events: {
    findOne: (id: string) => { exec: () => Promise<MockDoc<EventDocType> | null> };
  };
  applications: {
    find: (query?: unknown) => { exec: () => Promise<MockDoc<ApplicationDocType>[]> };
    findOne: (id: string) => {
      exec: () => Promise<MockDoc<ApplicationDocType> | null>;
    };
  };
}

function makeDatabase(opts: { event?: EventDocType; applications?: ApplicationDocType[] }): {
  database: FakeDatabase;
  eventDoc: MockDoc<EventDocType>;
  appDocs: MockDoc<ApplicationDocType>[];
} {
  const eventData =
    opts.event ??
    ({
      id: EVENT_ID,
      started_at: "2026-04-27T12:00:00.000Z",
      ended_at: null,
      lat: 52.5,
      lon: 13.4,
      legacy_external_ref: null,
      reveal_participants: false,
      note: "old note",
      created_by: USER.id,
      created_at: "2026-04-27T12:00:00.000Z",
      updated_at: "2026-04-27T12:00:00.000Z",
      deleted_at: null,
      _deleted: false,
    } satisfies EventDocType);
  const appList = opts.applications ?? [makeApplication()];
  const eventDoc = makeDocMock(eventData);
  const appDocs = appList.map((a) => makeDocMock(a));
  const database: FakeDatabase = {
    events: {
      findOne: () => ({ exec: async () => eventDoc }),
    },
    applications: {
      find: () => ({ exec: async () => appDocs }),
      findOne: (id: string) => ({
        exec: async () => appDocs.find((d) => d._data.id === id) ?? null,
      }),
    },
  };
  return { database, eventDoc, appDocs };
}

beforeEach(() => {
  useDatabaseMock.mockReset();
  toastErrorMock.mockReset();
  toastSuccessMock.mockReset();
  routerPushMock.mockReset();
  routerRefreshMock.mockReset();
  routerBackMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("EventEditForm — diff-based patching (M5c.4, ADR-040 §F)", () => {
  it("does not call patch when nothing changed", async () => {
    const { database, eventDoc, appDocs } = makeDatabase({});
    useDatabaseMock.mockReturnValue(database);
    render(<EventEditForm user={USER} initialEvent={makeInitialEvent()} />);

    await screen.findByTestId("event-edit-application-row");
    fireEvent.click(screen.getByRole("button", { name: /Änderungen speichern/ }));

    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalled());
    expect(eventDoc.patch).not.toHaveBeenCalled();
    expect(appDocs[0]!.patch).not.toHaveBeenCalled();
  });

  it("patches only the event when only the event note changed", async () => {
    const { database, eventDoc, appDocs } = makeDatabase({});
    useDatabaseMock.mockReturnValue(database);
    render(<EventEditForm user={USER} initialEvent={makeInitialEvent()} />);

    await screen.findByTestId("event-edit-application-row");
    // The event note is a textarea (id event-edit-note); the
    // application notes are inputs. Anchor by the textarea id to
    // avoid ambiguity.
    fireEvent.change(document.getElementById("event-edit-note")!, {
      target: { value: "fresh note" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Änderungen speichern/ }));

    await waitFor(() => expect(eventDoc.patch).toHaveBeenCalledTimes(1));
    const patch = eventDoc.patch.mock.calls[0]![0];
    expect(patch.note).toBe("fresh note");
    expect("reveal_participants" in patch).toBe(false);
    expect(appDocs[0]!.patch).not.toHaveBeenCalled();
  });

  it("patches the application when its note changes", async () => {
    const { database, eventDoc, appDocs } = makeDatabase({});
    useDatabaseMock.mockReturnValue(database);
    render(<EventEditForm user={USER} initialEvent={makeInitialEvent()} />);

    await screen.findByTestId("event-edit-application-row");
    const noteInput = document.getElementById(`app-edit-${APP_ID}-note`)!;
    fireEvent.change(noteInput, { target: { value: "tightened" } });
    fireEvent.click(screen.getByRole("button", { name: /Änderungen speichern/ }));

    await waitFor(() => expect(appDocs[0]!.patch).toHaveBeenCalledTimes(1));
    expect(appDocs[0]!.patch.mock.calls[0]![0].note).toBe("tightened");
    expect(eventDoc.patch).not.toHaveBeenCalled();
  });

  it("patches restraint_type_ids when the picker reports a new selection (M7.5-FU1)", async () => {
    const { database, eventDoc, appDocs } = makeDatabase({});
    useDatabaseMock.mockReturnValue(database);
    render(<EventEditForm user={USER} initialEvent={makeInitialEvent()} />);

    await screen.findByTestId("event-edit-application-row");
    fireEvent.click(screen.getByTestId("restraint-picker-stub"));
    fireEvent.click(screen.getByRole("button", { name: /Änderungen speichern/ }));

    await waitFor(() => expect(appDocs[0]!.patch).toHaveBeenCalledTimes(1));
    expect(appDocs[0]!.patch.mock.calls[0]![0].restraint_type_ids).toEqual([
      "00000000-0000-0000-0000-0000000000ff",
    ]);
    expect(eventDoc.patch).not.toHaveBeenCalled();
  });

  it("does not patch restraint_type_ids when the set is unchanged (M7.5-FU1)", async () => {
    const initialIds = ["00000000-0000-0000-0000-000000000aaa"];
    const { database, appDocs } = makeDatabase({
      applications: [makeApplication({ restraint_type_ids: initialIds })],
    });
    useDatabaseMock.mockReturnValue(database);
    render(<EventEditForm user={USER} initialEvent={makeInitialEvent()} />);

    await screen.findByTestId("event-edit-application-row");
    // Toggle nothing — RestraintPicker stub does not auto-fire.
    fireEvent.click(screen.getByRole("button", { name: /Änderungen speichern/ }));

    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalled());
    expect(appDocs[0]!.patch).not.toHaveBeenCalled();
  });

  it("prefills the legacy_external_ref input from the initial event (M5c-NACH, ADR-050)", async () => {
    const { database } = makeDatabase({});
    useDatabaseMock.mockReturnValue(database);
    render(
      <EventEditForm
        user={USER}
        initialEvent={makeInitialEvent({ legacy_external_ref: "w3w://demo.alpha.foxtrot" })}
      />,
    );

    await screen.findByTestId("event-edit-application-row");
    const input = screen.getByTestId("event-edit-legacy-ref") as HTMLInputElement;
    expect(input.value).toBe("w3w://demo.alpha.foxtrot");
  });

  it("patches legacy_external_ref when the input changes from null to a value (M5c-NACH, LWW)", async () => {
    const { database, eventDoc, appDocs } = makeDatabase({});
    useDatabaseMock.mockReturnValue(database);
    render(<EventEditForm user={USER} initialEvent={makeInitialEvent()} />);

    await screen.findByTestId("event-edit-application-row");
    fireEvent.change(screen.getByTestId("event-edit-legacy-ref"), {
      target: { value: "  https://example.org/event/42  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /Änderungen speichern/ }));

    await waitFor(() => expect(eventDoc.patch).toHaveBeenCalledTimes(1));
    const patch = eventDoc.patch.mock.calls[0]![0];
    expect(patch.legacy_external_ref).toBe("https://example.org/event/42");
    expect(appDocs[0]!.patch).not.toHaveBeenCalled();
  });

  it("patches legacy_external_ref to null when an existing value is cleared (M5c-NACH)", async () => {
    const { database, eventDoc } = makeDatabase({});
    useDatabaseMock.mockReturnValue(database);
    render(
      <EventEditForm
        user={USER}
        initialEvent={makeInitialEvent({ legacy_external_ref: "w3w://demo.alpha.foxtrot" })}
      />,
    );

    await screen.findByTestId("event-edit-application-row");
    fireEvent.change(screen.getByTestId("event-edit-legacy-ref"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Änderungen speichern/ }));

    await waitFor(() => expect(eventDoc.patch).toHaveBeenCalledTimes(1));
    const patch = eventDoc.patch.mock.calls[0]![0];
    expect(patch.legacy_external_ref).toBeNull();
  });

  it("disables the application ended_at input when it is already set (FWW)", async () => {
    const { database } = makeDatabase({
      applications: [makeApplication({ ended_at: "2026-04-27T12:30:00.000Z" })],
    });
    useDatabaseMock.mockReturnValue(database);
    render(<EventEditForm user={USER} initialEvent={makeInitialEvent()} />);

    await screen.findByTestId("event-edit-application-row");
    const endedAtInput = screen.getByLabelText(/Ende \(FWW, fixiert\)/);
    expect(endedAtInput).toBeDisabled();
  });
});

describe("EventEditForm — soft-delete (ADR-040 §D)", () => {
  it("soft-deletes an application after window.confirm", async () => {
    const { database, appDocs } = makeDatabase({});
    useDatabaseMock.mockReturnValue(database);
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    render(<EventEditForm user={USER} initialEvent={makeInitialEvent()} />);

    await screen.findByTestId("event-edit-application-row");
    fireEvent.click(screen.getByTestId("event-edit-delete-application"));
    await waitFor(() => expect(appDocs[0]!.patch).toHaveBeenCalled());
    expect(appDocs[0]!.patch.mock.calls[0]![0]._deleted).toBe(true);
  });

  it("aborts soft-delete when window.confirm is dismissed", async () => {
    const { database, appDocs } = makeDatabase({});
    useDatabaseMock.mockReturnValue(database);
    vi.stubGlobal(
      "confirm",
      vi.fn(() => false),
    );
    render(<EventEditForm user={USER} initialEvent={makeInitialEvent()} />);

    await screen.findByTestId("event-edit-application-row");
    fireEvent.click(screen.getByTestId("event-edit-delete-application"));
    // No patch call after a brief wait.
    await new Promise((r) => setTimeout(r, 10));
    expect(appDocs[0]!.patch).not.toHaveBeenCalled();
  });

  it("soft-deletes the event and navigates back to the dashboard", async () => {
    const { database, eventDoc } = makeDatabase({});
    useDatabaseMock.mockReturnValue(database);
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    render(<EventEditForm user={USER} initialEvent={makeInitialEvent()} />);

    await screen.findByTestId("event-edit-delete");
    fireEvent.click(screen.getByTestId("event-edit-delete"));
    await waitFor(() => expect(eventDoc.patch).toHaveBeenCalled());
    expect(eventDoc.patch.mock.calls[0]![0]._deleted).toBe(true);
    expect(routerPushMock).toHaveBeenCalledWith("/");
  });
});
