/**
 * Unit Tests: Dashboard Module
 * Tests dashboard stats and recent data endpoints.
 * Prisma is fully mocked.
 */

import { Request, Response, NextFunction } from 'express';

// ─── Mock Dependencies ──────────────────────────────────────────────────────

jest.mock('../../../config/database', () => ({
  prisma: {
    candidate: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    employee: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import {
  getStats,
  getRecentApplications,
  getUpcomingInterviews,
  getRecentEmployees,
} from '../dashboard.controller';
import { prisma } from '../../../config/database';

// ─── Helpers ────────────────────────────────────────────────────────────────

const mockRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

const reqObj = (overrides = {}) =>
  ({
    body: {},
    query: {},
    params: {},
    get: jest.fn(),
    ...overrides,
  } as any);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Dashboard Module', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getStats()', () => {
    it('should return aggregated stats', async () => {
      (prisma.candidate.count as jest.Mock).mockResolvedValue(5);
      (prisma.employee.count as jest.Mock).mockResolvedValue(10);

      const req = reqObj();
      const res = mockRes();
      await getStats(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.totalCandidates).toBe(5);
      expect(jsonCall.data.totalEmployees).toBe(10);
      expect(prisma.candidate.count).toHaveBeenCalledTimes(7); // 7 candidate status queries
      expect(prisma.employee.count).toHaveBeenCalledTimes(1);
    });
  });

  describe('getRecentApplications()', () => {
    it('should return 5 recent applications', async () => {
      (prisma.candidate.findMany as jest.Mock).mockResolvedValue([{ id: 'c1' }]);

      const req = reqObj();
      const res = mockRes();
      await getRecentApplications(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(prisma.candidate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5, orderBy: { createdAt: 'desc' } })
      );
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data).toHaveLength(1);
    });
  });

  describe('getUpcomingInterviews()', () => {
    it('should return upcoming interviews', async () => {
      (prisma.candidate.findMany as jest.Mock).mockResolvedValue([{ id: 'c1' }]);

      const req = reqObj();
      const res = mockRes();
      await getUpcomingInterviews(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(prisma.candidate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5, orderBy: { interviewDate: 'asc' } })
      );
    });
  });

  describe('getRecentEmployees()', () => {
    it('should return recent employees', async () => {
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([{ id: 'e1' }]);

      const req = reqObj();
      const res = mockRes();
      await getRecentEmployees(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(prisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5, orderBy: { joiningDate: 'desc' } })
      );
    });
  });
});
