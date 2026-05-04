"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { useChangePassword } from "@/lib/auth";

const schema = z
  .object({
    password: z.string().min(12, "Das Passwort muss mindestens 12 Zeichen lang sein."),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    path: ["confirm"],
    message: "Die Passwörter stimmen nicht überein.",
  });

type ChangePasswordValues = z.infer<typeof schema>;

export function PasswordForm() {
  const change = useChangePassword();
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  function onSubmit(values: ChangePasswordValues) {
    change.mutate(values.password, {
      onSuccess: () => {
        toast.success("Passwort geändert", {
          description: "Beim nächsten Login wird das neue Passwort verlangt.",
        });
        form.reset();
      },
      onError: (error) => {
        if (error instanceof ApiError && error.status === 422) {
          toast.error("Passwort abgelehnt", {
            description: "Mindestlänge 12 Zeichen.",
          });
        } else if (error instanceof ApiError && error.status === 401) {
          toast.error("Sitzung abgelaufen", {
            description: "Bitte erneut anmelden.",
          });
        } else {
          toast.error("Passwort konnte nicht geändert werden", {
            description: error instanceof Error ? error.message : String(error),
          });
        }
      },
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Neues Passwort</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Passwort bestätigen</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
          <Button type="submit" disabled={change.isPending}>
            {change.isPending ? "Speichere…" : "Passwort ändern"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
