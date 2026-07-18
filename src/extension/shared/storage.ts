import { STATE_HISTORY_LIMIT, STORAGE_KEY, STORAGE_SCHEMA_VERSION } from "./constants";
import { createDefaultSettings } from "./state";
import type {
  ExtensionSettings,
  ExtensionStorage,
  TabEvaluationState,
  UrlEvaluation,
  UrlEvaluationResult,
} from "./types";

type BrowserStorageArea = {
  get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
};

function createDefaultStorage(): ExtensionStorage {
  return {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    settings: createDefaultSettings(),
    lastEvaluation: undefined,
    tabStates: {},
    scanHistory: [],
  };
}

export async function readStorage(area: BrowserStorageArea): Promise<ExtensionStorage> {
  const result = await area.get(STORAGE_KEY);
  const raw = result?.[STORAGE_KEY] as Record<string, unknown> | undefined;
  return migrateStorage(raw);
}

export async function writeStorage(area: BrowserStorageArea, storage: ExtensionStorage) {
  await area.set({ [STORAGE_KEY]: storage });
}

export async function updateStorage(
  area: BrowserStorageArea,
  updater: (storage: ExtensionStorage) => ExtensionStorage,
) {
  const current = await readStorage(area);
  const next = updater(current);
  await writeStorage(area, next);
  return next;
}

export function migrateStorage(raw: Record<string, unknown> | undefined): ExtensionStorage {
  if (!raw || typeof raw !== "object") {
    return createDefaultStorage();
  }

  if (raw.schemaVersion === STORAGE_SCHEMA_VERSION && raw.settings && raw.tabStates) {
    return {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      settings: sanitizeSettings(raw.settings as Record<string, unknown>),
      lastEvaluation: sanitizeEvaluation(raw.lastEvaluation as UrlEvaluation | undefined),
      tabStates: sanitizeTabStates(raw.tabStates as Record<string, TabEvaluationState> | undefined),
      scanHistory: sanitizeHistory(raw.scanHistory as UrlEvaluationResult[] | undefined),
    };
  }

  const settings = createDefaultSettings();
  const maybeApiBaseUrl = raw.apiEndpoint;
  const maybeAccessCode = raw.apiKey;

  if (typeof maybeApiBaseUrl === "string" && maybeApiBaseUrl.trim()) {
    settings.apiBaseUrl = maybeApiBaseUrl.replace(/\/api\/v1\/predict\/predict\/?$/, "");
  }

  if (typeof maybeAccessCode === "string" && maybeAccessCode.trim()) {
    settings.accessCode = maybeAccessCode;
  }

  return {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    settings,
    lastEvaluation: undefined,
    tabStates: {},
    scanHistory: sanitizeHistory(raw.scanHistory as UrlEvaluationResult[] | undefined),
  };
}

export function sanitizeSettings(raw: Record<string, unknown>): ExtensionSettings {
  const defaults = createDefaultSettings();
  return {
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : defaults.enabled,
    checkMode: raw.checkMode === "ask" ? "ask" : "realtime",
    accessCode: typeof raw.accessCode === "string" && raw.accessCode ? raw.accessCode : undefined,
    apiBaseUrl: typeof raw.apiBaseUrl === "string" && raw.apiBaseUrl ? raw.apiBaseUrl : undefined,
    accessCodeValidationPath:
      typeof raw.accessCodeValidationPath === "string" && raw.accessCodeValidationPath
        ? raw.accessCodeValidationPath
        : undefined,
  };
}

export function sanitizeHistory(raw: UrlEvaluationResult[] | undefined): UrlEvaluationResult[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry) => entry && typeof entry.url === "string" && typeof entry.classification === "string")
    .slice(0, STATE_HISTORY_LIMIT);
}

export function sanitizeTabStates(
  raw: Record<string, TabEvaluationState> | undefined,
): Record<string, TabEvaluationState> {
  if (!raw || typeof raw !== "object") return {};
  return Object.fromEntries(
    Object.entries(raw).filter(([, value]) => value && typeof value.url === "string"),
  );
}

export function sanitizeEvaluation(raw: UrlEvaluation | undefined): UrlEvaluation | undefined {
  if (!raw || typeof raw.url !== "string" || typeof raw.status !== "string") {
    return undefined;
  }
  return raw;
}
