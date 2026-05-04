"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export interface SearchBoxProps {
  className?: string;
  inputClassName?: string;
  placeholder?: string;
}

export function SearchBox({
  className,
  inputClassName,
  placeholder = "In Notizen suchen…",
}: SearchBoxProps) {
  const router = useRouter();
  const params = useSearchParams();
  const queryFromUrl = params.get("q") ?? "";
  const [value, setValue] = useState(queryFromUrl);

  useEffect(() => {
    setValue(queryFromUrl);
  }, [queryFromUrl]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form
      role="search"
      action="/search"
      method="get"
      onSubmit={handleSubmit}
      className={cn("relative w-full", className)}
    >
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
      <Input
        type="search"
        name="q"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label="Volltextsuche"
        className={cn("h-9 pl-9", inputClassName)}
      />
    </form>
  );
}
