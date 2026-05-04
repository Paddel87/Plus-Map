import { describe, expect, test } from "vitest";

import { diffSeconds, formatDuration } from "@/lib/duration";

describe("formatDuration", () => {
  test("formats sub-hour spans as MM:SS", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(5)).toBe("00:05");
    expect(formatDuration(65)).toBe("01:05");
    expect(formatDuration(3599)).toBe("59:59");
  });

  test("formats hour spans as HH:MM:SS", () => {
    expect(formatDuration(3600)).toBe("1:00:00");
    expect(formatDuration(3661)).toBe("1:01:01");
    expect(formatDuration(36_001)).toBe("10:00:01");
  });

  test("clamps negatives and rounds floats", () => {
    expect(formatDuration(-5)).toBe("00:00");
    expect(formatDuration(12.7)).toBe("00:12");
  });
});

describe("diffSeconds", () => {
  test("computes positive diff between two ISO strings", () => {
    const start = "2026-04-26T10:00:00.000Z";
    const end = "2026-04-26T10:00:30.000Z";
    expect(diffSeconds(start, end)).toBe(30);
  });

  test("clamps to 0 when end is before start", () => {
    const start = "2026-04-26T10:00:00.000Z";
    const end = "2026-04-26T09:59:50.000Z";
    expect(diffSeconds(start, end)).toBe(0);
  });

  test("returns 0 for unparseable start", () => {
    expect(diffSeconds("not-a-date", "2026-04-26T10:00:00.000Z")).toBe(0);
  });
});
