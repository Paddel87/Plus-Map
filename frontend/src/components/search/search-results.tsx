import Link from "next/link";
import type { ReactNode } from "react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface SearchHit {
  type: "event" | "application";
  id: string;
  event_id: string;
  snippet: string;
}

export interface SearchResultsProps {
  query: string;
  items: SearchHit[];
  total: number;
}

export function SearchResults({ query, items, total }: SearchResultsProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Keine Treffer</CardTitle>
          <CardDescription>
            Für „{query}“ wurden keine Notizen in sichtbaren Events oder Applications gefunden.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  return (
    <ul className="flex flex-col gap-3" aria-label={`${total} Treffer für ${query}`}>
      {items.map((hit) => (
        <li key={`${hit.type}-${hit.id}`}>
          <Link
            href={`/events/${hit.event_id}`}
            className="block rounded-md border border-slate-200 bg-white px-4 py-3 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
          >
            <div className="flex items-center gap-2 pb-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <span>{hit.type === "event" ? "Event" : "Application"}</span>
              <span aria-hidden>•</span>
              <span className="font-mono">{hit.event_id.slice(0, 8)}…</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              {renderSnippet(hit.snippet)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const HIGHLIGHT_PATTERN = /<b>(.*?)<\/b>/gi;

export function renderSnippet(snippet: string): ReactNode[] {
  if (!snippet) return [];
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  HIGHLIGHT_PATTERN.lastIndex = 0;
  while ((match = HIGHLIGHT_PATTERN.exec(snippet)) !== null) {
    if (match.index > lastIndex) {
      parts.push(snippet.slice(lastIndex, match.index));
    }
    parts.push(
      <mark
        key={`${match.index}-${parts.length}`}
        className="rounded-sm bg-amber-200 px-0.5 text-slate-900 dark:bg-amber-300/80"
      >
        {match[1]}
      </mark>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < snippet.length) {
    parts.push(snippet.slice(lastIndex));
  }
  return parts;
}
