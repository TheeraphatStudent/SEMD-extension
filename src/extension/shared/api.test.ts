import { describe, expect, test } from "bun:test";
import { mapApiResponse } from "./api";
import { mapErrorToEvaluation, mapResultToEvaluation } from "./state";

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
