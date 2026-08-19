import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { s3Client, S3_BUCKET, generateS3Key } from '../../config/s3';
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppError } from '../../middleware/errorHandler';
import { AuthenticatedRequest } from '../../middleware/auth';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { generatePublicToken } from '../../utils/token';
import { CandidateStatus, OwnerType, DocType, NotificationType, ReferenceType } from '@prisma/client';
import { z } from 'zod';

// ─── Validators ──────────────────────────────────────

const createCandidateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  email: z.string().email('Valid email is required').max(255),
  phone: z.string().min(7, 'Phone must be at least 7 digits').max(15, 'Phone must be at most 15 digits').regex(/^\+?[\d\s-]+$/, 'Phone must contain only numbers, spaces, hyphens, or leading +'),
  address: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  positionApplied: z.string().min(1, 'Position applied is required').max(150),
  yearsExperience: z.number().min(0, 'Experience cannot be negative').optional().nullable(),
  currentCompany: z.string().max(150).optional().nullable(),
  noticePeriod: z.string().max(50).optional().nullable(),
  currentSalary: z.number().min(0, 'Salary cannot be negative').optional().nullable(),
  expectedSalary: z.number().min(0, 'Salary cannot be negative').optional().nullable(),
  skills: z.array(z.string().max(100)).optional().default([]),
  linkedinUrl: z.string().url().max(255).optional().nullable().or(z.literal('')),
  githubUrl: z.string().url().max(255).optional().nullable().or(z.literal('')),
  portfolioUrl: z.string().url().max(255).optional().nullable().or(z.literal('')),
  personalWebsiteUrl: z.string().url().max(255).optional().nullable().or(z.literal('')),
  interviewDate: z.string().optional().nullable(),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(CandidateStatus),
  interviewDate: z.string().optional().nullable(),
});

const addNoteSchema = z.object({
  noteType: z.enum(['INTERVIEW_COMMENT', 'HR_COMMENT']),
  content: z.string().min(1, 'Content is required'),
  visibleToPublic: z.boolean().default(false),
});

const addTimelineSchema = z.object({
  description: z.string().min(1, 'Description is required').max(255),
});

// ─── List Candidates (FR-CAND-16, FR-CAND-17, FR-FILT-01) ──

export async function listCandidates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    // Search
    if (req.query.search) {
      const search = req.query.search as string;
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { positionApplied: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filters
    if (req.query.status) {
      where.status = req.query.status as CandidateStatus;
    }
    if (req.query.position) {
      where.positionApplied = { contains: req.query.position as string, mode: 'insensitive' };
    }
    if (req.query.experienceMin || req.query.experienceMax) {
      where.yearsExperience = {};
      if (req.query.experienceMin) where.yearsExperience.gte = parseFloat(req.query.experienceMin as string);
      if (req.query.experienceMax) where.yearsExperience.lte = parseFloat(req.query.experienceMax as string);
    }
    if (req.query.dateFrom || req.query.dateTo) {
      where.createdAt = {};
      if (req.query.dateFrom) where.createdAt.gte = new Date(req.query.dateFrom as string);
      if (req.query.dateTo) where.createdAt.lte = new Date(req.query.dateTo as string);
    }

    // Sorting
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) || 'desc';
    const orderBy: any = {};
    if (['createdAt', 'name', 'status'].includes(sortBy)) {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [items, total] = await Promise.all([
      prisma.candidate.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          email: true,
          positionApplied: true,
          status: true,
          yearsExperience: true,
          createdAt: true,
          publicToken: true,
          publicLinkEnabled: true,
          skills: {
            select: { skill: { select: { name: true } } },
          },
        },
      }),
      prisma.candidate.count({ where }),
    ]);

    // Flatten skills
    const formattedItems = items.map(item => ({
      ...item,
      skills: item.skills.map(s => s.skill.name),
    }));

    sendPaginated(res, formattedItems, total, page, limit);
  } catch (error) {
    next(error);
  }
}

// ─── Create Candidate (FR-CAND-01, FR-CAND-02, FR-CAND-04, FR-CAND-18) ──

