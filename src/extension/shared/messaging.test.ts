import { describe, expect, test } from "bun:test";
import { isRequestMessage } from "./messaging";

describe("message validation", () => {
  test("accepts valid evaluation messages", () => {
    expect(
      isRequestMessage({
        type: "EVALUATE_URL",
        payload: {
          url: "https://example.com",
        },
      }),
    ).toBe(true);
  });

  test("rejects malformed messages", () => {
    expect(
      isRequestMessage({
        type: "EVALUATE_URL",
      }),
    ).toBe(false);
  });

  test("accepts valid settings updates", () => {
    expect(
      isRequestMessage({
        type: "UPDATE_SETTINGS",
        payload: {
          enabled: false,
          checkMode: "ask",
        },
      }),
    ).toBe(true);
  });

  test("accepts continue messages with a url payload", () => {
    expect(
      isRequestMessage({
        type: "CONTINUE_TO_URL",
        payload: {
          url: "https://example.com",
        },
      }),
    ).toBe(true);
  });
});
