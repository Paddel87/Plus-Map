"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { describeMutationError } from "@/components/catalog/mutation-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCreateCatalogEntry,
  useUpdateCatalogEntry,
  type RestraintTypeCreatePayload,
} from "@/lib/catalog/api";
import {
  MECHANICAL_TYPE_LABELS,
  RESTRAINT_CATEGORY_LABELS,
  type RestraintCategory,
  type RestraintMechanicalType,
  type RestraintTypeEntry,
} from "@/lib/catalog/types";

const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:focus-visible:ring-slate-300";

export type RestraintTypeFormMode =
  | { type: "create" }
  | { type: "edit"; entry: RestraintTypeEntry };

export function RestraintTypeForm({
  mode,
  isAdmin,
}: {
  mode: RestraintTypeFormMode;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const initial = mode.type === "edit" ? mode.entry : null;
  const [category, setCategory] = useState<RestraintCategory>(initial?.category ?? "rope");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [mechanicalType, setMechanicalType] = useState<RestraintMechanicalType | "">(
    initial?.mechanical_type ?? "",
  );
  const [displayName, setDisplayName] = useState(initial?.display_name ?? "");
  const [note, setNote] = useState(initial?.note ?? "");

  const create = useCreateCatalogEntry("restraint-types");
  const update = useUpdateCatalogEntry("restraint-types");
  const pending = create.isPending || update.isPending;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedDisplayName = displayName.trim();
    if (trimmedDisplayName.length === 0) {
      toast.error("Display-Name darf nicht leer sein");
      return;
    }
    const body: RestraintTypeCreatePayload = {
      category,
      brand: brand.trim() === "" ? null : brand.trim(),
      model: model.trim() === "" ? null : model.trim(),
      mechanical_type: mechanicalType === "" ? null : mechanicalType,
      display_name: trimmedDisplayName,
      note: note.trim() === "" ? null : note.trim(),
    };
    try {
      if (mode.type === "create") {
        await create.mutateAsync(body);
        toast.success(isAdmin ? "Equipment-Typ freigegeben" : "Vorschlag eingereicht");
      } else {
        await update.mutateAsync({ id: mode.entry.id, body });
        toast.success("Eintrag aktualisiert");
      }
      router.push(`/admin/catalogs/restraint-types`);
      router.refresh();
    } catch (err) {
      describeMutationError(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rt-display-name">Display-Name *</Label>
        <Input
          id="rt-display-name"
          name="display_name"
          required
          maxLength={300}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rt-category">Kategorie *</Label>
          <select
            id="rt-category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as RestraintCategory)}
            className={SELECT_CLASS}
          >
            {Object.entries(RESTRAINT_CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rt-mechanical">Bauart</Label>
          <select
            id="rt-mechanical"
            name="mechanical_type"
            value={mechanicalType}
            onChange={(e) => setMechanicalType(e.target.value as RestraintMechanicalType | "")}
            className={SELECT_CLASS}
          >
            <option value="">— keine —</option>
            {Object.entries(MECHANICAL_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rt-brand">Marke</Label>
          <Input
            id="rt-brand"
            name="brand"
            maxLength={120}
            value={brand ?? ""}
            onChange={(e) => setBrand(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rt-model">Modell</Label>
          <Input
            id="rt-model"
            name="model"
            maxLength={200}
            value={model ?? ""}
            onChange={(e) => setModel(e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rt-note">Notiz</Label>
        <textarea
          id="rt-note"
          name="note"
          rows={3}
          value={note ?? ""}
          onChange={(e) => setNote(e.target.value)}
          className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Speichere …"
            : mode.type === "create"
              ? isAdmin
                ? "Freigeben & speichern"
                : "Vorschlag einreichen"
              : "Änderungen speichern"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(`/admin/catalogs/restraint-types`)}
        >
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
