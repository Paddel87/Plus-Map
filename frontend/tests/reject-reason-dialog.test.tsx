/**
 * Test for `RejectReasonDialog` (M7.4 / ADR-043 §A).
 *
 * Verifies the modal is open/close-controlled, requires a non-empty
 * trimmed reason before invoking onSubmit, and resets internal state
 * when the parent closes it.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RejectReasonDialog } from "@/components/catalog/reject-reason-dialog";

function setup(overrides: Partial<React.ComponentProps<typeof RejectReasonDialog>> = {}) {
  const onOpenChange = vi.fn();
  const onSubmit = vi.fn();
  const props = {
    open: true,
    onOpenChange,
    entryLabel: "ASP Chain Cuffs",
    onSubmit,
    ...overrides,
  };
  const utils = render(<RejectReasonDialog {...props} />);
  return { ...utils, onOpenChange, onSubmit };
}

describe("RejectReasonDialog", () => {
  it("renders title with the entry label and a reason textarea", () => {
    setup();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Vorschlag ablehnen")).toBeInTheDocument();
    expect(screen.getByText(/„ASP Chain Cuffs" wird mit Begründung/)).toBeInTheDocument();
    expect(screen.getByLabelText("Begründung *")).toBeInTheDocument();
  });

  it("does not show inline error on first open (no submit attempted yet)", () => {
    // Regression guard: previously the textarea's onBlur set `touched`
    // to true, which combined with Radix' focus-management produced an
    // immediate error flash on open. Submit-only validation removes
    // that path. Verified manually in the M7.4 browser-E2E pass.
    setup();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByLabelText("Begründung *")).not.toHaveAttribute("aria-invalid");
  });

  it("blocks submit when reason is empty (whitespace only) and shows inline error", () => {
    const { onSubmit } = setup();
    fireEvent.change(screen.getByLabelText("Begründung *"), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ablehnen" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/nicht leer/i);
  });

  it("submits the trimmed reason", () => {
    const { onSubmit } = setup();
    fireEvent.change(screen.getByLabelText("Begründung *"), {
      target: { value: "  Duplikat von 'Strappado-A'  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ablehnen" }));
    expect(onSubmit).toHaveBeenCalledWith("Duplikat von 'Strappado-A'");
  });

  it("Cancel calls onOpenChange(false)", () => {
    const { onOpenChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables both buttons while isPending", () => {
    setup({ isPending: true });
    expect(screen.getByRole("button", { name: "Lehne ab …" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Abbrechen" })).toBeDisabled();
  });

  it("resets the reason input when the parent closes the dialog", () => {
    const { rerender } = setup();
    fireEvent.change(screen.getByLabelText("Begründung *"), {
      target: { value: "alter Grund" },
    });
    rerender(
      <RejectReasonDialog
        open={false}
        onOpenChange={vi.fn()}
        entryLabel="ASP Chain Cuffs"
        onSubmit={vi.fn()}
      />,
    );
    rerender(
      <RejectReasonDialog
        open
        onOpenChange={vi.fn()}
        entryLabel="ASP Chain Cuffs"
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Begründung *")).toHaveValue("");
  });
});
