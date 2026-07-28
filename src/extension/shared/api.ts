import { API_TIMEOUT_MS } from "./constants";
import { getRuntimeConfig } from "./config";
import { mapErrorToEvaluation, mapResultToEvaluation } from "./state";
import type {
  AccessCodeValidationStatus,
  ExtensionSettings,
  ProtocolResult,
  UrlEvaluation,
  UrlEvaluationResult,
} from "./types";

type AccessCodeValidationResult = {
  status: AccessCodeValidationStatus;
  message: string;
};

function buildUrl(baseUrl: string | undefined, path: string): string | null {
  if (!baseUrl) return null;
  try {
    return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
  } catch {
    return null;
  }
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function evaluateUrlWithApi(
  url: string,
  settings: ExtensionSettings,
  trigger: UrlEvaluation["trigger"],
): Promise<UrlEvaluation> {
  const config = getRuntimeConfig();
  const apiUrl = buildUrl(settings.apiBaseUrl ?? config.defaultApiBaseUrl, config.predictPath);

  if (!apiUrl) {
    return mapErrorToEvaluation(
      url,
      "unknown_error",
      "SEMD API base URL is not configured.",
      trigger,
    );
  }

  // No login/Access Code required to check a URL: /prediction/predict accepts
  // anonymous calls. An Access Code is sent when configured (attributes the
  // call, raises usage limits), but its absence -- or the backend rejecting
  // it as expired/invalid -- must degrade to an anonymous call, not a
  // hard failure.
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (settings.accessCode) {
    headers["x-api-key"] = settings.accessCode;
  }

  try {
    const response = await fetchWithTimeout(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ url }),
    });

    if (response.status === 401 || response.status === 403) {
      return mapErrorToEvaluation(
        url,
        "unauthorized",
        "The Access Code was rejected by the SEMD API.",
        trigger,
      );
    }

    if (!response.ok) {
      return mapErrorToEvaluation(
        url,
        "http_error",
        `The SEMD API responded with status ${response.status}.`,
        trigger,
      );
    }

    const data = (await response.json()) as unknown;
    const result = mapApiResponse(url, data);

    if (!result) {
      return mapErrorToEvaluation(
        url,
        "invalid_response",
        "The SEMD API response could not be understood.",
        trigger,
      );
    }

    return mapResultToEvaluation(url, result, trigger);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return mapErrorToEvaluation(url, "timeout", "The SEMD API request timed out.", trigger);
    }

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return mapErrorToEvaluation(url, "offline", "You appear to be offline.", trigger);
    }

    return mapErrorToEvaluation(
      url,
      "unknown_error",
      error instanceof Error ? error.message : "Unknown SEMD API error.",
      trigger,
    );
  }
}

export function mapApiResponse(url: string, payload: unknown): UrlEvaluationResult | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const result = (payload as { result?: Record<string, unknown> }).result;
  if (!result || typeof result !== "object") {
    return null;
  }

  const isMalicious = result.is_malicious;
  const accuracy = result.accurate;
  const suggested = result.suggested;

  const classification =
    isMalicious === true ? "malicious" : isMalicious === false ? "safe" : "unknown";

  return {
    url,
    classification,
    confidence: typeof accuracy === "number" ? accuracy : undefined,
    recommendation: typeof suggested === "string" ? suggested : undefined,
    rawSuggested: typeof suggested === "string" ? suggested : undefined,
    source: "semd-api",
    evaluatedAt: new Date().toISOString(),
  };
}

export async function validateAccessCodeWithApi(
  accessCode: string,
  settings: ExtensionSettings,
): Promise<ProtocolResult<AccessCodeValidationResult>> {
  const config = getRuntimeConfig();
  const validationPath = settings.accessCodeValidationPath ?? config.accessCodeValidationPath;
  const apiUrl = buildUrl(settings.apiBaseUrl ?? config.defaultApiBaseUrl, validationPath ?? "");

  if (!validationPath || !apiUrl) {
    return {
      ok: false,
      error: {
        code: "integration_required",
        message: "Access Code validation endpoint is not configured.",
      },
    };
  }

  try {
    const response = await fetchWithTimeout(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accessCode }),
    });

    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        error: {
          code: "invalid_access_code",
          message: "The Access Code is invalid or expired.",
        },
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        error: {
          code: "server_error",
          message: `The Access Code endpoint responded with status ${response.status}.`,
        },
      };
    }

    return {
      ok: true,
      data: {
        status: "valid",
        message: "Access Code validated successfully.",
      },
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        ok: false,
        error: {
          code: "timeout",
          message: "Access Code validation timed out.",
        },
      };
    }

    return {
      ok: false,
      error: {
        code: "network_error",
        message: error instanceof Error ? error.message : "Network error.",
      },
    };
  }
}
