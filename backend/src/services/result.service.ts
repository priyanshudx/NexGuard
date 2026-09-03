import { supabase } from '../lib/supabase';
import { AppError } from '../middleware/errorHandler';
import { ForecastStep, Explanation } from '../types/api.types';

export const getAnalysisForecastService = async (
  userId: string,
  analysisId: string
): Promise<{ analysisId: string; forecast: ForecastStep[] }> => {
  // 1. Verify analysis exists and belongs to user
  const { data: analysis, error: analysisErr } = await supabase
    .from('analyses')
    .select('id, user_id')
    .eq('id', analysisId)
    .single();

  if (analysisErr || !analysis || analysis.user_id !== userId) {
    throw new AppError('Analysis not found', 404);
  }

  // 2. Fetch forecast steps
  const { data: steps, error: stepsErr } = await supabase
    .from('forecast_steps')
    .select('step_number, timestamp, forecast_value, lower_bound, upper_bound')
    .eq('analysis_id', analysisId)
    .order('step_number', { ascending: true });

  if (stepsErr) {
    throw new AppError('Failed to retrieve forecast data', 500);
  }

  const forecast: ForecastStep[] = (steps || []).map((s) => ({
    stepNumber: s.step_number,
    timestamp: s.timestamp,
    forecastValue: Number(s.forecast_value),
    lowerBound: s.lower_bound !== null ? Number(s.lower_bound) : null,
    upperBound: s.upper_bound !== null ? Number(s.upper_bound) : null,
  }));

  return {
    analysisId,
    forecast,
  };
};

export const getAnalysisExplanationService = async (
  userId: string,
  analysisId: string
): Promise<{ analysisId: string; explanation: Explanation | null }> => {
  // 1. Verify analysis exists and belongs to user
  const { data: analysis, error: analysisErr } = await supabase
    .from('analyses')
    .select('id, user_id')
    .eq('id', analysisId)
    .single();

  if (analysisErr || !analysis || analysis.user_id !== userId) {
    throw new AppError('Analysis not found', 404);
  }

  // 2. Fetch explanation record
  const { data: expl, error: explErr } = await supabase
    .from('explanations')
    .select('id, summary, insights, feature_importance')
    .eq('analysis_id', analysisId)
    .single();

  if (explErr || !expl) {
    return {
      analysisId,
      explanation: null,
    };
  }

  return {
    analysisId,
    explanation: {
      summary: expl.summary,
      insights: Array.isArray(expl.insights) ? expl.insights : [],
      featureImportance: expl.feature_importance || {},
    },
  };
};