export async function createCandidate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createCandidateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input',
        parsed.error.errors.map(e => ({ field: e.path.join('.'), issue: e.message }))
      );
    }

    const data = parsed.data;
    const force = req.query.force === 'true';

    // Duplicate check (FR-CAND-04)
    if (!force) {
      const existing = await prisma.candidate.findFirst({
        where: {
          email: { equals: data.email, mode: 'insensitive' },
          positionApplied: { equals: data.positionApplied, mode: 'insensitive' },
        },
      });

      if (existing) {
        throw new AppError(409, 'DUPLICATE_CANDIDATE',
          'A candidate with this email already applied for this position — continue anyway?'
        );
      }
    }

    // Upsert skills
    const skillRecords = [];
    for (const skillName of data.skills) {
      const trimmed = skillName.trim();
      if (!trimmed) continue;
      const skill = await prisma.skill.upsert({
        where: { name: trimmed },
        create: { name: trimmed },
        update: {},
      });
      skillRecords.push(skill);
    }

    // Generate public token (FR-PUB-01)
    const publicToken = generatePublicToken();

    const candidate = await prisma.candidate.create({
      data: {
        publicToken,
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || null,
        positionApplied: data.positionApplied,
        yearsExperience: data.yearsExperience ?? null,
        currentCompany: data.currentCompany || null,
        noticePeriod: data.noticePeriod || null,
        currentSalary: data.currentSalary ?? null,
        expectedSalary: data.expectedSalary ?? null,
        linkedinUrl: data.linkedinUrl || null,
        githubUrl: data.githubUrl || null,
        portfolioUrl: data.portfolioUrl || null,
        personalWebsiteUrl: data.personalWebsiteUrl || null,
        interviewDate: data.interviewDate ? new Date(data.interviewDate) : null,
        status: CandidateStatus.APPLIED,
        createdById: req.user?.id,
        updatedById: req.user?.id,
        skills: {
          create: skillRecords.map(skill => ({
            skillId: skill.id,
          })),
        },
      },
      include: {
        skills: { include: { skill: true } },
        createdBy: { select: { name: true } },
      },
    });

    // Auto-create timeline entry
    await prisma.candidateTimeline.create({
      data: {
        candidateId: candidate.id,
        eventType: 'STATUS_CHANGE',
        description: 'Candidate created with status Applied',
        createdById: req.user?.id,
      },
    });

    // Create notification (FR-NOTIF-01)
    await prisma.notification.create({
      data: {
        type: NotificationType.CANDIDATE_ADDED,
        message: `New candidate "${candidate.name}" applied for ${candidate.positionApplied}`,
        referenceType: ReferenceType.CANDIDATE,
        referenceId: candidate.id,
      },
    });

    const publicUrl = `${req.protocol}://${req.get('host')?.replace('api.', '')}/candidate/${candidate.publicToken}`;

    sendSuccess(res, {
      ...candidate,
      skills: candidate.skills.map(s => s.skill.name),
      publicUrl,
    }, 201);
  } catch (error) {
    next(error);
  }
}

// ─── Get Candidate Detail (FR-CAND-12) ───────────────

export async function getCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: req.params.id },
      include: {
        skills: { include: { skill: true } },
        notes: {
          orderBy: { createdAt: 'desc' },
          include: { createdBy: { select: { name: true } } },
        },
        timeline: {
          orderBy: { createdAt: 'desc' },
          include: { createdBy: { select: { name: true } } },
        },
        documents: true,
        createdBy: { select: { name: true } },
        updatedBy: { select: { name: true } },
        applications: {
          include: {
            jobOpening: { select: { title: true } },
            currentStage: { select: { name: true, stageType: true } },
          },
        },
        employee: { select: { id: true } },
      },
    });

    if (!candidate) {
      throw new AppError(404, 'CANDIDATE_NOT_FOUND', 'Candidate not found');
    }

    sendSuccess(res, {
      ...candidate,
      skills: candidate.skills.map(s => s.skill.name),
    });
  } catch (error) {
    next(error);
  }
}

// ─── Update Candidate (FR-CAND-13) ───────────────────

export async function updateCandidate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createCandidateSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input',
        parsed.error.errors.map(e => ({ field: e.path.join('.'), issue: e.message }))
      );
    }

    const data = parsed.data;
    const candidateId = req.params.id;

    const existing = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!existing) {
      throw new AppError(404, 'CANDIDATE_NOT_FOUND', 'Candidate not found');
    }

    // Handle skills update
    if (data.skills) {
      // Remove existing skill mappings
      await prisma.candidateSkillMap.deleteMany({ where: { candidateId } });

      // Upsert and re-link skills
      for (const skillName of data.skills) {
        const trimmed = skillName.trim();
        if (!trimmed) continue;
        const skill = await prisma.skill.upsert({
          where: { name: trimmed },
          create: { name: trimmed },
          update: {},
        });
        await prisma.candidateSkillMap.create({
          data: { candidateId, skillId: skill.id },
        });
      }
    }

    const { skills, ...updateData } = data;
    const candidate = await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        ...updateData,
        email: updateData.email?.toLowerCase(),
        interviewDate: updateData.interviewDate ? new Date(updateData.interviewDate) : updateData.interviewDate === null ? null : undefined,
        updatedById: req.user?.id,
      },
      include: {
        skills: { include: { skill: true } },
      },
    });

    sendSuccess(res, {
      ...candidate,
      skills: candidate.skills.map(s => s.skill.name),
    });
  } catch (error) {
    next(error);
  }
}

