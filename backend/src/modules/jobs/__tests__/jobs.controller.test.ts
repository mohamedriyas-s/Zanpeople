/**
 * Unit Tests: Jobs Module
 * Tests job listings, creation, kanban board, and applying to jobs.
 * Prisma is fully mocked.
 */

import { Request, Response, NextFunction } from 'express';

// ─── Mock Dependencies ──────────────────────────────────────────────────────

jest.mock('../../../config/database', () => ({
  prisma: {
    jobOpening: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    pipelineTemplate: {
      findUnique: jest.fn(),
    },
    candidateApplication: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    candidate: {
      findUnique: jest.fn(),
    },
    stageProgress: {
      create: jest.fn(),
    },
    $transaction: jest.fn(async (ops) => {
      if (typeof ops === 'function') {
        const tx = {
          candidateApplication: { create: jest.fn().mockResolvedValue({ id: 'app-1' }) },
          stageProgress: { create: jest.fn() },
        };
        return ops(tx);
      }
      return Promise.all(Array.isArray(ops) ? ops : [ops]);
    }),
  },
}));

import {
  listJobs,
  createJob,
  getJob,
  updateJobStatus,
  getKanbanBoard,
  applyToJob,
} from '../jobs.controller';
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

const MOCK_JOB = {
  id: 'job-1',
  title: 'Software Engineer',
  departmentId: 'dept-1',
  templateId: 'tmpl-1',
  status: 'OPEN',
  template: {
    stages: [
      { id: 's1', name: 'Applied' },
      { id: 's2', name: 'Interview' }
    ]
  }
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Jobs Module', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('listJobs()', () => {
    it('should return paginated list of jobs', async () => {
      (prisma.jobOpening.findMany as jest.Mock).mockResolvedValue([MOCK_JOB]);
      (prisma.jobOpening.count as jest.Mock).mockResolvedValue(1);

      const req = authReq({ query: { page: '1', limit: '10' } });
      const res = mockRes();
      await listJobs(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.items).toHaveLength(1);
    });
  });

  describe('createJob()', () => {
    it('should return 400 for invalid input', async () => {
      const req = authReq({ body: { title: '' } });
      const res = mockRes();
      await createJob(req, res, mockNext);
      expect((mockNext as jest.Mock).mock.calls[0][0].statusCode).toBe(400);
    });

    it('should return 404 if pipeline template not found', async () => {
      (prisma.pipelineTemplate.findUnique as jest.Mock).mockResolvedValue(null);
      const req = authReq({ 
        body: { title: 'SE', departmentId: '00000000-0000-0000-0000-000000000000', templateId: '00000000-0000-0000-0000-000000000000' } 
      });
      const res = mockRes();
      await createJob(req, res, mockNext);
      expect((mockNext as jest.Mock).mock.calls[0][0].statusCode).toBe(404);
    });

    it('should create job successfully', async () => {
      (prisma.pipelineTemplate.findUnique as jest.Mock).mockResolvedValue({ id: 't1' });
      (prisma.jobOpening.create as jest.Mock).mockResolvedValue(MOCK_JOB);

      const req = authReq({ 
        body: { title: 'SE', departmentId: '00000000-0000-0000-0000-000000000000', templateId: '00000000-0000-0000-0000-000000000000' } 
      });
      const res = mockRes();
      await createJob(req, res, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.id).toBe('job-1');
    });
  });

  describe('getJob()', () => {
    it('should return 404 if job not found', async () => {
      (prisma.jobOpening.findUnique as jest.Mock).mockResolvedValue(null);
      const req = authReq({ params: { id: 'job-1' } });
      const res = mockRes();
      await getJob(req, res, mockNext);
      expect((mockNext as jest.Mock).mock.calls[0][0].statusCode).toBe(404);
    });

    it('should return job data successfully', async () => {
      (prisma.jobOpening.findUnique as jest.Mock).mockResolvedValue(MOCK_JOB);
      const req = authReq({ params: { id: 'job-1' } });
      const res = mockRes();
      await getJob(req, res, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.id).toBe('job-1');
    });
  });

  describe('updateJobStatus()', () => {
    it('should return 400 for invalid status', async () => {
      const req = authReq({ params: { id: 'job-1' }, body: { status: 'INVALID' } });
      const res = mockRes();
      await updateJobStatus(req, res, mockNext);
      expect((mockNext as jest.Mock).mock.calls[0][0].statusCode).toBe(400);
    });

    it('should update job status to CLOSED', async () => {
      (prisma.jobOpening.findUnique as jest.Mock).mockResolvedValue(MOCK_JOB);
      (prisma.jobOpening.update as jest.Mock).mockResolvedValue({ ...MOCK_JOB, status: 'CLOSED' });

      const req = authReq({ params: { id: 'job-1' }, body: { status: 'CLOSED' } });
      const res = mockRes();
      await updateJobStatus(req, res, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.status).toBe('CLOSED');
    });
  });

  describe('getKanbanBoard()', () => {
    it('should return 404 if job not found', async () => {
      (prisma.jobOpening.findUnique as jest.Mock).mockResolvedValue(null);
      const req = authReq({ params: { id: 'job-1' } });
      const res = mockRes();
      await getKanbanBoard(req, res, mockNext);
      expect((mockNext as jest.Mock).mock.calls[0][0].statusCode).toBe(404);
    });

    it('should group applications by stage', async () => {
      (prisma.jobOpening.findUnique as jest.Mock).mockResolvedValue(MOCK_JOB);
      (prisma.candidateApplication.findMany as jest.Mock).mockResolvedValue([
        { id: 'app-1', currentStageId: 's1' },
        { id: 'app-2', currentStageId: 's2' }
      ]);

      const req = authReq({ params: { id: 'job-1' } });
      const res = mockRes();
      await getKanbanBoard(req, res, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.stages).toHaveLength(2);
      expect(jsonCall.data.stages[0].candidates).toHaveLength(1); // 's1'
      expect(jsonCall.data.stages[1].candidates).toHaveLength(1); // 's2'
    });
  });

  describe('applyToJob()', () => {
    it('should return 400 for invalid input', async () => {
      const req = authReq({ params: { id: 'job-1' }, body: {} });
      const res = mockRes();
      await applyToJob(req, res, mockNext);
      expect((mockNext as jest.Mock).mock.calls[0][0].statusCode).toBe(400);
    });

    it('should return 400 if candidate already applied', async () => {
      (prisma.jobOpening.findUnique as jest.Mock).mockResolvedValue(MOCK_JOB);
      (prisma.candidate.findUnique as jest.Mock).mockResolvedValue({ id: 'c1' });
      (prisma.candidateApplication.findUnique as jest.Mock).mockResolvedValue({ id: 'app-existing' });

      const req = authReq({ params: { id: 'job-1' }, body: { candidateId: '00000000-0000-0000-0000-000000000000' } });
      const res = mockRes();
      await applyToJob(req, res, mockNext);
      expect((mockNext as jest.Mock).mock.calls[0][0].statusCode).toBe(400);
      expect((mockNext as jest.Mock).mock.calls[0][0].message).toContain('already applied');
    });

    it('should successfully apply candidate to job', async () => {
      (prisma.jobOpening.findUnique as jest.Mock).mockResolvedValue(MOCK_JOB);
      (prisma.candidate.findUnique as jest.Mock).mockResolvedValue({ id: 'c1' });
      (prisma.candidateApplication.findUnique as jest.Mock).mockResolvedValue(null);
      // The transaction mock returns { id: 'app-1' }

      const req = authReq({ params: { id: 'job-1' }, body: { candidateId: '00000000-0000-0000-0000-000000000000' } });
      const res = mockRes();
      await applyToJob(req, res, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.id).toBe('app-1');
    });
  });
});
