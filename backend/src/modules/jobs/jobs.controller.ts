import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { AuthenticatedRequest } from '../../middleware/auth';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { z } from 'zod';
import { JobStatus, ApplicationStatus } from '@prisma/client';

// ─── Validators ──────────────────────────────────────

const createJobSchema = z.object({
  title: z.string().min(1).max(200),
  departmentId: z.string().uuid(),
  designationId: z.string().uuid().optional().nullable(),
  templateId: z.string().uuid(),
  description: z.string().optional().nullable(),
  vacancies: z.number().int().min(1).default(1),
});

const applySchema = z.object({
  candidateId: z.string().uuid(),
});

// ─── List Jobs ───────────────────────────────────────

export async function listJobs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const status = req.query.status as string;
    const departmentId = req.query.departmentId as string;

    const where: any = {};
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;

    const [items, total] = await Promise.all([
      prisma.jobOpening.findMany({
        where,
        skip,
        take: limit,
        include: {
          department: { select: { name: true } },
          designation: { select: { name: true } },
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.jobOpening.count({ where }),
    ]);

    sendPaginated(res, items, total, page, limit);
  } catch (error) {
    next(error);
  }
}

// ─── Create Job ──────────────────────────────────────

export async function createJob(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createJobSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input',
        parsed.error.errors.map(e => ({ field: e.path.join('.'), issue: e.message }))
      );
    }

    const { title, departmentId, designationId, templateId, description, vacancies } = parsed.data;

    // Verify template exists
    const template = await prisma.pipelineTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new AppError(404, 'NOT_FOUND', 'Pipeline template not found');

    const job = await prisma.jobOpening.create({
      data: {
        title,
        departmentId,
        designationId: designationId || null,
        templateId,
        description: description || null,
        vacancies,
        createdById: req.user?.id,
      },
      include: {
        department: { select: { name: true } },
        designation: { select: { name: true } },
        template: { select: { name: true } },
      },
    });

    sendSuccess(res, job, 201);
  } catch (error) {
    next(error);
  }
}

// ─── Get Job Detail ──────────────────────────────────

export async function getJob(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const job = await prisma.jobOpening.findUnique({
      where: { id: req.params.id },
      include: {
        department: { select: { name: true } },
        designation: { select: { name: true } },
        template: {
          include: {
            stages: { orderBy: { stageOrder: 'asc' } },
          },
        },
        _count: { select: { applications: true } },
      },
    });

    if (!job) throw new AppError(404, 'NOT_FOUND', 'Job opening not found');
    sendSuccess(res, job);
  } catch (error) {
    next(error);
  }
}

// ─── Update Job Status ───────────────────────────────

export async function updateJobStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = req.body;
    if (!Object.values(JobStatus).includes(status)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid job status');
    }

    const job = await prisma.jobOpening.findUnique({ where: { id: req.params.id } });
    if (!job) throw new AppError(404, 'NOT_FOUND', 'Job opening not found');

    const updated = await prisma.jobOpening.update({
      where: { id: req.params.id },
      data: {
        status,
        ...(status === 'CLOSED' || status === 'FILLED' ? { closedAt: new Date() } : { closedAt: null }),
      },
    });

    sendSuccess(res, updated);
  } catch (error) {
    next(error);
  }
}

// ─── Get Kanban Board ────────────────────────────────

export async function getKanbanBoard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const job = await prisma.jobOpening.findUnique({
      where: { id: req.params.id },
      include: {
        template: {
          include: { stages: { orderBy: { stageOrder: 'asc' } } },
        },
      },
    });

    if (!job) throw new AppError(404, 'NOT_FOUND', 'Job opening not found');

    // Fetch all applications for this job
    const applications = await prisma.candidateApplication.findMany({
      where: { jobOpeningId: job.id, status: { notIn: ['REJECTED', 'WITHDRAWN'] } },
      include: {
        candidate: {
          select: { id: true, name: true, email: true, phone: true },
        },
        currentStage: true,
      },
    });

    // Group by stage
    const board = job.template.stages.map(stage => {
      return {
        ...stage,
        candidates: applications.filter(app => app.currentStageId === stage.id),
      };
    });

    sendSuccess(res, { jobTitle: job.title, stages: board });
  } catch (error) {
    next(error);
  }
}

// ─── Apply Candidate to Job ──────────────────────────

export async function applyToJob(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = applySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input');
    }

    const { candidateId } = parsed.data;

    // Verify job and get first stage
    const job = await prisma.jobOpening.findUnique({
      where: { id: req.params.id },
      include: {
        template: {
          include: { stages: { orderBy: { stageOrder: 'asc' }, take: 1 } },
        },
      },
    });

    if (!job) throw new AppError(404, 'NOT_FOUND', 'Job opening not found');
    if (job.status !== 'OPEN') throw new AppError(400, 'BAD_REQUEST', 'Job opening is not open');

    const firstStage = job.template.stages[0];
    if (!firstStage) throw new AppError(400, 'BAD_REQUEST', 'Pipeline has no stages');

    // Verify candidate exists
    const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!candidate) throw new AppError(404, 'NOT_FOUND', 'Candidate not found');

    // Check if already applied
    const existingApp = await prisma.candidateApplication.findUnique({
      where: { candidateId_jobOpeningId: { candidateId, jobOpeningId: job.id } },
    });

    if (existingApp) {
      throw new AppError(400, 'DUPLICATE', 'Candidate has already applied to this job');
    }

    // Create Application + Initial Stage Progress
    const application = await prisma.$transaction(async (tx) => {
      const app = await tx.candidateApplication.create({
        data: {
          candidateId,
          jobOpeningId: job.id,
          currentStageId: firstStage.id,
          status: 'IN_PIPELINE',
        },
      });

      await tx.stageProgress.create({
        data: {
          applicationId: app.id,
          stageId: firstStage.id,
          status: 'IN_PROGRESS',
        },
      });

      return app;
    });

    sendSuccess(res, application, 201);
  } catch (error) {
    next(error);
  }
}
