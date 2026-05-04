import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { SearchBox } from "@/components/layout/search-box";

const pushMock = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => searchParams,
}));

beforeEach(() => {
  pushMock.mockReset();
  searchParams = new URLSearchParams();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SearchBox", () => {
  test("submits navigates to /search with encoded query", async () => {
    const user = userEvent.setup();
    render(<SearchBox />);
    const input = screen.getByRole("searchbox", { name: /Volltextsuche/i });
    await user.type(input, "rope & metal");
    await user.keyboard("{Enter}");
    expect(pushMock).toHaveBeenCalledWith(`/search?q=${encodeURIComponent("rope & metal")}`);
  });

  test("does not navigate on empty submit", async () => {
    const user = userEvent.setup();
    render(<SearchBox />);
    const input = screen.getByRole("searchbox", { name: /Volltextsuche/i });
    await user.type(input, "   ");
    await user.keyboard("{Enter}");
    expect(pushMock).not.toHaveBeenCalled();
  });

  test("prefills from current ?q= value", () => {
    searchParams = new URLSearchParams("q=clejuso");
    render(<SearchBox />);
    const input = screen.getByRole("searchbox", { name: /Volltextsuche/i }) as HTMLInputElement;
    expect(input.value).toBe("clejuso");
  });
});
