import { Request, Response, NextFunction } from 'express';
import {
  getAnalysisForecastService,
  getAnalysisExplanationService,
} from '../services/result.service';
import { analysisIdParamSchema } from '../schemas/analysis.schema';
import { AppError } from '../middleware/errorHandler';

export const getAnalysisForecast = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
    }

    const parseResult = analysisIdParamSchema.safeParse(req.params);
    if (!parseResult.success) {
      return next(new AppError('Invalid analysis ID format', 400, 'VALIDATION_ERROR'));
    }

    const result = await getAnalysisForecastService(req.user.id, parseResult.data.id);

    res.status(200).json({
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getAnalysisExplanation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
    }

    const parseResult = analysisIdParamSchema.safeParse(req.params);
    if (!parseResult.success) {
      return next(new AppError('Invalid analysis ID format', 400, 'VALIDATION_ERROR'));
    }

    const result = await getAnalysisExplanationService(req.user.id, parseResult.data.id);

    res.status(200).json({
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
