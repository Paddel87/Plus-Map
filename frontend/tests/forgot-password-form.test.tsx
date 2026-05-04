import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  document.cookie = "hcmap_csrf=t1; path=/";
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "hcmap_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
});

describe("ForgotPasswordForm", () => {
  test("posts JSON body to /api/auth/forgot-password and shows neutral confirmation", async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 202 }));
    const user = userEvent.setup();
    render(
      <Wrapper>
        <ForgotPasswordForm />
      </Wrapper>,
    );

    await user.type(screen.getByLabelText(/E-Mail/i), "alice@example.com");
    await user.click(screen.getByRole("button", { name: /link anfordern/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/auth/forgot-password");
    expect(init.method).toBe("POST");
    const headers = new Headers(init.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("X-CSRF-Token")).toBe("t1");
    expect(JSON.parse(init.body as string)).toEqual({ email: "alice@example.com" });

    await waitFor(() =>
      expect(
        screen.getByText(/Falls für die angegebene E-Mail-Adresse ein Konto existiert/i),
      ).toBeInTheDocument(),
    );
  });

  test("shows neutral confirmation even on server error (no enumeration)", async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 500 }));
    const user = userEvent.setup();
    render(
      <Wrapper>
        <ForgotPasswordForm />
      </Wrapper>,
    );

    await user.type(screen.getByLabelText(/E-Mail/i), "alice@example.com");
    await user.click(screen.getByRole("button", { name: /link anfordern/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/Falls für die angegebene E-Mail-Adresse ein Konto existiert/i),
      ).toBeInTheDocument(),
    );
  });

  test("blocks submission on invalid email", async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const user = userEvent.setup();
    render(
      <Wrapper>
        <ForgotPasswordForm />
      </Wrapper>,
    );

    await user.type(screen.getByLabelText(/E-Mail/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /link anfordern/i }));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
