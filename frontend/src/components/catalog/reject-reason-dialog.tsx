"use client";

import { useEffect, useState, type FormEvent } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const REASON_MAX_LENGTH = 500;

export interface RejectReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Display label of the entry being rejected, shown in the title. */
  entryLabel: string;
  /** Submit handler — receives the trimmed reason. */
  onSubmit: (reason: string) => void;
  isPending?: boolean;
}

/**
 * Reject-confirmation modal for catalog entries (M7.4 / ADR-043 §A).
 *
 * The reason is mandatory: an empty submit is short-circuited
 * client-side with an inline error. Backend also enforces it via
 * `CatalogReject` (Pydantic min_length=1) — this dialog is the UX
 * mirror, not a substitute.
 */
export function RejectReasonDialog({
  open,
  onOpenChange,
  entryLabel,
  onSubmit,
  isPending = false,
}: RejectReasonDialogProps) {
  const [reason, setReason] = useState("");
  // Inline error only after the user actually attempted to submit —
  // an onBlur-driven `touched` would fire under Radix' focus-management
  // (programmatic focus shift on open triggers blur on the autofocused
  // textarea), so we'd flash the error on first open. Submit-only is
  // both correct and quieter UX.
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  useEffect(() => {
    if (!open) {
      setReason("");
      setAttemptedSubmit(false);
    }
  }, [open]);

  const trimmed = reason.trim();
  const isInvalid = attemptedSubmit && trimmed.length === 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttemptedSubmit(true);
    if (trimmed.length === 0) return;
    onSubmit(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vorschlag ablehnen</DialogTitle>
          <DialogDescription>
            {`„${entryLabel}" wird mit Begründung abgelehnt — der vorschlagende Editor sieht den Eintrag weiterhin mit dieser Begründung.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reject-reason">Begründung *</Label>
            <textarea
              id="reject-reason"
              name="reason"
              required
              autoFocus
              rows={4}
              maxLength={REASON_MAX_LENGTH}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-invalid={isInvalid || undefined}
              aria-describedby={isInvalid ? "reject-reason-error" : undefined}
              className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
            />
            {isInvalid ? (
              <p
                id="reject-reason-error"
                role="alert"
                className="text-xs text-rose-700 dark:text-rose-300"
              >
                Begründung darf nicht leer sein.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Abbrechen
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? "Lehne ab …" : "Ablehnen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
