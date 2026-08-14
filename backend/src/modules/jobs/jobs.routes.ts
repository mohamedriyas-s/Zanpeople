import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth';
import {
  listJobs,
  createJob,
  getJob,
  updateJobStatus,
  getKanbanBoard,
  applyToJob,
} from './jobs.controller';

const router = Router();

router.use(authenticate);

router.get('/', listJobs);
router.post('/', requireAdmin, createJob);
router.get('/:id', getJob);
router.patch('/:id/status', requireAdmin, updateJobStatus);
router.get('/:id/board', getKanbanBoard);
router.post('/:id/apply', applyToJob);

export { router as jobsRoutes };
