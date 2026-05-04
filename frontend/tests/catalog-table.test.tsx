/**
 * Component test for `CatalogTable` (M7.2 + M7.4).
 *
 * Covers loading + empty hint + RestraintType rendering (with
 * brand/model/mechanical_type subtitle) and the reject-reason callout
 * for rejected rows. The action column is opt-in via the
 * `renderRowActions` render-prop introduced in M7.4.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CatalogTable } from "@/components/catalog/catalog-table";
import type { RestraintTypeEntry } from "@/lib/catalog/types";

const RT_APPROVED: RestraintTypeEntry = {
  id: "rt-1",
  category: "handcuffs",
  brand: "ASP",
  model: "Chain",
  mechanical_type: "chain",
  display_name: "ASP Chain Cuffs",
  status: "approved",
  suggested_by: null,
  approved_by: "u-admin",
  rejected_by: null,
  rejected_at: null,
  reject_reason: null,
  note: null,
  created_at: "2026-04-25T10:00:00Z",
  updated_at: null,
};

const RT_REJECTED: RestraintTypeEntry = {
  id: "rt-2",
  category: "rope",
  brand: null,
  model: null,
  mechanical_type: null,
  display_name: "Hanfseil 8mm",
  status: "rejected",
  suggested_by: "u-editor",
  approved_by: null,
  rejected_by: "u-admin",
  rejected_at: "2026-04-28T11:00:00Z",
  reject_reason: "Duplikat von 'Hanfseil-Standard'",
  note: null,
  created_at: "2026-04-26T08:00:00Z",
  updated_at: "2026-04-28T11:00:00Z",
};

describe("CatalogTable", () => {
  it("renders a loading state while isLoading", () => {
    render(<CatalogTable entries={[]} kind="restraint-types" isLoading emptyHint="leer" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows the empty hint when not loading and no entries", () => {
    render(
      <CatalogTable
        entries={[]}
        kind="restraint-types"
        isLoading={false}
        emptyHint="Keine Treffer"
      />,
    );
    expect(screen.getByText("Keine Treffer")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders a RestraintType with subtitle assembled from category/brand/model/mechanical_type", () => {
    render(
      <CatalogTable
        entries={[RT_APPROVED]}
        kind="restraint-types"
        isLoading={false}
        emptyHint="leer"
      />,
    );
    expect(screen.getByText("ASP Chain Cuffs")).toBeInTheDocument();
    expect(screen.getByText("Handschellen · ASP · Chain · Chain")).toBeInTheDocument();
    expect(screen.getByText("Freigegeben")).toBeInTheDocument();
  });

  it("shows reject_reason for rejected entries", () => {
    render(
      <CatalogTable
        entries={[RT_REJECTED]}
        kind="restraint-types"
        isLoading={false}
        emptyHint="leer"
      />,
    );
    expect(screen.getByText("Hanfseil 8mm")).toBeInTheDocument();
    expect(screen.getByText("Abgelehnt")).toBeInTheDocument();
    expect(screen.getByText("Begründung: Duplikat von 'Hanfseil-Standard'")).toBeInTheDocument();
  });

  it("renders renderRowActions output per row when provided", () => {
    render(
      <CatalogTable
        entries={[RT_APPROVED]}
        kind="restraint-types"
        isLoading={false}
        emptyHint="leer"
        renderRowActions={(entry) => (
          <a href={`/admin/catalogs/restraint-types/${entry.id}/edit`}>Bearbeiten</a>
        )}
      />,
    );
    const link = screen.getByRole("link", { name: "Bearbeiten" });
    expect(link).toHaveAttribute("href", "/admin/catalogs/restraint-types/rt-1/edit");
  });

  it("hides the action column when renderRowActions is omitted", () => {
    render(
      <CatalogTable
        entries={[RT_APPROVED]}
        kind="restraint-types"
        isLoading={false}
        emptyHint="leer"
      />,
    );
    expect(screen.queryByRole("link", { name: "Bearbeiten" })).toBeNull();
  });

  it("emits one row per entry with status data-attribute", () => {
    render(
      <CatalogTable
        entries={[RT_APPROVED, RT_REJECTED]}
        kind="restraint-types"
        isLoading={false}
        emptyHint="leer"
      />,
    );
    const rows = screen.getAllByTestId("catalog-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute("data-status", "approved");
    expect(rows[1]).toHaveAttribute("data-status", "rejected");
  });
});
