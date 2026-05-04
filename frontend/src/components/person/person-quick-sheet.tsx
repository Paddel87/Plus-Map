"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ApiError, apiFetch } from "@/lib/api";
import type { PersonRead } from "@/lib/types";

const schema = z.object({
  name: z.string().min(1, "Name ist Pflicht.").max(200, "Maximal 200 Zeichen."),
  alias: z.string().max(200, "Maximal 200 Zeichen.").optional(),
});

type Values = z.infer<typeof schema>;

export interface PersonQuickSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (person: PersonRead) => void;
}

export function PersonQuickSheet({ open, onOpenChange, onCreated }: PersonQuickSheetProps) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", alias: "" },
  });

  useEffect(() => {
    if (!open) form.reset({ name: "", alias: "" });
  }, [open, form]);

  const create = useMutation({
    mutationFn: async (values: Values): Promise<PersonRead> => {
      const body: { name: string; alias?: string } = { name: values.name.trim() };
      const trimmedAlias = values.alias?.trim();
      if (trimmedAlias) body.alias = trimmedAlias;
      return apiFetch<PersonRead>("/api/persons/quick", {
        method: "POST",
        body,
      });
    },
    onSuccess: (person) => {
      toast.success("Person angelegt", {
        description: `${person.name} ist jetzt auswählbar.`,
      });
      onCreated(person);
      onOpenChange(false);
    },
    onError: (error) => {
      const description =
        error instanceof ApiError && error.status === 403
          ? "Nur Admins und Editoren dürfen Personen anlegen."
          : error instanceof Error
            ? error.message
            : String(error);
      toast.error("Person konnte nicht angelegt werden", { description });
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Neue Person hinzufügen</SheetTitle>
          <SheetDescription>
            On-the-fly-Anlage für die Live-Erfassung. Kann später vom Admin nachgepflegt werden.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => create.mutate(values))}
            className="mt-4 flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input autoFocus placeholder="Vorname oder voller Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="alias"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alias (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Spitzname, Szene-Name…" {...field} />
                  </FormControl>
                  <FormDescription>Wird in Personen-Listen zusätzlich angezeigt.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={create.isPending}
              >
                Abbrechen
              </Button>
              <Button type="submit" className="flex-1" disabled={create.isPending}>
                {create.isPending ? "Speichere…" : "Speichern"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
