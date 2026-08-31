/**
 * Unit Tests: Pipelines Module
 * Tests pipeline templates and stages configurations.
 * Prisma is fully mocked.
 */

import { Request, Response, NextFunction } from 'express';

// ─── Mock Dependencies ──────────────────────────────────────────────────────

jest.mock('../../../config/database', () => ({
  prisma: {
    pipelineTemplate: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    pipelineStage: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(async (ops) => Promise.all(Array.isArray(ops) ? ops : [ops])),
  },
}));

import {
  listPipelines,
  createPipeline,
  getPipeline,
  updatePipeline,
  deletePipeline,
  addStage,
  updateStage,
  deleteStage,
  reorderStages,
} from '../pipelines.controller';
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

const MOCK_TEMPLATE = {
  id: 'tmpl-1',
  name: 'Standard Engineering',
  description: 'Default pipeline',
  isDefault: true,
  isActive: true,
  stages: [
    { id: 's1', name: 'Applied', stageOrder: 1 },
    { id: 's2', name: 'Interview', stageOrder: 2 },
  ],
  _count: { jobOpenings: 0 }
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Pipelines Module', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('listPipelines()', () => {
    it('should return list of templates', async () => {
      (prisma.pipelineTemplate.findMany as jest.Mock).mockResolvedValue([MOCK_TEMPLATE]);
      const req = authReq();
      const res = mockRes();
      await listPipelines(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data).toHaveLength(1);
    });
  });

  describe('createPipeline()', () => {
    it('should return 400 for invalid input', async () => {
      const req = authReq({ body: { name: '' } });
      const res = mockRes();
      await createPipeline(req, res, mockNext);
      expect((mockNext as jest.Mock).mock.calls[0][0].statusCode).toBe(400);
    });

    it('should unset old default if isDefault is true', async () => {
      (prisma.pipelineTemplate.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.pipelineTemplate.create as jest.Mock).mockResolvedValue(MOCK_TEMPLATE);

      const req = authReq({ body: { name: 'Eng', isDefault: true } });
      const res = mockRes();
      await createPipeline(req, res, mockNext);
      
      expect(prisma.pipelineTemplate.updateMany).toHaveBeenCalledWith({
        where: { isDefault: true },
        data: { isDefault: false }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('getPipeline()', () => {
    it('should return 404 if template not found', async () => {
      (prisma.pipelineTemplate.findUnique as jest.Mock).mockResolvedValue(null);
      const req = authReq({ params: { id: 'tmpl-1' } });
      const res = mockRes();
      await getPipeline(req, res, mockNext);
      expect((mockNext as jest.Mock).mock.calls[0][0].statusCode).toBe(404);
    });

    it('should return template successfully', async () => {
      (prisma.pipelineTemplate.findUnique as jest.Mock).mockResolvedValue(MOCK_TEMPLATE);
      const req = authReq({ params: { id: 'tmpl-1' } });
      const res = mockRes();
      await getPipeline(req, res, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.id).toBe('tmpl-1');
    });
  });

  describe('updatePipeline()', () => {
    it('should update template successfully', async () => {
      (prisma.pipelineTemplate.findUnique as jest.Mock).mockResolvedValue(MOCK_TEMPLATE);
      (prisma.pipelineTemplate.update as jest.Mock).mockResolvedValue({ ...MOCK_TEMPLATE, name: 'Updated' });

      const req = authReq({ params: { id: 'tmpl-1' }, body: { name: 'Updated' } });
      const res = mockRes();
      await updatePipeline(req, res, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.name).toBe('Updated');
    });
  });

  describe('deletePipeline()', () => {
    it('should prevent deletion if used by job openings', async () => {
      (prisma.pipelineTemplate.findUnique as jest.Mock).mockResolvedValue({ ...MOCK_TEMPLATE, _count: { jobOpenings: 2 } });
      
      const req = authReq({ params: { id: 'tmpl-1' } });
      const res = mockRes();
      await deletePipeline(req, res, mockNext);
      
      expect((mockNext as jest.Mock).mock.calls[0][0].statusCode).toBe(400);
      expect((mockNext as jest.Mock).mock.calls[0][0].message).toContain('Cannot delete');
    });

    it('should soft delete template', async () => {
      (prisma.pipelineTemplate.findUnique as jest.Mock).mockResolvedValue(MOCK_TEMPLATE);
      (prisma.pipelineTemplate.update as jest.Mock).mockResolvedValue({});
      
      const req = authReq({ params: { id: 'tmpl-1' } });
      const res = mockRes();
      await deletePipeline(req, res, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(prisma.pipelineTemplate.update).toHaveBeenCalledWith({
        where: { id: 'tmpl-1' },
        data: { isActive: false }
      });
    });
  });

  describe('addStage()', () => {
    it('should add a stage', async () => {
      (prisma.pipelineTemplate.findUnique as jest.Mock).mockResolvedValue(MOCK_TEMPLATE);
      (prisma.pipelineStage.create as jest.Mock).mockResolvedValue({ id: 's3', name: 'Task', stageOrder: 3 });

      const req = authReq({ 
        params: { id: 'tmpl-1' }, 
        body: { name: 'Task', stageType: 'TASK' } 
      });
      const res = mockRes();
      await addStage(req, res, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.id).toBe('s3');
    });
  });

  describe('updateStage()', () => {
    it('should update a stage', async () => {
      (prisma.pipelineStage.findFirst as jest.Mock).mockResolvedValue({ id: 's1' });
      (prisma.pipelineStage.update as jest.Mock).mockResolvedValue({ id: 's1', name: 'New Name' });

      const req = authReq({ 
        params: { id: 'tmpl-1', stageId: 's1' }, 
        body: { name: 'New Name' } 
      });
      const res = mockRes();
      await updateStage(req, res, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('deleteStage()', () => {
    it('should delete a stage and reorder others', async () => {
      (prisma.pipelineStage.findFirst as jest.Mock).mockResolvedValue({ id: 's1' });
      (prisma.pipelineStage.delete as jest.Mock).mockResolvedValue({});
      (prisma.pipelineStage.findMany as jest.Mock).mockResolvedValue([
        { id: 's2', stageOrder: 2 }
      ]);
      (prisma.pipelineStage.update as jest.Mock).mockResolvedValue({});

      const req = authReq({ params: { id: 'tmpl-1', stageId: 's1' } });
      const res = mockRes();
      await deleteStage(req, res, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      // Expect s2 to be updated to order 1
      expect(prisma.pipelineStage.update).toHaveBeenCalledWith({
        where: { id: 's2' },
        data: { stageOrder: 1 }
      });
    });
  });

  describe('reorderStages()', () => {
    it('should reorder stages via transaction', async () => {
      const validId1 = '00000000-0000-0000-0000-000000000001';
      const validId2 = '00000000-0000-0000-0000-000000000002';
      
      (prisma.pipelineStage.findMany as jest.Mock).mockResolvedValue([
        { id: validId1 }, { id: validId2 }
      ]);

      const req = authReq({ 
        params: { id: 'tmpl-1' }, 
        body: { stageIds: [validId2, validId1] } 
      });
      const res = mockRes();
      await reorderStages(req, res, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
