import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { ExportButtons } from "@/components/profile/export-buttons";

describe("ExportButtons", () => {
  test("renders three export links for editor and viewer roles", () => {
    render(<ExportButtons role="editor" />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual([
      "/api/export/me",
      "/api/export/me/events.csv",
      "/api/export/me/applications.csv",
    ]);
    for (const link of links) {
      expect(link).toHaveAttribute("download");
    }
  });

  test("includes admin export only when role is admin", () => {
    render(<ExportButtons role="admin" />);
    expect(screen.getByRole("link", { name: /Alle Daten \(Admin\) als JSON/i })).toHaveAttribute(
      "href",
      "/api/admin/export/all",
    );
  });

  test("hides admin export for non-admin", () => {
    render(<ExportButtons role="viewer" />);
    expect(screen.queryByText(/Admin/i)).not.toBeInTheDocument();
  });
});
