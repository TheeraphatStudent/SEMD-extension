import { describe, expect, test } from "bun:test";
import { formatConfidence, isExcludedUrl, isHttpUrl, maskAccessCode, normalizeUrl } from "./url";

describe("url helpers", () => {
  test("normalizes URLs by removing hashes", () => {
    expect(normalizeUrl("https://example.com/path#fragment")).toBe("https://example.com/path");
  });

  test("excludes browser-owned schemes", () => {
    expect(isExcludedUrl("chrome://extensions")).toBe(true);
    expect(isExcludedUrl("https://example.com")).toBe(false);
  });

  test("detects HTTP URLs", () => {
    expect(isHttpUrl("https://example.com")).toBe(true);
    expect(isHttpUrl("about:blank")).toBe(false);
  });

  test("masks access codes", () => {
    expect(maskAccessCode("ABCDEFGH")).toBe("••••EFGH");
  });

  test("formats confidence consistently", () => {
    expect(formatConfidence(0.91)).toBe("91%");
    expect(formatConfidence(undefined)).toBeNull();
  });
});
