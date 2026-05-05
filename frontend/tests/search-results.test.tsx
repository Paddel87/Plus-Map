import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { SearchResults, renderSnippet } from "@/components/search/search-results";

describe("SearchResults", () => {
  test("renders empty state when items is empty", () => {
    render(<SearchResults query="rope" items={[]} total={0} />);
    expect(screen.getByText(/Keine Treffer/i)).toBeInTheDocument();
  });

  test("renders one link per hit pointing to /events/<event_id>", () => {
    render(
      <SearchResults
        query="metal"
        total={2}
        items={[
          {
            type: "event",
            id: "00000000-0000-0000-0000-000000000001",
            event_id: "00000000-0000-0000-0000-000000000001",
            snippet: "Hallo <b>metal</b> world",
          },
          {
            type: "application",
            id: "00000000-0000-0000-0000-000000000002",
            event_id: "00000000-0000-0000-0000-000000000003",
            snippet: "Plain note",
          },
        ]}
      />,
    );
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/events/00000000-0000-0000-0000-000000000001");
    expect(links[1]).toHaveAttribute("href", "/events/00000000-0000-0000-0000-000000000003");
    expect(within(links[0]!).getByText("Tour")).toBeInTheDocument();
    expect(within(links[1]!).getByText("Stopp")).toBeInTheDocument();
  });
});

describe("renderSnippet", () => {
  test("wraps <b>...</b> tokens in <mark> and renders other parts as plain text", () => {
    render(<p data-testid="snippet">{renderSnippet("Hallo <b>welt</b>!")}</p>);
    const node = screen.getByTestId("snippet");
    expect(node).toHaveTextContent("Hallo welt!");
    const mark = node.querySelector("mark");
    expect(mark).not.toBeNull();
    expect(mark!.textContent).toBe("welt");
  });

  test("does not execute embedded HTML such as <script>", () => {
    render(
      <p data-testid="snippet">
        {renderSnippet('vor <script>alert("x")</script> nach <b>treffer</b>')}
      </p>,
    );
    const node = screen.getByTestId("snippet");
    // Script tag must not have been parsed as a real element.
    expect(node.querySelector("script")).toBeNull();
    // Plain content (incl. literal <script>...) is rendered as text.
    expect(node.textContent).toContain('<script>alert("x")</script>');
    expect(node.querySelector("mark")?.textContent).toBe("treffer");
  });

  test("returns empty array for empty snippet", () => {
    expect(renderSnippet("")).toEqual([]);
  });
});
