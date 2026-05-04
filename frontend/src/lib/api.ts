const CSRF_COOKIE_NAME = "hcmap_csrf";
const CSRF_HEADER_NAME = "X-CSRF-Token";
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly detail: unknown;

  constructor(message: string, status: number, detail: unknown, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export interface ApiRequestInit extends Omit<RequestInit, "body"> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  cookieHeader?: string;
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const target = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(target)) {
      return decodeURIComponent(trimmed.slice(target.length));
    }
  }
  return undefined;
}

function buildUrl(path: string, query?: ApiRequestInit["query"]): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function apiFetch<T = unknown>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (MUTATION_METHODS.has(method)) {
    const csrf = readCookie(CSRF_COOKIE_NAME);
    if (csrf && !headers.has(CSRF_HEADER_NAME)) {
      headers.set(CSRF_HEADER_NAME, csrf);
    }
  }
  if (init.cookieHeader && !headers.has("Cookie")) {
    headers.set("Cookie", init.cookieHeader);
  }
  const requestInit: RequestInit = {
    ...init,
    method,
    headers,
    credentials: "include",
    body:
      init.body === undefined
        ? undefined
        : typeof init.body === "string" || init.body instanceof FormData
          ? (init.body as BodyInit)
          : JSON.stringify(init.body),
  };
  const url = buildUrl(path, init.query);
  const response = await fetch(url, requestInit);
  if (response.status === 204) {
    return undefined as T;
  }
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload: unknown = isJson ? await response.json().catch(() => null) : await response.text();
  if (!response.ok) {
    const message = extractMessage(payload, response.statusText);
    const code = extractCode(payload);
    throw new ApiError(message, response.status, payload, code);
  }
  return payload as T;
}

function extractMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return fallback || "Request failed";
}

function extractCode(payload: unknown): string | undefined {
  if (payload && typeof payload === "object") {
    const code = (payload as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

export const __test__ = { readCookie, buildUrl };
