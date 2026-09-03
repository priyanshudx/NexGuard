import { Router } from 'express';
import {
  uploadDataset,
  getDatasets,
  getDatasetById,
} from '../controllers/dataset.controller';
import { authenticate } from '../middleware/auth.middleware';
import { uploadDatasetFile } from '../middleware/upload.middleware';

const router = Router();

// Protect all dataset routes with authentication
router.use(authenticate);

router.post('/', uploadDatasetFile, uploadDataset);
router.get('/', getDatasets);
router.get('/:id', getDatasetById);

export default router;
