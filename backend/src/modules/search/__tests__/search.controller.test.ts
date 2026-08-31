/**
 * Unit Tests: Search Module
 * Tests global search functionality.
 * Prisma is fully mocked.
 */

import { Request, Response, NextFunction } from 'express';

// ─── Mock Dependencies ──────────────────────────────────────────────────────

jest.mock('../../../config/database', () => ({
  prisma: {
    candidate: {
      findMany: jest.fn(),
    },
    employee: {
      findMany: jest.fn(),
    },
  },
}));

import { globalSearch } from '../search.controller';
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

describe('Search Module', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('globalSearch()', () => {
    it('should return empty results if query is empty', async () => {
      const req = reqObj({ query: { q: '   ' } });
      const res = mockRes();
      await globalSearch(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.candidates).toHaveLength(0);
      expect(jsonCall.data.employees).toHaveLength(0);
      expect(prisma.candidate.findMany).not.toHaveBeenCalled();
    });

    it('should perform search across candidates and employees', async () => {
      (prisma.candidate.findMany as jest.Mock).mockResolvedValue([{ id: 'c1' }]);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([{ id: 'e1' }]);

      const req = reqObj({ query: { q: 'john' } });
      const res = mockRes();
      await globalSearch(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      
      expect(prisma.candidate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ OR: expect.any(Array) })
        })
      );
      
      expect(prisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ OR: expect.any(Array) })
        })
      );

      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.candidates).toHaveLength(1);
      expect(jsonCall.data.employees).toHaveLength(1);
    });

    it('should include status query if valid status is searched', async () => {
      (prisma.candidate.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([]);

      const req = reqObj({ query: { q: 'selected' } });
      const res = mockRes();
      await globalSearch(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      
      const candidateCall = (prisma.candidate.findMany as jest.Mock).mock.calls[0][0];
      const orClauses = candidateCall.where.OR;
      const statusClause = orClauses.find((c: any) => c.status);
      
      expect(statusClause).toBeDefined();
      expect(statusClause.status.equals).toBe('SELECTED');
    });
  });
});
