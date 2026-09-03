import { Request, Response, NextFunction } from 'express';
import {
  createAnalysisService,
  getUserAnalysesService,
  getUserAnalysisByIdService,
  startAnalysisExecutionService,
} from '../services/analysis.service';
import {
  createAnalysisSchema,
  analysisIdParamSchema,
  getAnalysesQuerySchema,
} from '../schemas/analysis.schema';
import { AppError } from '../middleware/errorHandler';

export const createAnalysis = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }

    const parseResult = createAnalysisSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return next(new AppError(issue?.message || 'Invalid request body', 400));
    }

    const analysis = await createAnalysisService(req.user.id, parseResult.data);

    res.status(201).json({
      status: 'success',
      data: {
        analysis,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAnalyses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }

    const queryResult = getAnalysesQuerySchema.safeParse(req.query);
    const page = queryResult.success ? queryResult.data.page : 1;
    const limit = queryResult.success ? queryResult.data.limit : 10;

    const result = await getUserAnalysesService(req.user.id, page, limit);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getAnalysisById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }

    const parseResult = analysisIdParamSchema.safeParse(req.params);
    if (!parseResult.success) {
      return next(new AppError('Invalid analysis ID format', 400));
    }

    const analysis = await getUserAnalysisByIdService(req.user.id, parseResult.data.id);

    res.status(200).json({
      status: 'success',
      data: {
        analysis,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const runAnalysis = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }

    const parseResult = analysisIdParamSchema.safeParse(req.params);
    if (!parseResult.success) {
      return next(new AppError('Invalid analysis ID format', 400));
    }

    const analysis = await startAnalysisExecutionService(req.user.id, parseResult.data.id);

    res.status(200).json({
      status: 'success',
      data: {
        analysis,
      },
    });
  } catch (error) {
    next(error);
  }
};
