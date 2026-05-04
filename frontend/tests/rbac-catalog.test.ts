/**
 * Pure-function tests for the M7.2 catalog RBAC helpers (ADR-042 §G).
 *
 * Mirrors backend RLS shape: admin-only PATCH/approve/reject; editor-
 * own-pending withdraw; viewer never. The frontend gate is a UX hint —
 * backend RLS is final, but keeping the helper consistent avoids
 * surprising 403s.
 */

import { describe, expect, it } from "vitest";

import {
  canApproveCatalog,
  canEditCatalogEntry,
  canViewCatalogAdmin,
  canWithdrawCatalogEntry,
  type RbacCatalogEntry,
  type RbacUser,
} from "@/lib/rbac";

const ADMIN: RbacUser = { id: "u-admin", role: "admin" };
const EDITOR_A: RbacUser = { id: "u-editor-a", role: "editor" };
const EDITOR_B: RbacUser = { id: "u-editor-b", role: "editor" };
const VIEWER: RbacUser = { id: "u-viewer", role: "viewer" };

const OWN_PENDING: RbacCatalogEntry = {
  status: "pending",
  suggested_by: "u-editor-a",
};
const FOREIGN_PENDING: RbacCatalogEntry = {
  status: "pending",
  suggested_by: "u-editor-b",
};
const OWN_REJECTED: RbacCatalogEntry = {
  status: "rejected",
  suggested_by: "u-editor-a",
};
const APPROVED: RbacCatalogEntry = {
  status: "approved",
  suggested_by: null,
};

describe("canViewCatalogAdmin", () => {
  it("admin and editor can enter the catalog UI", () => {
    expect(canViewCatalogAdmin(ADMIN)).toBe(true);
    expect(canViewCatalogAdmin(EDITOR_A)).toBe(true);
  });
  it("viewer cannot", () => {
    expect(canViewCatalogAdmin(VIEWER)).toBe(false);
  });
});

describe("canApproveCatalog / canEditCatalogEntry", () => {
  it("admin only", () => {
    expect(canApproveCatalog(ADMIN)).toBe(true);
    expect(canEditCatalogEntry(ADMIN)).toBe(true);
    for (const u of [EDITOR_A, VIEWER]) {
      expect(canApproveCatalog(u)).toBe(false);
      expect(canEditCatalogEntry(u)).toBe(false);
    }
  });
});

describe("canWithdrawCatalogEntry", () => {
  it("admin: any pending row", () => {
    expect(canWithdrawCatalogEntry(ADMIN, OWN_PENDING)).toBe(true);
    expect(canWithdrawCatalogEntry(ADMIN, FOREIGN_PENDING)).toBe(true);
  });
  it("admin: rejects non-pending (matches backend status guard)", () => {
    expect(canWithdrawCatalogEntry(ADMIN, APPROVED)).toBe(false);
    expect(canWithdrawCatalogEntry(ADMIN, OWN_REJECTED)).toBe(false);
  });
  it("editor: only own pending", () => {
    expect(canWithdrawCatalogEntry(EDITOR_A, OWN_PENDING)).toBe(true);
    expect(canWithdrawCatalogEntry(EDITOR_B, OWN_PENDING)).toBe(false);
    expect(canWithdrawCatalogEntry(EDITOR_A, OWN_REJECTED)).toBe(false);
  });
  it("viewer: never", () => {
    expect(canWithdrawCatalogEntry(VIEWER, OWN_PENDING)).toBe(false);
  });
});
