import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ApiError, apiFetch } from "@/lib/api";

interface FetchCall {
  url: string;
  init: RequestInit;
}

let calls: FetchCall[];
let fetchMock: ReturnType<typeof vi.fn>;

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  calls = [];
  document.cookie = "hcmap_csrf=token-abc; path=/";
  fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    return jsonResponse({ ok: true });
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "hcmap_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
});

describe("apiFetch", () => {
  test("includes credentials and skips CSRF header on GET", async () => {
    await apiFetch("/api/users/me");
    expect(calls).toHaveLength(1);
    const call = calls[0]!;
    expect(call.url).toBe("/api/users/me");
    expect(call.init.credentials).toBe("include");
    const headers = new Headers(call.init.headers);
    expect(headers.has("X-CSRF-Token")).toBe(false);
  });

  test("attaches X-CSRF-Token from cookie on POST", async () => {
    await apiFetch("/api/events", { method: "POST", body: { lat: 1, lon: 2 } });
    const headers = new Headers(calls[0]!.init.headers);
    expect(headers.get("X-CSRF-Token")).toBe("token-abc");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(calls[0]!.init.body).toBe(JSON.stringify({ lat: 1, lon: 2 }));
  });

  test("preserves explicit Content-Type and string body", async () => {
    await apiFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "username=a&password=b",
    });
    const headers = new Headers(calls[0]!.init.headers);
    expect(headers.get("Content-Type")).toBe("application/x-www-form-urlencoded");
    expect(calls[0]!.init.body).toBe("username=a&password=b");
  });

  test("encodes query parameters", async () => {
    await apiFetch("/api/search", { query: { q: "rope", limit: 10, missing: undefined } });
    expect(calls[0]!.url).toBe("/api/search?q=rope&limit=10");
  });

  test("throws ApiError with status, code, detail on non-ok response", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Bad creds", code: "INVALID" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    );
    await expect(apiFetch("/api/auth/login", { method: "POST" })).rejects.toMatchObject({
      name: "ApiError",
      status: 400,
      code: "INVALID",
    });
  });

  test("returns undefined on 204 No Content", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const result = await apiFetch("/api/auth/logout", { method: "POST" });
    expect(result).toBeUndefined();
  });
});

describe("ApiError", () => {
  test("captures status and detail", () => {
    const err = new ApiError("nope", 401, { detail: "nope" }, "UNAUTHORIZED");
    expect(err.status).toBe(401);
    expect(err.code).toBe("UNAUTHORIZED");
    expect(err.detail).toEqual({ detail: "nope" });
  });
});
