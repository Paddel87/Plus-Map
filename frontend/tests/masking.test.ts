/**
 * `maskParticipants` (M5c.2, ADR-038 §C) — must mirror the backend
 * `app/services/masking.py` rule exactly.
 */

import { describe, expect, it } from "vitest";

import { MASK_PLACEHOLDER, isMasked, maskParticipants } from "@/lib/masking";
import type { PersonRead } from "@/lib/types";

const NOW = new Date("2026-04-27T12:00:00Z").toISOString();

function makePerson(id: string, name: string, overrides: Partial<PersonRead> = {}): PersonRead {
  return {
    id,
    name,
    alias: null,
    note: null,
    origin: "managed",
    linkable: false,
    is_deleted: false,
    deleted_at: null,
    created_at: NOW,
    ...overrides,
  };
}

const ALICE_ID = "00000000-0000-0000-0000-0000000000a1";
const BOB_ID = "00000000-0000-0000-0000-0000000000b2";
const CAROL_ID = "00000000-0000-0000-0000-0000000000c3";

describe("maskParticipants", () => {
  it("returns participants unchanged when reveal_participants is true", () => {
    const participants = [makePerson(ALICE_ID, "Alice"), makePerson(BOB_ID, "Bob")];
    const out = maskParticipants(participants, { reveal_participants: true }, BOB_ID);
    expect(out).toEqual(participants);
  });

  it("keeps the requester's own row unmasked", () => {
    const participants = [
      makePerson(ALICE_ID, "Alice", { alias: "ali" }),
      makePerson(BOB_ID, "Bob", { alias: "bobby" }),
    ];
    const out = maskParticipants(participants, { reveal_participants: false }, BOB_ID);
    const bob = out.find((p) => p.id === BOB_ID)!;
    expect(bob.name).toBe("Bob");
    expect(bob.alias).toBe("bobby");
  });

  it("masks everyone else with placeholder + nulls alias/note", () => {
    const participants = [
      makePerson(ALICE_ID, "Alice", { alias: "ali", note: "some note" }),
      makePerson(BOB_ID, "Bob"),
      makePerson(CAROL_ID, "Carol", { alias: "ccc" }),
    ];
    const out = maskParticipants(participants, { reveal_participants: false }, BOB_ID);
    const alice = out.find((p) => p.id === ALICE_ID)!;
    const carol = out.find((p) => p.id === CAROL_ID)!;
    expect(alice.name).toBe(MASK_PLACEHOLDER);
    expect(alice.alias).toBeNull();
    expect(alice.note).toBeNull();
    expect(carol.name).toBe(MASK_PLACEHOLDER);
    expect(carol.alias).toBeNull();
  });

  it("preserves the input order and length", () => {
    const participants = [
      makePerson(ALICE_ID, "Alice"),
      makePerson(BOB_ID, "Bob"),
      makePerson(CAROL_ID, "Carol"),
    ];
    const out = maskParticipants(participants, { reveal_participants: false }, BOB_ID);
    expect(out).toHaveLength(3);
    expect(out.map((p) => p.id)).toEqual([ALICE_ID, BOB_ID, CAROL_ID]);
  });

  it("handles an empty list without crashing", () => {
    expect(maskParticipants([], { reveal_participants: false }, BOB_ID)).toEqual([]);
    expect(maskParticipants([], { reveal_participants: true }, BOB_ID)).toEqual([]);
  });
});

describe("isMasked", () => {
  it("returns true only for the placeholder name", () => {
    expect(isMasked(makePerson(ALICE_ID, MASK_PLACEHOLDER))).toBe(true);
    expect(isMasked(makePerson(ALICE_ID, "Alice"))).toBe(false);
  });
});
