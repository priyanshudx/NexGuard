import { env } from '../config/env';
import { logger } from './logger';
import { AppError } from '../middleware/errorHandler';
import {
  mlPredictRequestSchema,
  mlPredictResponseSchema,
  mlHealthResponseSchema,
  MLPredictRequest,
  MLPredictResponse,
} from '../schemas/ml.schema';

export interface MLHealthStatus {
  reachable: boolean;
  status: string;
  url: string;
  durationMs?: number;
}

export const sendPredictRequest = async (
  payload: MLPredictRequest
): Promise<MLPredictResponse> => {
  // Validate request payload
  const validatedPayload = mlPredictRequestSchema.parse(payload);

  const startTime = Date.now();
  logger.info(`[ML Client] Request started for analysis_id: ${validatedPayload.analysis_id}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.ML_SERVICE_TIMEOUT_MS);

  try {
    const response = await fetch(`${env.ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(validatedPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      logger.error(
        `[ML Client] Non-2xx response from ML service for analysis_id ${validatedPayload.analysis_id}. Status: ${response.status}`
      );
      throw new AppError('ML service returned an error response', 502);
    }

    const rawData = await response.json();
    const parseResult = mlPredictResponseSchema.safeParse(rawData);

    if (!parseResult.success) {
      logger.error(
        `[ML Client] Malformed response schema from ML service for analysis_id ${validatedPayload.analysis_id}:`,
        parseResult.error.format()
      );
      throw new AppError('ML service returned invalid response format', 502);
    }

    logger.info(
      `[ML Client] Request completed for analysis_id ${validatedPayload.analysis_id} in ${durationMs}ms`
    );

    return parseResult.data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;

    if (error instanceof AppError) {
      throw error;
    }

    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      logger.error(
        `[ML Client] Timeout after ${env.ML_SERVICE_TIMEOUT_MS}ms for analysis_id ${validatedPayload.analysis_id}`
      );
      throw new AppError('ML service request timed out', 504);
    }

    logger.error(
      `[ML Client] Connection failure to ML service (${env.ML_SERVICE_URL}) for analysis_id ${validatedPayload.analysis_id}: ${error.message}`
    );
    throw new AppError('ML service unavailable', 503);
  }
};

export const checkMLServiceHealth = async (): Promise<MLHealthStatus> => {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(`${env.ML_SERVICE_URL}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      return {
        reachable: false,
        status: `http_error_${response.status}`,
        url: env.ML_SERVICE_URL,
        durationMs,
      };
    }

    const rawData = await response.json();
    const parseResult = mlHealthResponseSchema.safeParse(rawData);

    return {
      reachable: true,
      status: parseResult.success ? parseResult.data.status : 'ok',
      url: env.ML_SERVICE_URL,
      durationMs,
    };
  } catch (_err) {
    clearTimeout(timeoutId);
    return {
      reachable: false,
      status: 'unavailable',
      url: env.ML_SERVICE_URL,
    };
  }
};
