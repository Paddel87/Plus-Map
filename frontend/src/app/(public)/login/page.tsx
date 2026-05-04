import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { getServerMe } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getServerMe();
  if (user) {
    redirect("/");
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-900">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
