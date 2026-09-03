import { Request, Response, NextFunction } from 'express';
import { getHealthStatus } from '../services/health.service';
import { checkMLServiceHealth } from '../lib/ml-client';

export const getHealth = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const health = await getHealthStatus();
    res.status(200).json({
      data: health,
    });
  } catch (error) {
    next(error);
  }
};

export const getMLHealth = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const mlHealth = await checkMLServiceHealth();
    res.status(200).json({
      data: {
        mlService: mlHealth,
      },
    });
  } catch (error) {
    next(error);
  }
};
