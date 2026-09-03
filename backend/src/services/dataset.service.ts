import crypto from 'crypto';
import { supabase } from '../lib/supabase';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { AppError } from '../middleware/errorHandler';

export interface DatasetUploadResponse {
  id: string;
  filename: string;
  size: number;
  status: string;
  createdAt?: string;
}

export interface DatasetMetadataResponse {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

export const uploadDatasetService = async (
  userId: string,
  file: Express.Multer.File
): Promise<DatasetUploadResponse> => {
  const datasetId = crypto.randomUUID();
  const fileExt = file.originalname.split('.').pop() || 'csv';
  const storagePath = `${userId}/${datasetId}/original.${fileExt}`;

  // 1. Upload to Supabase Storage (Private Bucket)
  const { error: storageError } = await supabase.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (storageError) {
    logger.error('Storage upload failed:', storageError);
    throw new AppError('Failed to upload dataset to storage', 500);
  }

  // 2. Insert metadata into Database
  const { data, error: dbError } = await supabase
    .from('datasets')
    .insert({
      id: datasetId,
      user_id: userId,
      name: file.originalname,
      file_path: storagePath,
      file_size: file.size,
      mime_type: file.mimetype,
    })
    .select('id, name, file_size, created_at')
    .single();

  // 3. Cleanup on DB failure to avoid orphaned files
  if (dbError || !data) {
    logger.error('Database insert failed after storage upload:', dbError);
    try {
      await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).remove([storagePath]);
    } catch (cleanupErr) {
      logger.error('Failed to cleanup orphaned storage file:', cleanupErr);
    }
    throw new AppError('Failed to save dataset record', 500);
  }

  return {
    id: data.id,
    filename: data.name,
    size: Number(data.file_size),
    status: 'uploaded',
    createdAt: data.created_at,
  };
};

export const getUserDatasetsService = async (
  userId: string
): Promise<DatasetMetadataResponse[]> => {
  const { data, error } = await supabase
    .from('datasets')
    .select('id, name, file_size, mime_type, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Failed to fetch user datasets:', error);
    throw new AppError('Failed to retrieve datasets', 500);
  }

  return (data || []).map((row) => ({
    id: row.id,
    filename: row.name,
    size: Number(row.file_size),
    mimeType: row.mime_type,
    createdAt: row.created_at,
  }));
};

export const getUserDatasetByIdService = async (
  userId: string,
  datasetId: string
): Promise<DatasetMetadataResponse> => {
  const { data, error } = await supabase
    .from('datasets')
    .select('id, user_id, name, file_size, mime_type, created_at')
    .eq('id', datasetId)
    .single();

  if (error || !data) {
    throw new AppError('Dataset not found', 404);
  }

  // Prevent users from accessing another user's dataset
  if (data.user_id !== userId) {
    throw new AppError('Dataset not found', 404);
  }

  return {
    id: data.id,
    filename: data.name,
    size: Number(data.file_size),
    mimeType: data.mime_type,
    createdAt: data.created_at,
  };
};
