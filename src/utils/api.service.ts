import type { PredictRequest, PredictResponse, ScanResult, ApiConfig } from './types';
import { DEFAULT_API_ENDPOINT } from './constants';

export async function checkUrlWithAPI(url: string, config: ApiConfig): Promise<ScanResult> {
  const endpoint = config.apiEndpoint || DEFAULT_API_ENDPOINT;

  console.log(`[SEMD] Checking with API: ${url}`);

  try {
    const requestBody: PredictRequest = { url };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey || '',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data: PredictResponse = await response.json();

    const result: ScanResult = {
      url,
      isMalicious: data.result?.is_malicious ?? false,
      accuracy: data.result?.accurate ?? 0,
      suggested: data.result?.suggested ?? 'unknown',
      timestamp: new Date().toISOString(),
    };

    console.log('[SEMD] API result:', result);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SEMD] Failed to check URL:', errorMessage);

    return {
      url,
      isMalicious: true,
      accuracy: 80,
      suggested: 'error',
      timestamp: new Date().toISOString(),
      error: errorMessage,
    };
  }
}
