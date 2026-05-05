import { toast } from "sonner";

import { ApiError } from "@/lib/api";

function asApiError(err: unknown): ApiError | null {
  if (err instanceof ApiError) return err;
  // Defensive: Next.js can split client/server modules and break
  // `instanceof` checks across the boundary. Fall back to duck-typing
  // by `name + status` (set in api.ts).
  if (
    err !== null &&
    typeof err === "object" &&
    (err as { name?: unknown }).name === "ApiError" &&
    typeof (err as { status?: unknown }).status === "number"
  ) {
    return err as ApiError;
  }
  return null;
}

export function describeMutationError(err: unknown): void {
  const apiErr = asApiError(err);
  if (apiErr) {
    if (apiErr.status === 409) {
      toast.error("Eintrag existiert bereits", {
        description:
          typeof apiErr.detail === "object" && apiErr.detail
            ? ((apiErr.detail as { detail?: string }).detail ?? apiErr.message)
            : apiErr.message,
      });
      return;
    }
    if (apiErr.status === 403) {
      toast.error("Keine Berechtigung", { description: apiErr.message });
      return;
    }
    if (apiErr.status === 422) {
      toast.error("Eingabe ungültig", { description: apiErr.message });
      return;
    }
  }
  toast.error("Speichern fehlgeschlagen", {
    description: err instanceof Error ? err.message : String(err),
  });
}
