import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { listNotifications, getUnreadCount, markAsRead, markAllAsRead } from './notifications.controller';

const router = Router();

router.use(authenticate);

router.get('/', listNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllAsRead);

export { router as notificationRoutes };
