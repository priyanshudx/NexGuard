import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import { AppError } from './errorHandler';

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Unauthorized', 401));
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next(new AppError('Unauthorized', 401));
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return next(new AppError('Unauthorized', 401));
    }

    req.user = data.user;
    next();
  } catch (_error) {
    next(new AppError('Unauthorized', 401));
  }
};
