import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { AuthenticatedRequest } from '../../middleware/auth';
import { sendSuccess } from '../../utils/response';
import { z } from 'zod';
import { sendNotificationEmail } from '../../utils/email';

// ─── Validators ──────────────────────────────────────

const advanceSchema = z.object({
  remarks: z.string().optional().nullable(),
});

const rejectSchema = z.object({
  remarks: z.string().optional().nullable(),
});

const assignTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  deadline: z.string().datetime().optional().nullable(),
  evaluatorId: z.string().uuid().optional().nullable(),
});

const evaluateTaskSchema = z.object({
  score: z.number().int().min(1).max(5),
  evaluatorRemarks: z.string().optional().nullable(),
});

const scheduleInterviewSchema = z.object({
  interviewerId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().min(15).default(60),
  meetingLink: z.string().url().optional().nullable(),
});

const evaluateInterviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  remarks: z.string().optional().nullable(),
  recommendation: z.enum(['STRONG_YES', 'YES', 'NEUTRAL', 'NO', 'STRONG_NO']),
});

// ─── Get Application ─────────────────────────────────

export async function getApplication(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const application = await prisma.candidateApplication.findUnique({
      where: { id: req.params.id },
      include: {
        candidate: true,
        jobOpening: {
          include: {
            department: { select: { name: true } },
            designation: { select: { name: true } },
            template: {
              include: { stages: { orderBy: { stageOrder: 'asc' } } },
            },
          },
        },
        currentStage: true,
        stageProgress: {
          include: {
            stage: true,
            movedBy: { select: { name: true } },
            taskAssignment: {
              include: { evaluator: { select: { name: true } } },
            },
            interviews: {
              include: { interviewer: { select: { fullName: true } } },
              orderBy: { scheduledAt: 'asc' },
            },
          },
          orderBy: { stage: { stageOrder: 'asc' } },
        },
      },
    });

    if (!application) throw new AppError(404, 'NOT_FOUND', 'Application not found');
    sendSuccess(res, application);
  } catch (error) {
    next(error);
  }
}

// ─── Advance Stage ───────────────────────────────────

export async function advanceStage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = advanceSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input');

    const application = await prisma.candidateApplication.findUnique({
      where: { id: req.params.id },
      include: {
        currentStage: true,
        jobOpening: { include: { template: { include: { stages: { orderBy: { stageOrder: 'asc' } } } } } },
        candidate: true,
      },
    });

    if (!application) throw new AppError(404, 'NOT_FOUND', 'Application not found');
    if (application.status !== 'IN_PIPELINE') throw new AppError(400, 'BAD_REQUEST', 'Application is not active');

    const stages = application.jobOpening.template.stages;
    const currentIndex = stages.findIndex(s => s.id === application.currentStageId);
    
    if (currentIndex === -1) throw new AppError(500, 'SERVER_ERROR', 'Current stage not found in template');
    
    // Check if it's the last stage
    if (currentIndex === stages.length - 1) {
      // Complete the pipeline, candidate is SELECTED
      await prisma.$transaction(async (tx) => {
        // Complete current stage
        await tx.stageProgress.update({
          where: { applicationId_stageId: { applicationId: application.id, stageId: application.currentStageId! } },
          data: {
            status: 'COMPLETED',
            decision: 'PASS',
            remarks: parsed.data.remarks,
            completedAt: new Date(),
            movedById: req.user?.id,
          },
        });

        // Mark application as selected
        await tx.candidateApplication.update({
          where: { id: application.id },
          data: { status: 'SELECTED' },
        });

        // Mark candidate globally as selected
        await tx.candidate.update({
          where: { id: application.candidateId },
          data: { status: 'SELECTED' },
        });
      });

      sendSuccess(res, { message: 'Application completed and candidate selected' });
      return;
    }

    // Move to next stage
    const nextStage = stages[currentIndex + 1];

    await prisma.$transaction(async (tx) => {
      // Complete current stage
      await tx.stageProgress.update({
        where: { applicationId_stageId: { applicationId: application.id, stageId: application.currentStageId! } },
        data: {
          status: 'COMPLETED',
          decision: 'PASS',
          remarks: parsed.data.remarks,
          completedAt: new Date(),
          movedById: req.user?.id,
        },
      });

      // Create next stage progress
      await tx.stageProgress.create({
        data: {
          applicationId: application.id,
          stageId: nextStage.id,
          status: 'IN_PROGRESS',
        },
      });

      // Update application's current stage
      await tx.candidateApplication.update({
        where: { id: application.id },
        data: { currentStageId: nextStage.id },
      });
    });

    sendSuccess(res, { message: `Advanced to stage: ${nextStage.name}`, nextStageId: nextStage.id });
  } catch (error) {
    next(error);
  }
}

