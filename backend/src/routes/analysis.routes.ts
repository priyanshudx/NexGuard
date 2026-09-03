import { Router } from 'express';
import {
  createAnalysis,
  getAnalyses,
  getAnalysisById,
} from '../controllers/analysis.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Protect all analysis routes with authentication
router.use(authenticate);

router.post('/', createAnalysis);
router.get('/', getAnalyses);
router.get('/:id', getAnalysisById);

export default router;
