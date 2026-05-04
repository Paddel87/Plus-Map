import { cookies } from "next/headers";

import { SearchResults, type SearchHit } from "@/components/search/search-results";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000";

interface SearchResponse {
  items: SearchHit[];
  total: number;
  limit: number;
  offset: number;
}

async function loadSearch(q: string, cookieHeader: string): Promise<SearchResponse | null> {
  const url = new URL(`${BACKEND_URL}/api/search`);
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "50");
  try {
    const response = await fetch(url.toString(), {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as SearchResponse;
  } catch {
    return null;
  }
}

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Suche</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Volltextsuche über Notizen sichtbarer Events und Applications. RLS-gefiltert.
        </p>
      </header>

      {q.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Suchbegriff eingeben</CardTitle>
            <CardDescription>
              Tippe in das Suchfeld in der Navigation, um Notizen zu durchsuchen.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <SearchSection q={q} />
      )}
    </div>
  );
}

async function SearchSection({ q }: { q: string }) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const result = await loadSearch(q, cookieHeader);

  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Suche fehlgeschlagen</CardTitle>
          <CardDescription>
            Backend nicht erreichbar oder unautorisiert. Bitte erneut versuchen.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {result.total === 0 ? "Keine Treffer" : `${result.total} Treffer für „${q}“`}
          </CardTitle>
          <CardDescription>
            {result.total > result.items.length
              ? `Anzeige: ${result.items.length} (Limit ${result.limit}).`
              : "Alle Treffer angezeigt."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SearchResults query={q} items={result.items} total={result.total} />
        </CardContent>
      </Card>
    </section>
  );
}
