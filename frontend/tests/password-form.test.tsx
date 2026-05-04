import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { PasswordForm } from "@/components/profile/password-form";

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

describe("PasswordForm", () => {
  test("PATCH /api/users/me with {password} on submit", async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    const user = userEvent.setup();
    render(
      <Wrapper>
        <PasswordForm />
      </Wrapper>,
    );

    await user.type(screen.getByLabelText(/^Neues Passwort$/i), "supersecret123");
    await user.type(screen.getByLabelText(/Passwort bestätigen/i), "supersecret123");
    await user.click(screen.getByRole("button", { name: /passwort ändern/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/users/me");
    expect(init.method).toBe("PATCH");
    expect(init.headers.get("X-CSRF-Token")).toBe("t1");
    expect(JSON.parse(init.body as string)).toEqual({ password: "supersecret123" });
  });

  test("blocks submission when passwords do not match", async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const user = userEvent.setup();
    render(
      <Wrapper>
        <PasswordForm />
      </Wrapper>,
    );

    await user.type(screen.getByLabelText(/^Neues Passwort$/i), "supersecret123");
    await user.type(screen.getByLabelText(/Passwort bestätigen/i), "different12345");
    await user.click(screen.getByRole("button", { name: /passwort ändern/i }));

    expect(await screen.findByText(/Die Passwörter stimmen nicht überein/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("rejects passwords shorter than 12 chars", async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const user = userEvent.setup();
    render(
      <Wrapper>
        <PasswordForm />
      </Wrapper>,
    );

    await user.type(screen.getByLabelText(/^Neues Passwort$/i), "short");
    await user.type(screen.getByLabelText(/Passwort bestätigen/i), "short");
    await user.click(screen.getByRole("button", { name: /passwort ändern/i }));

    expect(await screen.findByText(/mindestens 12 Zeichen/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("resets the form after a successful submission", async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    const user = userEvent.setup();
    render(
      <Wrapper>
        <PasswordForm />
      </Wrapper>,
    );

    const newPassword = screen.getByLabelText(/^Neues Passwort$/i) as HTMLInputElement;
    const confirm = screen.getByLabelText(/Passwort bestätigen/i) as HTMLInputElement;
    await user.type(newPassword, "supersecret123");
    await user.type(confirm, "supersecret123");
    await user.click(screen.getByRole("button", { name: /passwort ändern/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(newPassword.value).toBe(""));
    expect(confirm.value).toBe("");
  });
});
