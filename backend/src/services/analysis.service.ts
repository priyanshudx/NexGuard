import crypto from 'crypto';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { AppError } from '../middleware/errorHandler';
import { ANALYSIS_STATUS, CreateAnalysisInput } from '../schemas/analysis.schema';

export interface AnalysisResponse {
  id: string;
  datasetId: string;
  status: string;
  horizon: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedAnalysesResponse {
  analyses: AnalysisResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

const mapAnalysisRow = (row: any): AnalysisResponse => ({
  id: row.id,
  datasetId: row.dataset_id,
  status: row.status ? row.status.toUpperCase() : ANALYSIS_STATUS.PENDING,
  horizon: row.horizon !== undefined && row.horizon !== null ? Number(row.horizon) : (row.config?.horizon || 5),
  createdAt: row.created_at,
  updatedAt: row.updated_at || row.created_at,
});

export const createAnalysisService = async (
  userId: string,
  input: CreateAnalysisInput
): Promise<AnalysisResponse> => {
  // 1. Verify dataset exists and belongs to the authenticated user
  const { data: dataset, error: dsError } = await supabase
    .from('datasets')
    .select('id, user_id')
    .eq('id', input.dataset_id)
    .single();

  if (dsError || !dataset || dataset.user_id !== userId) {
    // Return 404 to avoid revealing another user's dataset existence
    throw new AppError('Dataset not found', 404);
  }

  // 2. Insert analysis record with PENDING status
  const analysisId = crypto.randomUUID();
  const now = new Date().toISOString();

  const payload: any = {
    id: analysisId,
    user_id: userId,
    dataset_id: input.dataset_id,
    horizon: input.horizon,
    config: { horizon: input.horizon },
    status: ANALYSIS_STATUS.PENDING,
    created_at: now,
    updated_at: now,
  };

  let { data, error: insertError } = await supabase
    .from('analyses')
    .insert(payload)
    .select()
    .single();

  // Fallback if top-level horizon or updated_at columns are not yet added to live DB table schema cache
  if (insertError && insertError.message.includes('schema cache')) {
    delete payload.horizon;
    delete payload.updated_at;
    const { data: fbData, error: fbError } = await supabase
      .from('analyses')
      .insert(payload)
      .select()
      .single();

    data = fbData;
    insertError = fbError;
  }

  if (insertError || !data) {
    logger.error('Database insert failed for analysis:', insertError);
    throw new AppError('Failed to create analysis record', 500);
  }

  return mapAnalysisRow(data);
};

export const getUserAnalysesService = async (
  userId: string,
  page = 1,
  limit = 10
): Promise<PaginatedAnalysesResponse> => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from('analyses')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    logger.error('Failed to fetch user analyses:', error);
    throw new AppError('Failed to retrieve analyses', 500);
  }

  return {
    analyses: (data || []).map(mapAnalysisRow),
    pagination: {
      page,
      limit,
      total: count || 0,
    },
  };
};

export const getUserAnalysisByIdService = async (
  userId: string,
  analysisId: string
): Promise<AnalysisResponse> => {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', analysisId)
    .single();

  if (error || !data || data.user_id !== userId) {
    throw new AppError('Analysis not found', 404);
  }

  return mapAnalysisRow(data);
};

// Helper status update functions for future ML pipeline integration
export const markAnalysisProcessing = async (analysisId: string) => {
  const now = new Date().toISOString();
  const updatePayload: any = { status: ANALYSIS_STATUS.PROCESSING, updated_at: now };

  let { data, error } = await supabase
    .from('analyses')
    .update(updatePayload)
    .eq('id', analysisId)
    .select()
    .single();

  if (error && error.message.includes('schema cache')) {
    delete updatePayload.updated_at;
    const { data: fbData, error: fbError } = await supabase
      .from('analyses')
      .update(updatePayload)
      .eq('id', analysisId)
      .select()
      .single();
    data = fbData;
    error = fbError;
  }

  if (error) throw new AppError('Failed to mark analysis as PROCESSING', 500);
  return data;
};

export const markAnalysisCompleted = async (analysisId: string) => {
  const now = new Date().toISOString();
  const updatePayload: any = { status: ANALYSIS_STATUS.COMPLETED, completed_at: now, updated_at: now };

  let { data, error } = await supabase
    .from('analyses')
    .update(updatePayload)
    .eq('id', analysisId)
    .select()
    .single();

  if (error && error.message.includes('schema cache')) {
    delete updatePayload.updated_at;
    const { data: fbData, error: fbError } = await supabase
      .from('analyses')
      .update(updatePayload)
      .eq('id', analysisId)
      .select()
      .single();
    data = fbData;
    error = fbError;
  }

  if (error) throw new AppError('Failed to mark analysis as COMPLETED', 500);
  return data;
};

export const markAnalysisFailed = async (analysisId: string) => {
  const now = new Date().toISOString();
  const updatePayload: any = { status: ANALYSIS_STATUS.FAILED, updated_at: now };

  let { data, error } = await supabase
    .from('analyses')
    .update(updatePayload)
    .eq('id', analysisId)
    .select()
    .single();

  if (error && error.message.includes('schema cache')) {
    delete updatePayload.updated_at;
    const { data: fbData, error: fbError } = await supabase
      .from('analyses')
      .update(updatePayload)
      .eq('id', analysisId)
      .select()
      .single();
    data = fbData;
    error = fbError;
  }

  if (error) throw new AppError('Failed to mark analysis as FAILED', 500);
  return data;
};
