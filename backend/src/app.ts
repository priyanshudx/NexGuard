import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, AppError } from './middleware/errorHandler';
import apiRouter from './routes';

const app = express();

// Security & Utility Middlewares
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());
app.use(requestLogger);

// API Routes
app.use('/api/v1', apiRouter);

// 404 Handler
app.use((_req, _res, next) => {
  next(new AppError('Route not found', 404));
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