// ─── Delete Candidate (FR-CAND-14) ───────────────────

export async function deleteCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: req.params.id },
      include: { documents: true },
    });

    if (!candidate) {
      throw new AppError(404, 'CANDIDATE_NOT_FOUND', 'Candidate not found');
    }

    // Delete S3 documents
    for (const doc of candidate.documents) {
      try {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: S3_BUCKET,
          Key: doc.s3Key,
        }));
      } catch (s3Error) {
        console.error(`Failed to delete S3 object ${doc.s3Key}:`, s3Error);
      }
    }

    // Hard delete candidate (cascade will handle notes, timeline, skill_map, documents)
    await prisma.candidate.delete({ where: { id: req.params.id } });

    sendSuccess(res, { message: 'Candidate deleted successfully' });
  } catch (error) {
    next(error);
  }
}

// ─── Update Candidate Status (FR-CAND-09) ────────────

export async function updateCandidateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid status',
        parsed.error.errors.map(e => ({ field: e.path.join('.'), issue: e.message }))
      );
    }

    const { status, interviewDate } = parsed.data;
    const candidateId = req.params.id;

    const existing = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!existing) {
      throw new AppError(404, 'CANDIDATE_NOT_FOUND', 'Candidate not found');
    }

    const oldStatus = existing.status;

    const updateData: any = {
      status,
      updatedById: req.user?.id,
    };

    // Set interview date if status is Interview Scheduled
    if (status === CandidateStatus.INTERVIEW_SCHEDULED && interviewDate) {
      updateData.interviewDate = new Date(interviewDate);
    }

    const candidate = await prisma.candidate.update({
      where: { id: candidateId },
      data: updateData,
    });

    // Auto-create timeline entry (FR-CAND-09)
    await prisma.candidateTimeline.create({
      data: {
        candidateId,
        eventType: 'STATUS_CHANGE',
        description: `Status changed from ${oldStatus.replace(/_/g, ' ')} to ${status.replace(/_/g, ' ')}`,
        createdById: req.user?.id,
      },
    });

    // Create notification if Interview Scheduled (FR-NOTIF-02)
    if (status === CandidateStatus.INTERVIEW_SCHEDULED) {
      await prisma.notification.create({
        data: {
          type: NotificationType.INTERVIEW_SCHEDULED,
          message: `Interview scheduled for "${candidate.name}" — ${candidate.positionApplied}`,
          referenceType: ReferenceType.CANDIDATE,
          referenceId: candidateId,
        },
      });
    }

    sendSuccess(res, { id: candidate.id, status: candidate.status });
  } catch (error) {
    next(error);
  }
}

// ─── Add Note (FR-CAND-11) ───────────────────────────

export async function addCandidateNote(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = addNoteSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input',
        parsed.error.errors.map(e => ({ field: e.path.join('.'), issue: e.message }))
      );
    }

    const candidate = await prisma.candidate.findUnique({ where: { id: req.params.id } });
    if (!candidate) {
      throw new AppError(404, 'CANDIDATE_NOT_FOUND', 'Candidate not found');
    }

    const note = await prisma.candidateNote.create({
      data: {
        candidateId: req.params.id,
        noteType: parsed.data.noteType,
        content: parsed.data.content,
        visibleToPublic: parsed.data.visibleToPublic,
        createdById: req.user?.id,
      },
      include: { createdBy: { select: { name: true } } },
    });

    sendSuccess(res, note, 201);
  } catch (error) {
    next(error);
  }
}

// ─── Get Timeline (FR-CAND-10) ───────────────────────

export async function getCandidateTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const timeline = await prisma.candidateTimeline.findMany({
      where: { candidateId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { name: true } } },
    });

    sendSuccess(res, timeline);
  } catch (error) {
    next(error);
  }
}

// ─── Add Manual Timeline Entry (FR-CAND-10) ──────────

