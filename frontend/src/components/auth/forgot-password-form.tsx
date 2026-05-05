"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
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
import { useForgotPassword } from "@/lib/auth";

const schema = z.object({
  email: z.string().email("Bitte eine gültige E-Mail-Adresse eingeben."),
});

type ForgotValues = z.infer<typeof schema>;

const NEUTRAL_MESSAGE =
  "Falls für die angegebene E-Mail-Adresse ein Konto existiert, wurde ein Link zum Zurücksetzen versendet.";

export function ForgotPasswordForm() {
  const forgot = useForgotPassword();
  const [submitted, setSubmitted] = useState(false);
  const form = useForm<ForgotValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: ForgotValues) {
    forgot.mutate(values.email, {
      onSuccess: () => {
        setSubmitted(true);
        toast.success("Anfrage gesendet", { description: NEUTRAL_MESSAGE });
      },
      onError: () => {
        // Preserve no-enumeration semantics on the client too: even on
        // network/server errors we show the same neutral confirmation.
        setSubmitted(true);
        toast.success("Anfrage gesendet", { description: NEUTRAL_MESSAGE });
      },
    });
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Passwort vergessen?</CardTitle>
        <CardDescription>
          Trage die E-Mail-Adresse deines Plus-Map-Kontos ein. Wir senden dir einen Link zum
          Zurücksetzen.
        </CardDescription>
      </CardHeader>
      {submitted ? (
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-slate-700 dark:text-slate-300" role="status">
            {NEUTRAL_MESSAGE}
          </p>
          <Link href="/login" className="text-sm underline">
            Zurück zum Login
          </Link>
        </CardContent>
      ) : (
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
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={forgot.isPending}>
                {forgot.isPending ? "Sende…" : "Link anfordern"}
              </Button>
              <Link href="/login" className="text-sm underline">
                Zurück zum Login
              </Link>
            </CardFooter>
          </form>
        </Form>
      )}
    </Card>
  );
}
