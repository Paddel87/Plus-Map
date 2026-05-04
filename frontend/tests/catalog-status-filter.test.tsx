/**
 * Component test for `StatusFilter` (M7.2).
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StatusFilter } from "@/components/catalog/status-filter";

describe("StatusFilter", () => {
  it("renders four radio options with the active one marked", () => {
    render(<StatusFilter value="pending" onChange={() => {}} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(4);
    const active = radios.find((r) => r.getAttribute("aria-checked") === "true");
    expect(active?.textContent).toBe("Vorgeschlagen");
  });

  it("invokes onChange with the next value when clicked", () => {
    const onChange = vi.fn();
    render(<StatusFilter value="all" onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Abgelehnt" }));
    expect(onChange).toHaveBeenCalledWith("rejected");
  });

  it("supports clicking back to 'Alle'", () => {
    const onChange = vi.fn();
    render(<StatusFilter value="rejected" onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Alle" }));
    expect(onChange).toHaveBeenCalledWith("all");
  });
});
