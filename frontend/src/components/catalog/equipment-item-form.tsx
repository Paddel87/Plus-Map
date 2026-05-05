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
  type EquipmentItemCreatePayload,
} from "@/lib/catalog/api";
import {
  EQUIPMENT_CATEGORY_LABELS,
  type EquipmentCategory,
  type EquipmentItemEntry,
} from "@/lib/catalog/types";

const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:focus-visible:ring-slate-300";

export type EquipmentItemFormMode =
  | { type: "create" }
  | { type: "edit"; entry: EquipmentItemEntry };

export function EquipmentItemForm({
  mode,
  isAdmin,
}: {
  mode: EquipmentItemFormMode;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const initial = mode.type === "edit" ? mode.entry : null;
  const [category, setCategory] = useState<EquipmentCategory>(initial?.category ?? "tools");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [displayName, setDisplayName] = useState(initial?.display_name ?? "");
  const [note, setNote] = useState(initial?.note ?? "");

  const create = useCreateCatalogEntry("equipment-items");
  const update = useUpdateCatalogEntry("equipment-items");
  const pending = create.isPending || update.isPending;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedDisplayName = displayName.trim();
    if (trimmedDisplayName.length === 0) {
      toast.error("Display-Name darf nicht leer sein");
      return;
    }
    const body: EquipmentItemCreatePayload = {
      category,
      brand: brand.trim() === "" ? null : brand.trim(),
      model: model.trim() === "" ? null : model.trim(),
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
      router.push(`/admin/catalogs/equipment-items`);
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
            onChange={(e) => setCategory(e.target.value as EquipmentCategory)}
            className={SELECT_CLASS}
          >
            {Object.entries(EQUIPMENT_CATEGORY_LABELS).map(([key, label]) => (
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
          onClick={() => router.push(`/admin/catalogs/equipment-items`)}
        >
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
