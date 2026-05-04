"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { RestraintPicker } from "@/components/catalog/restraint-picker";
import { RecipientPicker } from "@/components/person/recipient-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { UserRole } from "@/lib/auth";
import type { HCMapDatabase } from "@/lib/rxdb/database";
import { useDatabase } from "@/lib/rxdb/provider";
import type { PersonRead } from "@/lib/types";

async function nextLocalSequence(database: HCMapDatabase, eventId: string): Promise<number> {
  const docs = await database.applications.find({ selector: { event_id: eventId } }).exec();
  if (docs.length === 0) return 1;
  const max = docs.reduce((acc, doc) => Math.max(acc, doc.sequence_no), 0);
  return max + 1;
}

export interface ApplicationStartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  performerPersonId: string;
  /** Drives the Quick-Propose copy in the embedded RestraintPicker. */
  currentUserRole: UserRole;
  defaultRecipient: PersonRead | null;
  onCreated: () => void;
}

export function ApplicationStartSheet({
  open,
  onOpenChange,
  eventId,
  performerPersonId,
  currentUserRole,
  defaultRecipient,
  onCreated,
}: ApplicationStartSheetProps) {
  const database = useDatabase();
  const [recipient, setRecipient] = useState<PersonRead | null>(defaultRecipient);
  const [note, setNote] = useState("");
  const [restraintTypeIds, setRestraintTypeIds] = useState<string[]>([]);
  const [armPositionId, setArmPositionId] = useState<string | null>(null);
  const [handPositionId, setHandPositionId] = useState<string | null>(null);
  const [handOrientationId, setHandOrientationId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setRecipient(defaultRecipient);
      setNote("");
      setRestraintTypeIds([]);
      setArmPositionId(null);
      setHandPositionId(null);
      setHandOrientationId(null);
    }
  }, [open, defaultRecipient]);

  async function submit() {
    if (!database) {
      toast.error("Lokale Datenbank wird noch geladen", {
        description: "Einen Moment, dann nochmal probieren.",
      });
      return;
    }
    setPending(true);
    try {
      // Server reassigns sequence_no on push (ADR-029); the local
      // optimistic value is just a UI placeholder.
      const localSeq = await nextLocalSequence(database, eventId);
      const recipientId = recipient?.id ?? performerPersonId;
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await database.applications.insert({
        id,
        event_id: eventId,
        performer_id: performerPersonId,
        recipient_id: recipientId,
        arm_position_id: armPositionId,
        hand_position_id: handPositionId,
        hand_orientation_id: handOrientationId,
        sequence_no: localSeq,
        started_at: now,
        ended_at: null,
        note: note.trim() || null,
        created_by: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        _deleted: false,
        restraint_type_ids: restraintTypeIds,
      });
      toast.success("Stopp gestartet", {
        description: `Sequenz #${localSeq} (lokal). Sync setzt die endgültige Nummer.`,
      });
      onCreated();
      onOpenChange(false);
    } catch (error) {
      toast.error("Stopp konnte nicht gestartet werden", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Neuen Stopp starten</SheetTitle>
          <SheetDescription>
            Erfasser = du. Begleitung ohne Auswahl = solo unterwegs. Ausrüstung ist optional.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Begleitung</Label>
            <RecipientPicker
              value={recipient}
              onChange={setRecipient}
              excludePersonIds={[performerPersonId]}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Ausrüstung (optional)</Label>
            <RestraintPicker
              value={restraintTypeIds}
              onChange={setRestraintTypeIds}
              isAdmin={currentUserRole === "admin"}
            />
          </div>
          {/* Position-Picker im Plus-Map-UI ausgeblendet — Detail-Felder
              werden in dieser Variante nicht gepflegt. State-Variablen
              bleiben, defaulten zu null beim Insert. */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="application-note">Notiz (optional)</Label>
            <textarea
              id="application-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="z. B. Stimmung, Aufbau, Materialwechsel danach…"
              rows={3}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:focus-visible:ring-slate-300"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={submit}
              disabled={pending || !database}
            >
              {pending ? "Starte…" : "Stopp starten"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
