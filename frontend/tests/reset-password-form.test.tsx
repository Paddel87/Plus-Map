import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
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
  document.cookie = "plusmap_csrf=t1; path=/";
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
  document.cookie = "plusmap_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  mockSearchParams = new URLSearchParams();
});

describe("ResetPasswordForm", () => {
  test("renders 'invalid link' state when token is missing", () => {
    mockSearchParams = new URLSearchParams();
    render(
      <Wrapper>
        <ResetPasswordForm />
      </Wrapper>,
    );
    expect(screen.getByText(/Ungültiger Link/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Neues Passwort/i)).not.toBeInTheDocument();
  });

  test("posts {token, password} and redirects to /login on success", async () => {
    mockSearchParams = new URLSearchParams("token=abc123");
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    const user = userEvent.setup();
    render(
      <Wrapper>
        <ResetPasswordForm />
      </Wrapper>,
    );

    await user.type(screen.getByLabelText(/^Neues Passwort$/i), "supersecret123");
    await user.type(screen.getByLabelText(/Passwort bestätigen/i), "supersecret123");
    await user.click(screen.getByRole("button", { name: /passwort speichern/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/auth/reset-password");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      token: "abc123",
      password: "supersecret123",
    });
    await waitFor(() => expect(assignMock).toHaveBeenCalledWith("/login"));
  });

  test("blocks submission when passwords do not match", async () => {
    mockSearchParams = new URLSearchParams("token=abc123");
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const user = userEvent.setup();
    render(
      <Wrapper>
        <ResetPasswordForm />
      </Wrapper>,
    );

    await user.type(screen.getByLabelText(/^Neues Passwort$/i), "supersecret123");
    await user.type(screen.getByLabelText(/Passwort bestätigen/i), "different12345");
    await user.click(screen.getByRole("button", { name: /passwort speichern/i }));

    expect(await screen.findByText(/Die Passwörter stimmen nicht überein/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("rejects passwords shorter than 12 chars", async () => {
    mockSearchParams = new URLSearchParams("token=abc123");
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const user = userEvent.setup();
    render(
      <Wrapper>
        <ResetPasswordForm />
      </Wrapper>,
    );

    await user.type(screen.getByLabelText(/^Neues Passwort$/i), "short");
    await user.type(screen.getByLabelText(/Passwort bestätigen/i), "short");
    await user.click(screen.getByRole("button", { name: /passwort speichern/i }));

    expect(await screen.findByText(/mindestens 12 Zeichen/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
