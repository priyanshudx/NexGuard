import { z } from 'zod';

export const datasetIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid dataset ID format' }),
});

export type DatasetIdParam = z.infer<typeof datasetIdParamSchema>;
