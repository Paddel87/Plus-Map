import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { LoginForm } from "@/components/auth/login-form";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const originalLocation = window.location;
let assignMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  document.cookie = "hcmap_csrf=t1; path=/";
  vi.stubGlobal("fetch", vi.fn());
  assignMock = vi.fn();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...originalLocation, assign: assignMock },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  });
  document.cookie = "hcmap_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
});

describe("LoginForm", () => {
  test("submits credentials as form-urlencoded and navigates on success", async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const user = userEvent.setup();
    render(
      <Wrapper>
        <LoginForm />
      </Wrapper>,
    );
    await user.type(screen.getByLabelText(/E-Mail/i), "admin@example.com");
    await user.type(screen.getByLabelText(/Passwort/i), "supersecret123");
    await user.click(screen.getByRole("button", { name: /anmelden/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/auth/login");
    const headers = new Headers(init.headers);
    expect(headers.get("Content-Type")).toBe("application/x-www-form-urlencoded");
    expect(init.body).toContain("username=admin%40example.com");
    expect(init.body).toContain("password=supersecret123");
    await waitFor(() => expect(assignMock).toHaveBeenCalledWith("/"));
  });

  test("blocks submit and skips fetch on invalid email", async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const user = userEvent.setup();
    render(
      <Wrapper>
        <LoginForm />
      </Wrapper>,
    );
    // type=email + missing "@" already prevents native form submission;
    // assert that no network call goes out.
    await user.type(screen.getByLabelText(/E-Mail/i), "not-an-email");
    await user.type(screen.getByLabelText(/Passwort/i), "x");
    await user.click(screen.getByRole("button", { name: /anmelden/i }));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
