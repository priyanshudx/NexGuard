import { Request, Response, NextFunction } from 'express';
import {
  uploadDatasetService,
  getUserDatasetsService,
  getUserDatasetByIdService,
} from '../services/dataset.service';
import { datasetIdParamSchema } from '../schemas/dataset.schema';
import { AppError } from '../middleware/errorHandler';

export const uploadDataset = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }

    if (!req.file) {
      return next(new AppError('No dataset file provided', 400));
    }

    const result = await uploadDatasetService(req.user.id, req.file);

    res.status(201).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getDatasets = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }

    const datasets = await getUserDatasetsService(req.user.id);

    res.status(200).json({
      status: 'success',
      data: {
        datasets,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getDatasetById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }

    const parseResult = datasetIdParamSchema.safeParse(req.params);
    if (!parseResult.success) {
      return next(new AppError('Invalid dataset ID format', 400));
    }

    const dataset = await getUserDatasetByIdService(req.user.id, parseResult.data.id);

    res.status(200).json({
      status: 'success',
      data: {
        dataset,
      },
    });
  } catch (error) {
    next(error);
  }
};
