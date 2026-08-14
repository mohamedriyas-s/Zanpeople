import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth';
import {
  listPipelines,
  createPipeline,
  getPipeline,
  updatePipeline,
  deletePipeline,
  addStage,
  updateStage,
  deleteStage,
  reorderStages,
} from './pipelines.controller';

const router = Router();

router.use(authenticate);

router.get('/', listPipelines);
router.post('/', requireAdmin, createPipeline);
router.get('/:id', getPipeline);
router.put('/:id', requireAdmin, updatePipeline);
router.delete('/:id', requireAdmin, deletePipeline);
router.post('/:id/stages', requireAdmin, addStage);
router.put('/:id/stages/reorder', requireAdmin, reorderStages);
router.put('/:id/stages/:stageId', requireAdmin, updateStage);
router.delete('/:id/stages/:stageId', requireAdmin, deleteStage);

export { router as pipelineRoutes };
