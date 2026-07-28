import { describe, expect, test } from "bun:test";
import { evaluateUrlWithApi, mapApiResponse } from "./api";
import { mapErrorToEvaluation, mapResultToEvaluation } from "./state";
import type { ExtensionSettings } from "./types";

function baseSettings(overrides: Partial<ExtensionSettings> = {}): ExtensionSettings {
  return {
    enabled: true,
    checkMode: "realtime",
    apiBaseUrl: "https://api.semd.test",
    ...overrides,
  };
}

function stubFetch(capture: { headers?: HeadersInit }) {
  return (async (_input: RequestInfo | URL, init?: RequestInit) => {
    capture.headers = init?.headers;
    return new Response(
      JSON.stringify({ result: { is_malicious: false, accurate: 0.9, suggested: "allow" } }),
      { status: 200 },
    );
  }) as typeof fetch;
}

describe("evaluateUrlWithApi headers", () => {
  test("omits x-api-key entirely when no Access Code is configured", async () => {
    const capture: { headers?: HeadersInit } = {};
    const originalFetch = globalThis.fetch;
    globalThis.fetch = stubFetch(capture);

    try {
      await evaluateUrlWithApi("https://example.com", baseSettings(), "manual");
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(capture.headers !== undefined).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(capture.headers as object, "x-api-key")).toBe(false);
  });

  test("includes x-api-key when an Access Code is configured", async () => {
    const capture: { headers?: HeadersInit } = {};
    const originalFetch = globalThis.fetch;
    globalThis.fetch = stubFetch(capture);

    try {
      await evaluateUrlWithApi(
        "https://example.com",
        baseSettings({ accessCode: "secret-code" }),
        "manual",
      );
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect((capture.headers as Record<string, string>)["x-api-key"]).toBe("secret-code");
  });
});

describe("api mapping", () => {
  test("maps malicious responses", () => {
    const result = mapApiResponse("https://example.com", {
      result: {
        is_malicious: true,
        accurate: 0.87,
        suggested: "block",
      },
    });

    expect(result?.classification).toBe("malicious");
    expect(result?.confidence).toBe(0.87);
  });

  test("rejects invalid payloads", () => {
    expect(mapApiResponse("https://example.com", { nope: true })).toBeNull();
  });

  test("maps errors to explicit non-safe states", () => {
    expect(mapErrorToEvaluation("https://example.com", "offline", "Offline", "manual").status).toBe(
      "offline",
    );
    expect(
      mapResultToEvaluation(
        "https://example.com",
        {
          url: "https://example.com",
          classification: "safe",
          evaluatedAt: new Date().toISOString(),
        },
        "manual",
      ).status,
    ).toBe("safe");
  });
});
