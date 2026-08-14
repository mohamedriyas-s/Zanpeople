import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { AuthenticatedRequest } from '../../middleware/auth';
import { sendSuccess } from '../../utils/response';
import { z } from 'zod';

// ─── Validators ──────────────────────────────────────

const createTemplateSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
});

const createStageSchema = z.object({
  name: z.string().min(1).max(150),
  stageType: z.enum(['APPLICATION', 'SCREENING', 'TASK', 'INTERVIEW', 'EVALUATION', 'CUSTOM']),
  isEliminatory: z.boolean().optional().default(true),
  config: z.any().optional().nullable(),
});

const updateStageSchema = createStageSchema.partial();

const reorderSchema = z.object({
  stageIds: z.array(z.string().uuid()),
});

// ─── List Pipeline Templates ─────────────────────────

export async function listPipelines(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const templates = await prisma.pipelineTemplate.findMany({
      where: { isActive: true },
      include: {
        stages: { orderBy: { stageOrder: 'asc' } },
        _count: { select: { jobOpenings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, templates);
  } catch (error) {
    next(error);
  }
}

// ─── Create Pipeline Template ────────────────────────

export async function createPipeline(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input',
        parsed.error.errors.map(e => ({ field: e.path.join('.'), issue: e.message }))
      );
    }

    const { name, description, isDefault } = parsed.data;

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.pipelineTemplate.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }

    const template = await prisma.pipelineTemplate.create({
      data: {
        name,
        description: description || null,
        isDefault: isDefault || false,
        createdById: req.user?.id,
      },
      include: {
        stages: { orderBy: { stageOrder: 'asc' } },
      },
    });

    sendSuccess(res, template, 201);
  } catch (error) {
    next(error);
  }
}

// ─── Get Pipeline Template ───────────────────────────

export async function getPipeline(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const template = await prisma.pipelineTemplate.findUnique({
      where: { id: req.params.id },
      include: {
        stages: { orderBy: { stageOrder: 'asc' } },
        _count: { select: { jobOpenings: true } },
        createdBy: { select: { name: true } },
      },
    });

    if (!template) throw new AppError(404, 'NOT_FOUND', 'Pipeline template not found');
    sendSuccess(res, template);
  } catch (error) {
    next(error);
  }
}

// ─── Update Pipeline Template ────────────────────────

export async function updatePipeline(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createTemplateSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input',
        parsed.error.errors.map(e => ({ field: e.path.join('.'), issue: e.message }))
      );
    }

    const existing = await prisma.pipelineTemplate.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Pipeline template not found');

    if (parsed.data.isDefault) {
      await prisma.pipelineTemplate.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }

    const updated = await prisma.pipelineTemplate.update({
      where: { id: req.params.id },
      data: parsed.data,
      include: { stages: { orderBy: { stageOrder: 'asc' } } },
    });

    sendSuccess(res, updated);
  } catch (error) {
    next(error);
  }
}

// ─── Delete Pipeline Template ────────────────────────

export async function deletePipeline(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const template = await prisma.pipelineTemplate.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { jobOpenings: true } } },
    });

    if (!template) throw new AppError(404, 'NOT_FOUND', 'Pipeline template not found');
    if (template._count.jobOpenings > 0) {
      throw new AppError(400, 'IN_USE', `Cannot delete: ${template._count.jobOpenings} job openings use this template`);
    }

    await prisma.pipelineTemplate.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    sendSuccess(res, { deleted: true });
  } catch (error) {
    next(error);
  }
}

// ─── Add Stage ───────────────────────────────────────

export async function addStage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createStageSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input',
        parsed.error.errors.map(e => ({ field: e.path.join('.'), issue: e.message }))
      );
    }

    const template = await prisma.pipelineTemplate.findUnique({
      where: { id: req.params.id },
      include: { stages: { orderBy: { stageOrder: 'desc' }, take: 1 } },
    });

    if (!template) throw new AppError(404, 'NOT_FOUND', 'Pipeline template not found');

    const nextOrder = template.stages.length > 0 ? template.stages[0].stageOrder + 1 : 1;

    const stage = await prisma.pipelineStage.create({
      data: {
        templateId: req.params.id,
        name: parsed.data.name,
        stageOrder: nextOrder,
        stageType: parsed.data.stageType,
        isEliminatory: parsed.data.isEliminatory,
        config: parsed.data.config || undefined,
      },
    });

    sendSuccess(res, stage, 201);
  } catch (error) {
    next(error);
  }
}

// ─── Update Stage ────────────────────────────────────

export async function updateStage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = updateStageSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input',
        parsed.error.errors.map(e => ({ field: e.path.join('.'), issue: e.message }))
      );
    }

    const stage = await prisma.pipelineStage.findFirst({
      where: { id: req.params.stageId, templateId: req.params.id },
    });

    if (!stage) throw new AppError(404, 'NOT_FOUND', 'Stage not found');

    const updated = await prisma.pipelineStage.update({
      where: { id: req.params.stageId },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.stageType !== undefined && { stageType: parsed.data.stageType }),
        ...(parsed.data.isEliminatory !== undefined && { isEliminatory: parsed.data.isEliminatory }),
        ...(parsed.data.config !== undefined && { config: parsed.data.config }),
      },
    });

    sendSuccess(res, updated);
  } catch (error) {
    next(error);
  }
}

// ─── Delete Stage ────────────────────────────────────

export async function deleteStage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const stage = await prisma.pipelineStage.findFirst({
      where: { id: req.params.stageId, templateId: req.params.id },
    });

    if (!stage) throw new AppError(404, 'NOT_FOUND', 'Stage not found');

    await prisma.pipelineStage.delete({ where: { id: req.params.stageId } });

    // Re-order remaining stages
    const remaining = await prisma.pipelineStage.findMany({
      where: { templateId: req.params.id },
      orderBy: { stageOrder: 'asc' },
    });

    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].stageOrder !== i + 1) {
        await prisma.pipelineStage.update({
          where: { id: remaining[i].id },
          data: { stageOrder: i + 1 },
        });
      }
    }

    sendSuccess(res, { deleted: true });
  } catch (error) {
    next(error);
  }
}

// ─── Reorder Stages ──────────────────────────────────

export async function reorderStages(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = reorderSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input');
    }

    const { stageIds } = parsed.data;

    // Verify all stages belong to this template
    const stages = await prisma.pipelineStage.findMany({
      where: { templateId: req.params.id },
    });

    const stageIdSet = new Set(stages.map(s => s.id));
    for (const id of stageIds) {
      if (!stageIdSet.has(id)) {
        throw new AppError(400, 'INVALID_STAGE', `Stage ${id} does not belong to this template`);
      }
    }

    // Update order in transaction
    await prisma.$transaction(
      stageIds.map((id, idx) =>
        prisma.pipelineStage.update({
          where: { id },
          data: { stageOrder: idx + 1 },
        })
      )
    );

    const updated = await prisma.pipelineStage.findMany({
      where: { templateId: req.params.id },
      orderBy: { stageOrder: 'asc' },
    });

    sendSuccess(res, updated);
  } catch (error) {
    next(error);
  }
}
