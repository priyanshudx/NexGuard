import { z } from 'zod';

export const mlPredictRequestSchema = z.object({
  analysis_id: z.string().uuid({ message: 'analysis_id must be a valid UUID' }),
  dataset_reference: z.string().min(1, { message: 'dataset_reference is required' }),
  horizon: z.number().int().positive().default(5),
});

export type MLPredictRequest = z.infer<typeof mlPredictRequestSchema>;

export const mlForecastStepSchema = z.object({
  step_number: z.number().int(),
  timestamp: z.string().optional(),
  forecast_value: z.number(),
  lower_bound: z.number().optional(),
  upper_bound: z.number().optional(),
});

export const mlPredictResponseSchema = z.object({
  analysis_id: z.string().uuid(),
  predicted_stage: z.string().optional().default('NORMAL'),
  forecast: z.array(mlForecastStepSchema).optional().default([]),
  explanation: z.array(z.string()).optional().default([]),
});

export type MLPredictResponse = z.infer<typeof mlPredictResponseSchema>;

export const mlHealthResponseSchema = z.object({
  status: z.string(),
});

export type MLHealthResponse = z.infer<typeof mlHealthResponseSchema>;
