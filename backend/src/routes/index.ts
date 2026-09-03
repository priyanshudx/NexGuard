import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import datasetRoutes from './dataset.routes';
import analysisRoutes from './analysis.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/datasets', datasetRoutes);
router.use('/analyses', analysisRoutes);

export default router;

