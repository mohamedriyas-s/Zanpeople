import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';
import { AuthenticatedRequest } from '../../middleware/auth';

// ✨ List Notifications ✨

export async function listNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const whereClause = userId ? { NOT: { actorId: userId } } : {};

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where: whereClause }),
    ]);

    sendPaginated(res, items, total, page, limit);
  } catch (error) {
    next(error);
  }
}

// ✨ Get Unread Count ✨

export async function getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    const whereClause = userId ? { isRead: false, NOT: { actorId: userId } } : { isRead: false };
    
    const count = await prisma.notification.count({ where: whereClause });
    sendSuccess(res, { unreadCount: count });
  } catch (error) {
    next(error);
  }
}

// ✨ Mark Single as Read ✨

export async function markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notification) {
      throw new AppError(404, 'NOT_FOUND', 'Notification not found');
    }

    await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });

    sendSuccess(res, { message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
}

// ✨ Mark All as Read ✨

export async function markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    const whereClause = userId ? { isRead: false, NOT: { actorId: userId } } : { isRead: false };

    // Find all unread notifications meant for this user
    const notificationsToMark = await prisma.notification.findMany({
      where: whereClause,
      select: { id: true }
    });

    if (notificationsToMark.length > 0) {
      await prisma.notification.updateMany({
        where: { id: { in: notificationsToMark.map(n => n.id) } },
        data: { isRead: true },
      });
    }

    sendSuccess(res, { message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
}
