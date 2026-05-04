"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useResetPassword } from "@/lib/auth";

const schema = z
  .object({
    password: z.string().min(12, "Das Passwort muss mindestens 12 Zeichen lang sein."),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    path: ["confirm"],
    message: "Die Passwörter stimmen nicht überein.",
  });

type ResetValues = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const reset = useResetPassword();
  const form = useForm<ResetValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  if (!token) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Ungültiger Link</CardTitle>
          <CardDescription>
            Der Reset-Link enthält keinen Token. Fordere einen neuen Link an.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/forgot-password" className="text-sm underline">
            Neuen Link anfordern
          </Link>
        </CardContent>
      </Card>
    );
  }

  function onSubmit(values: ResetValues) {
    if (!token) return;
    reset.mutate(
      { token, password: values.password },
      {
        onSuccess: () => {
          toast.success("Passwort gesetzt", {
            description: "Du kannst dich jetzt mit dem neuen Passwort anmelden.",
          });
          window.location.assign("/login");
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 400) {
            toast.error("Reset fehlgeschlagen", {
              description: "Der Link ist ungültig oder bereits abgelaufen.",
            });
          } else {
            toast.error("Reset fehlgeschlagen", {
              description: error instanceof Error ? error.message : String(error),
            });
          }
        },
      },
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Neues Passwort</CardTitle>
        <CardDescription>Wähle ein neues Passwort für deinen HC-Map-Account.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Neues Passwort</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" autoFocus {...field} />
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
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={reset.isPending}>
              {reset.isPending ? "Speichere…" : "Passwort speichern"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
