import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportButtons } from "@/components/profile/export-buttons";
import { LogoutButton } from "@/components/profile/logout-button";
import { PasswordForm } from "@/components/profile/password-form";
import { PinSettings } from "@/components/profile/pin-settings";
import { getServerMe } from "@/lib/auth-server";

export default async function ProfilePage() {
  const user = await getServerMe();
  if (!user) return null;
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Profil</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Eigene Daten, Passwort, Sitzung und Datenexport.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Konto</CardTitle>
          <CardDescription>Aus dem Backend geladen via /api/users/me.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2">
            <dt className="text-slate-500 dark:text-slate-400">E-Mail</dt>
            <dd className="font-medium">{user.email}</dd>
            <dt className="text-slate-500 dark:text-slate-400">Anzeigename</dt>
            <dd className="font-medium">{user.display_name || "—"}</dd>
            <dt className="text-slate-500 dark:text-slate-400">Rolle</dt>
            <dd className="font-medium">{user.role}</dd>
            <dt className="text-slate-500 dark:text-slate-400">Person-ID</dt>
            <dd className="font-mono text-xs">{user.person_id}</dd>
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Passwort ändern</CardTitle>
          <CardDescription>
            Mindestens 12 Zeichen. Die laufende Sitzung bleibt aktiv; beim nächsten Login wird das
            neue Passwort verlangt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Meine Daten exportieren</CardTitle>
          <CardDescription>
            Datensouveränität: alle für dich sichtbaren Touren und Stopps als JSON oder CSV.
            Admins erhalten zusätzlich einen Vollexport.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExportButtons role={user.role} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">App-PIN</CardTitle>
          <CardDescription>
            Clientseitige UI-Sperre (PBKDF2 via Web Crypto, ADR-023). Schützt vor Schulterblick und
            kurzer fremder Übernahme. Nicht gegen forensischen Zugriff auf das entsperrte Gerät.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PinSettings />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sitzung</CardTitle>
        </CardHeader>
        <CardContent>
          <LogoutButton />
        </CardContent>
      </Card>
    </div>
  );
}
