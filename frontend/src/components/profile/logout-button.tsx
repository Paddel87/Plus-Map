"use client";

import { LogOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useLogout } from "@/lib/auth";

export function LogoutButton() {
  const logout = useLogout();
  return (
    <Button
      variant="outline"
      onClick={() =>
        logout.mutate(undefined, {
          onError: (error) =>
            toast.error("Logout fehlgeschlagen", {
              description: error instanceof Error ? error.message : String(error),
            }),
        })
      }
      disabled={logout.isPending}
    >
      <LogOut /> Abmelden
    </Button>
  );
}
