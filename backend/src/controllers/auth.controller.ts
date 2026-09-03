import { Request, Response, NextFunction } from 'express';
import { getAuthenticatedUserInfo } from '../services/auth.service';
import { AppError } from '../middleware/errorHandler';

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }

    const userInfo = getAuthenticatedUserInfo(req.user);
    res.status(200).json({
      data: {
        user: userInfo,
      },
    });
  } catch (error) {
    next(error);
  }
};
