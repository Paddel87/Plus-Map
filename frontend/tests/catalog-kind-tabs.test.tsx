/**
 * Component test for `KindTabs` (M7.2).
 *
 * Verifies all four catalog kinds render as links with the expected
 * `href` and that the active one is marked with `aria-current="page"`.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { KindTabs } from "@/components/catalog/kind-tabs";

describe("KindTabs", () => {
  it("renders all four kinds as links", () => {
    render(<KindTabs active="restraint-types" />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toEqual([
      "/admin/catalogs/restraint-types",
      "/admin/catalogs/arm-positions",
      "/admin/catalogs/hand-positions",
      "/admin/catalogs/hand-orientations",
    ]);
  });

  it("marks the active kind with aria-current", () => {
    render(<KindTabs active="hand-positions" />);
    const active = screen.getByRole("link", { current: "page" });
    expect(active).toHaveAttribute("href", "/admin/catalogs/hand-positions");
  });
});
