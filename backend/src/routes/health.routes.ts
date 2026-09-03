import { Router } from 'express';
import { getHealth, getMLHealth } from '../controllers/health.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public backend health check
router.get('/', getHealth);

// Protected ML service integration health check
router.get('/ml', authenticate, getMLHealth);

export default router;