// ─── Reject Application ──────────────────────────────

export async function rejectApplication(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = rejectSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input');

    const application = await prisma.candidateApplication.findUnique({
      where: { id: req.params.id },
    });

    if (!application) throw new AppError(404, 'NOT_FOUND', 'Application not found');
    if (application.status !== 'IN_PIPELINE') throw new AppError(400, 'BAD_REQUEST', 'Application is not active');

    await prisma.$transaction(async (tx) => {
      if (application.currentStageId) {
        await tx.stageProgress.update({
          where: { applicationId_stageId: { applicationId: application.id, stageId: application.currentStageId } },
          data: {
            status: 'COMPLETED',
            decision: 'FAIL',
            remarks: parsed.data.remarks,
            completedAt: new Date(),
            movedById: req.user?.id,
          },
        });
      }

      await tx.candidateApplication.update({
        where: { id: application.id },
        data: { status: 'REJECTED' },
      });

      // Also mark candidate globally as rejected (assuming 1 active job for MVP)
      await tx.candidate.update({
        where: { id: application.candidateId },
        data: { status: 'REJECTED' },
      });
    });

    sendSuccess(res, { message: 'Application rejected' });
  } catch (error) {
    next(error);
  }
}

// ─── Assign Task ─────────────────────────────────────

export async function assignTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { appId, spId } = req.params;
    const parsed = assignTaskSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input');

    const sp = await prisma.stageProgress.findUnique({
      where: { id: spId, applicationId: appId },
      include: { stage: true, application: { include: { candidate: true } } },
    });

    if (!sp) throw new AppError(404, 'NOT_FOUND', 'Stage progress not found');
    if (sp.stage.stageType !== 'TASK') throw new AppError(400, 'BAD_REQUEST', 'Not a task stage');

    const existingTask = await prisma.taskAssignment.findUnique({ where: { stageProgressId: spId } });
    if (existingTask) throw new AppError(400, 'DUPLICATE', 'Task already assigned for this stage');

    const task = await prisma.taskAssignment.create({
      data: {
        stageProgressId: spId,
        title: parsed.data.title,
        description: parsed.data.description || null,
        deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
        evaluatorId: parsed.data.evaluatorId || null,
      },
    });

    // Send email to candidate
    try {
      await sendNotificationEmail(
        sp.application.candidate.email,
        'Task Assignment - Zansphere HR',
        `Dear ${sp.application.candidate.name},\n\nYou have been assigned a task: ${task.title}.\n${task.description ? `\nDetails: ${task.description}\n` : ''}${task.deadline ? `\nDeadline: ${new Date(task.deadline).toLocaleString()}\n` : ''}\n\nGood luck!`,
        `<h1>Task Assignment</h1><p>Dear ${sp.application.candidate.name},</p><p>You have been assigned a task: <strong>${task.title}</strong>.</p>${task.description ? `<p>${task.description}</p>` : ''}${task.deadline ? `<p><strong>Deadline:</strong> ${new Date(task.deadline).toLocaleString()}</p>` : ''}`
      );
    } catch (e) {
      console.error('Failed to send task email', e);
    }

    sendSuccess(res, task, 201);
  } catch (error) {
    next(error);
  }
}

// ─── Evaluate Task ───────────────────────────────────

export async function evaluateTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { spId } = req.params;
    const parsed = evaluateTaskSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input');

    const task = await prisma.taskAssignment.findUnique({ where: { stageProgressId: spId } });
    if (!task) throw new AppError(404, 'NOT_FOUND', 'Task not found');

    const updated = await prisma.taskAssignment.update({
      where: { stageProgressId: spId },
      data: {
        score: parsed.data.score,
        evaluatorRemarks: parsed.data.evaluatorRemarks,
        evaluatedAt: new Date(),
        evaluatorId: req.user?.id, // If admin evaluates it directly
      },
    });

    sendSuccess(res, updated);
  } catch (error) {
    next(error);
  }
}

