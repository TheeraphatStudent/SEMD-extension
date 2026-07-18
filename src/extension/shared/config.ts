export type RuntimeConfig = {
  defaultApiBaseUrl?: string;
  predictPath: string;
  accessCodeValidationPath?: string;
};

declare const SEMD_RUNTIME_CONFIG: RuntimeConfig | undefined;

export function getRuntimeConfig(): RuntimeConfig {
  if (typeof SEMD_RUNTIME_CONFIG !== "undefined") {
    return SEMD_RUNTIME_CONFIG;
  }

  return {
    defaultApiBaseUrl: undefined,
    predictPath: "/api/v1/predict/predict",
    accessCodeValidationPath: undefined,
  };
}
