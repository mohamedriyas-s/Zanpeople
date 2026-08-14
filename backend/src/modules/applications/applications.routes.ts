import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import {
  getApplication,
  advanceStage,
  rejectApplication,
  assignTask,
  evaluateTask,
  scheduleInterview,
  evaluateInterview,
} from './applications.controller';

const router = Router();

router.use(authenticate);

router.get('/:id', getApplication);
router.post('/:id/advance', advanceStage);
router.post('/:id/reject', rejectApplication);

router.post('/:appId/stages/:spId/task', assignTask);
router.put('/:appId/stages/:spId/task', evaluateTask);

router.post('/:appId/stages/:spId/interview', scheduleInterview);
router.put('/:appId/stages/:spId/interview/:intId', evaluateInterview);

export { router as applicationRoutes };
