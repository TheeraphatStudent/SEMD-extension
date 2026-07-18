import { describe, expect, test } from "bun:test";
import { migrateStorage, sanitizeSettings } from "./storage";

describe("storage migration", () => {
  test("creates defaults for missing storage", () => {
    const storage = migrateStorage(undefined);
    expect(storage.schemaVersion).toBe(2);
    expect(storage.settings.enabled).toBe(true);
    expect(storage.settings.checkMode).toBe("realtime");
  });

  test("migrates legacy endpoint and api key fields", () => {
    const storage = migrateStorage({
      apiEndpoint: "https://api.example.com/api/v1/predict/predict",
      apiKey: "SECRET",
      scanHistory: [],
    });

    expect(storage.settings.apiBaseUrl).toBe("https://api.example.com");
    expect(storage.settings.accessCode).toBe("SECRET");
  });

  test("sanitizes malformed settings safely", () => {
    const settings = sanitizeSettings({
      enabled: "yes",
      checkMode: "other",
    });

    expect(settings.enabled).toBe(true);
    expect(settings.checkMode).toBe("realtime");
  });
});
