/**
 * Unit Tests: Applications Module
 * Tests application lifecycle endpoints.
 * Prisma is fully mocked.
 */

import { Request, Response, NextFunction } from 'express';

// ─── Mock Dependencies ──────────────────────────────────────────────────────

jest.mock('../../../config/database', () => ({
  prisma: {
    candidateApplication: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    stageProgress: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    candidate: {
      update: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    taskAssignment: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    interviewRound: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    employee: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(async (ops) => {
      if (typeof ops === 'function') {
        const tx = {
          stageProgress: { create: jest.fn(), update: jest.fn() },
          candidateApplication: { update: jest.fn() },
          candidate: { update: jest.fn() },
          notification: { create: jest.fn() },
        };
        return ops(tx);
      }
      return Promise.all(Array.isArray(ops) ? ops : [ops]);
    }),
  },
}));

jest.mock('../../../utils/email', () => ({
  sendNotificationEmail: jest.fn().mockResolvedValue(true),
}));

// ─── Import after mocks ─────────────────────────────────────────────────────

import {
  getApplication,
  advanceStage,
  rejectApplication,
  assignTask,
  evaluateTask,
  scheduleInterview,
  evaluateInterview,
} from '../applications.controller';
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

// ─── Test Data ────────────────────────────────────────────────────────────────

const MOCK_APP = {
  id: 'app-uuid-1',
  candidateId: 'cand-1',
  jobOpeningId: 'job-1',
  status: 'IN_PIPELINE',
  currentStageId: 'stage-1',
  candidate: { id: 'cand-1', name: 'John Doe', email: 'john@example.com' },
  jobOpening: {
    template: {
      stages: [
        { id: 'stage-1', name: 'Applied', stageType: 'APPLIED', stageOrder: 1 },
        { id: 'stage-2', name: 'Interview', stageType: 'INTERVIEW', stageOrder: 2 },
      ]
    }
  }
};

const MOCK_SP = {
  id: 'sp-uuid-1',
  applicationId: 'app-uuid-1',
  stageId: 'stage-2',
  status: 'IN_PROGRESS',
  stage: { id: 'stage-2', stageType: 'TASK' },
  application: MOCK_APP
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Applications Module', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getApplication()', () => {
    it('should return 404 if application not found', async () => {
      (prisma.candidateApplication.findUnique as jest.Mock).mockResolvedValue(null);
      const req = authReq({ params: { id: 'app-uuid-1' } });
      const res = mockRes();
      await getApplication(req, res, mockNext);
      const err = (mockNext as jest.Mock).mock.calls[0][0];
      expect(err.statusCode).toBe(404);
    });

    it('should return application successfully', async () => {
      (prisma.candidateApplication.findUnique as jest.Mock).mockResolvedValue(MOCK_APP);
      const req = authReq({ params: { id: 'app-uuid-1' } });
      const res = mockRes();
      await getApplication(req, res, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.id).toBe('app-uuid-1');
    });
  });

  describe('advanceStage()', () => {
    it('should return 404 if application not found', async () => {
      (prisma.candidateApplication.findUnique as jest.Mock).mockResolvedValue(null);
      const req = authReq({ params: { id: 'app-1' }, body: {} });
      const res = mockRes();
      await advanceStage(req, res, mockNext);
      expect((mockNext as jest.Mock).mock.calls[0][0].statusCode).toBe(404);
    });

    it('should advance to next stage successfully', async () => {
      (prisma.candidateApplication.findUnique as jest.Mock).mockResolvedValue(MOCK_APP);
      const req = authReq({ params: { id: 'app-1' }, body: { remarks: 'Good' } });
      const res = mockRes();
      await advanceStage(req, res, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.message).toContain('Advanced to stage');
    });

    it('should select candidate if it is the last stage', async () => {
      const lastStageApp = {
        ...MOCK_APP,
        currentStageId: 'stage-2' // Last stage in the mock template
      };
      (prisma.candidateApplication.findUnique as jest.Mock).mockResolvedValue(lastStageApp);
      const req = authReq({ params: { id: 'app-1' }, body: {} });
      const res = mockRes();
      await advanceStage(req, res, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.message).toContain('Application completed and candidate selected');
    });
  });

  describe('rejectApplication()', () => {
    it('should reject application successfully', async () => {
      (prisma.candidateApplication.findUnique as jest.Mock).mockResolvedValue(MOCK_APP);
      const req = authReq({ params: { id: 'app-1' }, body: { remarks: 'Not a fit' } });
      const res = mockRes();
      await rejectApplication(req, res, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.message).toBe('Application rejected');
    });
  });

  describe('assignTask()', () => {
    it('should return 400 for invalid input', async () => {
      const req = authReq({ params: { appId: 'a1', spId: 's1' }, body: {} });
      const res = mockRes();
      await assignTask(req, res, mockNext);
      expect((mockNext as jest.Mock).mock.calls[0][0].statusCode).toBe(400);
    });

    it('should create task successfully', async () => {
      (prisma.stageProgress.findUnique as jest.Mock).mockResolvedValue(MOCK_SP);
      (prisma.taskAssignment.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.taskAssignment.create as jest.Mock).mockResolvedValue({ id: 'task-1' });

      const req = authReq({ 
        params: { appId: 'a1', spId: 's1' }, 
        body: { title: 'Code test' } 
      });
      const res = mockRes();
      await assignTask(req, res, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.id).toBe('task-1');
    });
  });

  describe('evaluateTask()', () => {
    it('should evaluate task successfully', async () => {
      (prisma.taskAssignment.findUnique as jest.Mock).mockResolvedValue({ id: 'task-1' });
      (prisma.taskAssignment.update as jest.Mock).mockResolvedValue({ id: 'task-1', score: 4 });

      const req = authReq({ 
        params: { spId: 's1' }, 
        body: { score: 4, evaluatorRemarks: 'Good' } 
      });
      const res = mockRes();
      await evaluateTask(req, res, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.score).toBe(4);
    });
  });

  describe('scheduleInterview()', () => {
    it('should schedule interview successfully', async () => {
      const interviewSp = { ...MOCK_SP, stage: { ...MOCK_SP.stage, stageType: 'INTERVIEW' } };
      (prisma.stageProgress.findUnique as jest.Mock).mockResolvedValue(interviewSp);
      (prisma.employee.findUnique as jest.Mock).mockResolvedValue({ id: 'emp-1', email: 'emp@example.com' });
      (prisma.interviewRound.create as jest.Mock).mockResolvedValue({ id: 'int-1' });

      const req = authReq({ 
        params: { appId: 'a1', spId: 's1' }, 
        body: { interviewerId: '00000000-0000-0000-0000-000000000000', scheduledAt: new Date().toISOString() } 
      });
      const res = mockRes();
      await scheduleInterview(req, res, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.id).toBe('int-1');
    });
  });

  describe('evaluateInterview()', () => {
    it('should evaluate interview successfully', async () => {
      (prisma.interviewRound.findUnique as jest.Mock).mockResolvedValue({ id: 'int-1' });
      (prisma.interviewRound.update as jest.Mock).mockResolvedValue({ id: 'int-1', rating: 5 });

      const req = authReq({ 
        params: { intId: 'i1' }, 
        body: { rating: 5, recommendation: 'YES' } 
      });
      const res = mockRes();
      await evaluateInterview(req, res, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.rating).toBe(5);
    });
  });
});