// ─── Schedule Interview ──────────────────────────────

export async function scheduleInterview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { appId, spId } = req.params;
    const parsed = scheduleInterviewSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input');

    const sp = await prisma.stageProgress.findUnique({
      where: { id: spId, applicationId: appId },
      include: { stage: true, application: { include: { candidate: true } } },
    });

    if (!sp) throw new AppError(404, 'NOT_FOUND', 'Stage progress not found');
    if (sp.stage.stageType !== 'INTERVIEW') throw new AppError(400, 'BAD_REQUEST', 'Not an interview stage');

    const interviewer = await prisma.employee.findUnique({ where: { id: parsed.data.interviewerId } });
    if (!interviewer) throw new AppError(404, 'NOT_FOUND', 'Interviewer (Employee) not found');

    const interview = await prisma.interviewRound.create({
      data: {
        stageProgressId: spId,
        interviewerId: parsed.data.interviewerId,
        scheduledAt: new Date(parsed.data.scheduledAt),
        durationMinutes: parsed.data.durationMinutes,
        meetingLink: parsed.data.meetingLink || null,
        status: 'SCHEDULED',
      },
    });

    // Update global candidate status (backward compatibility)
    await prisma.candidate.update({
      where: { id: sp.application.candidateId },
      data: { status: 'INTERVIEW_SCHEDULED', interviewDate: new Date(parsed.data.scheduledAt) },
    });

    // Send emails
    try {
      const timeStr = new Date(parsed.data.scheduledAt).toLocaleString();
      // To candidate
      await sendNotificationEmail(
        sp.application.candidate.email,
        'Interview Scheduled - Zansphere HR',
        `Dear ${sp.application.candidate.name},\n\nAn interview has been scheduled for you on ${timeStr}. Duration: ${parsed.data.durationMinutes} mins.\n${parsed.data.meetingLink ? `Meeting Link: ${parsed.data.meetingLink}` : ''}`,
        `<h1>Interview Scheduled</h1><p>Dear ${sp.application.candidate.name},</p><p>An interview has been scheduled for you on <strong>${timeStr}</strong> for ${parsed.data.durationMinutes} minutes.</p>${parsed.data.meetingLink ? `<p><a href="${parsed.data.meetingLink}">Join Meeting</a></p>` : ''}`
      );
      // To Interviewer
      await sendNotificationEmail(
        interviewer.email,
        'New Interview Assignment',
        `Hi ${interviewer.fullName},\n\nYou have been assigned to interview ${sp.application.candidate.name} on ${timeStr}.\n${parsed.data.meetingLink ? `Link: ${parsed.data.meetingLink}` : ''}`,
        `<h1>Interview Assignment</h1><p>Hi ${interviewer.fullName},</p><p>You have been assigned to interview <strong>${sp.application.candidate.name}</strong> on <strong>${timeStr}</strong>.</p>${parsed.data.meetingLink ? `<p><a href="${parsed.data.meetingLink}">Join Meeting</a></p>` : ''}`
      );
    } catch (e) {
      console.error('Failed to send interview emails', e);
    }

    sendSuccess(res, interview, 201);
  } catch (error) {
    next(error);
  }
}

// ─── Evaluate Interview ──────────────────────────────

export async function evaluateInterview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { intId } = req.params;
    const parsed = evaluateInterviewSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input');

    const interview = await prisma.interviewRound.findUnique({ where: { id: intId } });
    if (!interview) throw new AppError(404, 'NOT_FOUND', 'Interview not found');

    const updated = await prisma.interviewRound.update({
      where: { id: intId },
      data: {
        status: 'COMPLETED',
        rating: parsed.data.rating,
        remarks: parsed.data.remarks,
        recommendation: parsed.data.recommendation,
        completedAt: new Date(),
      },
    });

    sendSuccess(res, updated);
  } catch (error) {
    next(error);
  }
}
