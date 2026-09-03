import { z } from 'zod';

export const ANALYSIS_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type AnalysisStatus = (typeof ANALYSIS_STATUS)[keyof typeof ANALYSIS_STATUS];

export const createAnalysisSchema = z.object({
  dataset_id: z.string().uuid({ message: 'Invalid dataset_id format' }),
  horizon: z
    .number({ invalid_type_error: 'horizon must be a number' })
    .int({ message: 'horizon must be an integer' })
    .positive({ message: 'horizon must be a positive integer greater than 0' })
    .default(5),
});

export type CreateAnalysisInput = z.infer<typeof createAnalysisSchema>;

export const analysisIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid analysis ID format' }),
});

export const getAnalysesQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, parseInt(val, 10) || 1) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10) || 10)) : 10)),
});
