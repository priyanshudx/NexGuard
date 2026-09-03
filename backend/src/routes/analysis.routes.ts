import { Router } from 'express';
import {
  createAnalysis,
  getAnalyses,
  getAnalysisById,
  runAnalysis,
} from '../controllers/analysis.controller';
import {
  getAnalysisForecast,
  getAnalysisExplanation,
} from '../controllers/result.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Protect all analysis routes with authentication
router.use(authenticate);

router.post('/', createAnalysis);
router.get('/', getAnalyses);
router.get('/:id', getAnalysisById);
router.post('/:id/run', runAnalysis);
router.get('/:id/forecast', getAnalysisForecast);
router.get('/:id/explanation', getAnalysisExplanation);

export default router;
