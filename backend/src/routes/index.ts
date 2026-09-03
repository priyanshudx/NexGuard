import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import datasetRoutes from './dataset.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/datasets', datasetRoutes);

export default router;

