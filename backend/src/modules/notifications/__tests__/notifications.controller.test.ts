/**
 * Unit Tests: Notifications Module
 * Tests notification listing, counts, and reading functionality.
 * Prisma is fully mocked.
 */

import { Request, Response, NextFunction } from 'express';

// ─── Mock Dependencies ──────────────────────────────────────────────────────

jest.mock('../../../config/database', () => ({
  prisma: {
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../notifications.controller';
import { prisma } from '../../../config/database';

// ─── Helpers ────────────────────────────────────────────────────────────────

const mockRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

const authReq = (overrides = {}) =>
  ({
    user: { id: 'user-uuid-1', role: 'ADMIN' },
    body: {},
    query: {},
    params: {},
    get: jest.fn(),
    ...overrides,
  } as any);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Notifications Module', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('listNotifications()', () => {
    it('should return paginated list of notifications', async () => {
      (prisma.notification.findMany as jest.Mock).mockResolvedValue([{ id: 'n1' }]);
      (prisma.notification.count as jest.Mock).mockResolvedValue(1);

      const req = authReq({ query: { page: '1', limit: '10' } });
      const res = mockRes();
      await listNotifications(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.items).toHaveLength(1);
    });
  });

  describe('getUnreadCount()', () => {
    it('should return count of unread notifications', async () => {
      (prisma.notification.count as jest.Mock).mockResolvedValue(5);

      const req = authReq();
      const res = mockRes();
      await getUnreadCount(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.unreadCount).toBe(5);
    });
  });

  describe('markAsRead()', () => {
    it('should return 404 if notification not found', async () => {
      (prisma.notification.findUnique as jest.Mock).mockResolvedValue(null);

      const req = authReq({ params: { id: 'n1' } });
      const res = mockRes();
      await markAsRead(req, res, mockNext);

      expect((mockNext as jest.Mock).mock.calls[0][0].statusCode).toBe(404);
    });

    it('should mark notification as read', async () => {
      (prisma.notification.findUnique as jest.Mock).mockResolvedValue({ id: 'n1' });
      (prisma.notification.update as jest.Mock).mockResolvedValue({ id: 'n1', isRead: true });

      const req = authReq({ params: { id: 'n1' } });
      const res = mockRes();
      await markAsRead(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'n1' },
        data: { isRead: true }
      });
    });
  });

  describe('markAllAsRead()', () => {
    it('should mark all unread notifications as read', async () => {
      (prisma.notification.findMany as jest.Mock).mockResolvedValue([{ id: 'n1' }, { id: 'n2' }]);
      (prisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      const req = authReq();
      const res = mockRes();
      await markAllAsRead(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['n1', 'n2'] } },
        data: { isRead: true }
      });
    });
  });
});