export async function addTimelineEntry(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = addTimelineSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input',
        parsed.error.errors.map(e => ({ field: e.path.join('.'), issue: e.message }))
      );
    }

    const candidate = await prisma.candidate.findUnique({ where: { id: req.params.id } });
    if (!candidate) {
      throw new AppError(404, 'CANDIDATE_NOT_FOUND', 'Candidate not found');
    }

    const entry = await prisma.candidateTimeline.create({
      data: {
        candidateId: req.params.id,
        eventType: 'MANUAL_NOTE',
        description: parsed.data.description,
        createdById: req.user?.id,
      },
      include: { createdBy: { select: { name: true } } },
    });

    sendSuccess(res, entry, 201);
  } catch (error) {
    next(error);
  }
}

// ─── Upload Resume (FR-CAND-05) ─────────────────────

export async function uploadResume(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Resume file is required');
    }

    const candidateId = req.params.id;
    const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!candidate) {
      throw new AppError(404, 'CANDIDATE_NOT_FOUND', 'Candidate not found');
    }

    // Delete existing resume if any
    const existingResume = await prisma.document.findFirst({
      where: { ownerId: candidateId, ownerType: OwnerType.CANDIDATE, docType: DocType.RESUME },
    });
    if (existingResume) {
      try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: existingResume.s3Key }));
      } catch {}
      await prisma.document.delete({ where: { id: existingResume.id } });
    }

    // Upload to S3
    const s3Key = generateS3Key('candidate', candidateId, 'resume', req.file.originalname);

    await s3Client.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }));

    // Create document record
    const document = await prisma.document.create({
      data: {
        ownerType: OwnerType.CANDIDATE,
        ownerId: candidateId,
        docType: DocType.RESUME,
        fileName: req.file.originalname,
        s3Key,
        mimeType: req.file.mimetype,
        sizeBytes: BigInt(req.file.size),
        uploadedById: req.user?.id,
      },
    });

    sendSuccess(res, {
      documentId: document.id,
      fileName: document.fileName,
    });
  } catch (error) {
    next(error);
  }
}

// ─── Get Resume URL (FR-RESUME-04) ───────────────────

export async function getResumeUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const document = await prisma.document.findFirst({
      where: {
        ownerId: req.params.id,
        ownerType: OwnerType.CANDIDATE,
        docType: DocType.RESUME,
      },
    });

    if (!document) {
      throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'No resume found for this candidate');
    }

    // Generate time-limited signed URL (15 minutes)
    const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: document.s3Key });
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

    sendSuccess(res, {
      documentId: document.id,
      fileName: document.fileName,
      mimeType: document.mimeType,
      previewUrl: signedUrl,
      downloadUrl: signedUrl,
    });
  } catch (error) {
    next(error);
  }
}

// ─── Regenerate Public Link (FR-PUB-06) ──────────────

export async function regeneratePublicLink(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const candidate = await prisma.candidate.findUnique({ where: { id: req.params.id } });
    if (!candidate) {
      throw new AppError(404, 'CANDIDATE_NOT_FOUND', 'Candidate not found');
    }

    const newToken = generatePublicToken();
    const updated = await prisma.candidate.update({
      where: { id: req.params.id },
      data: { publicToken: newToken, updatedById: req.user?.id },
    });

    sendSuccess(res, { publicToken: updated.publicToken });
  } catch (error) {
    next(error);
  }
}

// ─── Toggle Public Link (FR-PUB-07) ──────────────────

export async function togglePublicLink(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const candidate = await prisma.candidate.findUnique({ where: { id: req.params.id } });
    if (!candidate) {
      throw new AppError(404, 'CANDIDATE_NOT_FOUND', 'Candidate not found');
    }

    const updated = await prisma.candidate.update({
      where: { id: req.params.id },
      data: {
        publicLinkEnabled: !candidate.publicLinkEnabled,
        updatedById: req.user?.id,
      },
    });

    sendSuccess(res, { publicLinkEnabled: updated.publicLinkEnabled });
  } catch (error) {
    next(error);
  }
}

// ─── Parse Resume (FR-CAND-01: Autofill from Resume) ─────────

export async function parseResume(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      throw new AppError(400, 'NO_FILE', 'Please upload a PDF file');
    }

    const { mimetype, buffer } = req.file;

    if (mimetype !== 'application/pdf') {
      throw new AppError(400, 'INVALID_FILE_TYPE', 'Only PDF files are supported for resume parsing');
    }

    const { parseResumeBuffer } = await import('../../utils/resumeParser');
    const parsed = await parseResumeBuffer(buffer);

    sendSuccess(res, parsed);
  } catch (error) {
    next(error);
  }
}
