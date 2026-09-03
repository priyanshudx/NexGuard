import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { AppError } from './errorHandler';

const storage = multer.memoryStorage();

const allowedMimeTypes = [
  'text/csv',
  'application/csv',
  'text/plain',
  'application/vnd.ms-excel',
  'text/x-csv',
  'application/octet-stream',
];

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const isCsvExt = file.originalname.toLowerCase().endsWith('.csv');
  const isCsvMime = allowedMimeTypes.includes(file.mimetype.toLowerCase());

  if (isCsvExt && isCsvMime) {
    cb(null, true);
  } else {
    cb(new AppError('Unsupported file format. Only CSV datasets are currently supported.', 400));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE_BYTES,
  },
  fileFilter,
}).single('file');

export const uploadDatasetFile = (req: Request, res: Response, next: NextFunction): void => {
  upload(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            new AppError(
              `File size exceeds maximum allowed limit of ${Math.round(env.MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB.`,
              400
            )
          );
        }
        return next(new AppError(`File upload error: ${err.message}`, 400));
      }
      return next(err);
    }
    next();
  });
};
