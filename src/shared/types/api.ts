export interface PredictRequest {
  url: string;
}

export interface PredictApiResult {
  is_malicious: boolean;
  accurate: number;
  suggested: string;
}

export interface PredictResponse {
  result: PredictApiResult;
  message?: string;
  status?: string;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export interface ApiConfig {
  apiEndpoint: string;
  apiKey: string;
}
