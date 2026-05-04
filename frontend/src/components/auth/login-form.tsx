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
import { useLogin } from "@/lib/auth";

const schema = z.object({
  email: z.string().email("Bitte eine gültige E-Mail-Adresse eingeben."),
  password: z.string().min(1, "Passwort darf nicht leer sein."),
});

type LoginValues = z.infer<typeof schema>;

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? null;
  const error = searchParams.get("error");
  const login = useLogin();
  const form = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: LoginValues) {
    login.mutate(values, {
      onError: (error) => {
        if (error instanceof ApiError && error.status === 400) {
          toast.error("Login fehlgeschlagen", {
            description: "E-Mail oder Passwort ungültig.",
          });
        } else {
          toast.error("Login fehlgeschlagen", {
            description: error instanceof Error ? error.message : String(error),
          });
        }
      },
      onSuccess: () => {
        const target = next && next.startsWith("/") ? next : "/";
        window.location.assign(target);
      },
    });
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Anmelden</CardTitle>
        <CardDescription>HC-Map — Pfad A, geschlossener Nutzerkreis.</CardDescription>
        {error === "pin" ? (
          <p className="pt-2 text-sm text-amber-700 dark:text-amber-400" role="alert">
            Sitzung wurde nach 5 falschen PIN-Eingaben beendet. Bitte erneut anmelden.
          </p>
        ) : null}
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-Mail</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="username"
                      autoFocus
                      placeholder="name@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Passwort</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? "Anmelden…" : "Anmelden"}
            </Button>
            <Link href="/forgot-password" className="text-sm underline">
              Passwort vergessen?
            </Link>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
