import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { getStats, getRecentApplications, getUpcomingInterviews, getRecentEmployees } from './dashboard.controller';

const router = Router();

router.use(authenticate);

router.get('/stats', getStats);
router.get('/recent-applications', getRecentApplications);
router.get('/upcoming-interviews', getUpcomingInterviews);
router.get('/recent-employees', getRecentEmployees);

export { router as dashboardRoutes };
