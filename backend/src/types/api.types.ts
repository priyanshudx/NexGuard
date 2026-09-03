export interface User {
  id: string;
  email: string | undefined;
  role: string | undefined;
  createdAt: string;
}

export interface Dataset {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

export type AnalysisStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface Analysis {
  id: string;
  datasetId: string;
  status: AnalysisStatus;
  horizon: number;
  createdAt: string;
  updatedAt: string;
  predictedStage?: string;
}

export interface ForecastStep {
  stepNumber: number;
  timestamp?: string | null;
  forecastValue: number;
  lowerBound?: number | null;
  upperBound?: number | null;
}

export interface Explanation {
  summary: string;
  insights: string[];
  featureImportance: Record<string, number>;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedApiResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
