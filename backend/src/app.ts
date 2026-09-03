import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, AppError } from './middleware/errorHandler';
import apiRouter from './routes';

const app = express();

// Security Headers via Helmet
app.use(helmet());

// Strict CORS Configuration
const allowedOrigins = [env.FRONTEND_URL, env.CORS_ORIGIN].filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new AppError('Not allowed by CORS', 403, 'FORBIDDEN'));
      }
    },
    credentials: true,
  })
);

// Body Parsers with Strict Size Limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request Logger
app.use(requestLogger);

// In-Process Rate Limiter for API Routes
const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests, please try again later.',
    },
  },
});

app.use('/api/v1', apiLimiter, apiRouter);

// 404 Route Handler
app.use((_req, _res, next) => {
  next(new AppError('Route not found', 404, 'NOT_FOUND'));
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
