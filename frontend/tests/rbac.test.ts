/**
 * Coverage for `canEditEvent` (M5c.4, ADR-040 §B).
 *
 * The helper feeds both the EventDetailView's edit-button render and
 * the server-side redirect on the edit page. Tests pin the matrix
 * (admin / editor own / editor foreign / viewer / null-creator).
 */

import { describe, expect, it } from "vitest";

import { canEditEvent } from "@/lib/rbac";

const ADMIN = { id: "admin-1", role: "admin" as const };
const EDITOR = { id: "editor-1", role: "editor" as const };
const VIEWER = { id: "viewer-1", role: "viewer" as const };

const ownEvent = { created_by: "editor-1" };
const foreignEvent = { created_by: "someone-else" };
const orphanEvent = { created_by: null };

describe("canEditEvent", () => {
  it("admin sees all events", () => {
    expect(canEditEvent(ADMIN, ownEvent)).toBe(true);
    expect(canEditEvent(ADMIN, foreignEvent)).toBe(true);
    expect(canEditEvent(ADMIN, orphanEvent)).toBe(true);
  });

  it("editor sees only own events", () => {
    expect(canEditEvent(EDITOR, ownEvent)).toBe(true);
    expect(canEditEvent(EDITOR, foreignEvent)).toBe(false);
  });

  it("editor cannot edit orphan events (created_by null)", () => {
    expect(canEditEvent(EDITOR, orphanEvent)).toBe(false);
  });

  it("viewer never has edit permission", () => {
    expect(canEditEvent(VIEWER, ownEvent)).toBe(false);
    expect(canEditEvent(VIEWER, foreignEvent)).toBe(false);
    expect(canEditEvent(VIEWER, orphanEvent)).toBe(false);
  });
});
