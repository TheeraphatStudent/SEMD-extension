import { EXCLUDED_PROTOCOLS } from "./constants";

export function normalizeUrl(input: string): string {
  try {
    const url = new URL(input);
    url.hash = "";
    return url.toString();
  } catch {
    return input.trim();
  }
}

export function getHostname(input: string): string {
  try {
    return new URL(input).hostname;
  } catch {
    return "";
  }
}

export function isExcludedUrl(input: string): boolean {
  try {
    const protocol = new URL(input).protocol;
    return EXCLUDED_PROTOCOLS.includes(protocol as (typeof EXCLUDED_PROTOCOLS)[number]);
  } catch {
    return true;
  }
}

export function isHttpUrl(input: string): boolean {
  try {
    const protocol = new URL(input).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export function maskAccessCode(code?: string): string {
  if (!code) return "";
  if (code.length <= 4) return "•".repeat(code.length);
  return `${"•".repeat(Math.max(code.length - 4, 2))}${code.slice(-4)}`;
}

export function formatConfidence(value?: number): string | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  const normalized = value > 1 ? value : value * 100;
  return `${Math.round(normalized)}%`;
}
