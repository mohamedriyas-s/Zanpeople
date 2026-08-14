import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { s3Client, S3_BUCKET, generateS3Key } from '../../config/s3';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppError } from '../../middleware/errorHandler';
import { AuthenticatedRequest } from '../../middleware/auth';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { generateEmployeeCode } from '../../utils/token';
import { env } from '../../config/env';
import { EmploymentStatus, CandidateStatus, OwnerType, DocType, NotificationType, ReferenceType } from '@prisma/client';
import { z } from 'zod';

// ─── Validators ──────────────────────────────────────

const createEmployeeSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(150),
  email: z.string().email('Valid email is required').max(255),
  phone: z.string().max(20).optional().nullable(),
  departmentId: z.string().uuid('Valid department is required'),
  designationId: z.string().uuid('Valid designation is required'),
  managerId: z.string().uuid().optional().nullable(),
  joiningDate: z.string().min(1, 'Joining date is required'),
  emergencyContactName: z.string().max(150).optional().nullable(),
  emergencyContactRelationship: z.string().max(50).optional().nullable(),
  emergencyContactPhone: z.string().max(20).optional().nullable(),
});

const uploadDocSchema = z.object({
  docType: z.enum(['OFFER_LETTER', 'ID_PROOF', 'CERTIFICATE']),
});

// ─── Helper: Generate next employee code ─────────────

async function getNextEmployeeCode(): Promise<string> {
  const prefix = env.EMPLOYEE_ID_PREFIX;
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-%`;

  // Find the highest existing code for current year
  const lastEmployee = await prisma.employee.findFirst({
    where: { employeeCode: { startsWith: `${prefix}-${year}-` } },
    orderBy: { employeeCode: 'desc' },
  });

  let nextSequence = 1;
  if (lastEmployee) {
    const parts = lastEmployee.employeeCode.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    nextSequence = lastSeq + 1;
  }

  return generateEmployeeCode(prefix, nextSequence);
}

// ─── List Employees (FR-EMP-11, FR-FILT-02) ──────────

export async function listEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    // Default to Active employees
    if (req.query.status) {
      where.employmentStatus = req.query.status as EmploymentStatus;
    } else {
      where.employmentStatus = EmploymentStatus.ACTIVE;
    }

    // Filters
    if (req.query.department) {
      where.departmentId = req.query.department as string;
    }
    if (req.query.search) {
      const search = req.query.search as string;
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (req.query.joiningDateFrom || req.query.joiningDateTo) {
      where.joiningDate = {};
      if (req.query.joiningDateFrom) where.joiningDate.gte = new Date(req.query.joiningDateFrom as string);
      if (req.query.joiningDateTo) where.joiningDate.lte = new Date(req.query.joiningDateTo as string);
    }

    const [items, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          department: { select: { name: true } },
          designation: { select: { name: true } },
        },
      }),
      prisma.employee.count({ where }),
    ]);

    sendPaginated(res, items, total, page, limit);
  } catch (error) {
    next(error);
  }
}

// ─── Create Employee (FR-EMP-01, FR-EMP-02, FR-EMP-03) ──

export async function createEmployee(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createEmployeeSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input',
        parsed.error.errors.map(e => ({ field: e.path.join('.'), issue: e.message }))
      );
    }

    const data = parsed.data;

    // Validate department exists and is active
    const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
    if (!dept || !dept.isActive) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Selected department is invalid or inactive');
    }

    // Validate designation exists and is active
    const desig = await prisma.designation.findUnique({ where: { id: data.designationId } });
    if (!desig || !desig.isActive) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Selected designation is invalid or inactive');
    }

    // Validate manager (FR-EMP-05) — must be active, cannot be self
    if (data.managerId) {
      const manager = await prisma.employee.findUnique({ where: { id: data.managerId } });
      if (!manager || manager.employmentStatus !== EmploymentStatus.ACTIVE) {
        throw new AppError(400, 'INVALID_MANAGER_REFERENCE', 'Selected manager is not a valid active employee');
      }
    }

    const employeeCode = await getNextEmployeeCode();

    const employee = await prisma.employee.create({
      data: {
        employeeCode,
        fullName: data.fullName,
        email: data.email.toLowerCase(),
        phone: data.phone || null,
        departmentId: data.departmentId,
        designationId: data.designationId,
        managerId: data.managerId || null,
        joiningDate: new Date(data.joiningDate),
        emergencyContactName: data.emergencyContactName || null,
        emergencyContactRelationship: data.emergencyContactRelationship || null,
        emergencyContactPhone: data.emergencyContactPhone || null,
        createdById: req.user?.id,
        updatedById: req.user?.id,
      },
      include: {
        department: { select: { name: true } },
        designation: { select: { name: true } },
        manager: { select: { id: true, fullName: true } },
      },
    });

    // Create notification (FR-NOTIF-03)
    await prisma.notification.create({
      data: {
        type: NotificationType.EMPLOYEE_ADDED,
        message: `New employee "${employee.fullName}" added to ${employee.department.name}`,
        referenceType: ReferenceType.EMPLOYEE,
        referenceId: employee.id,
      },
    });

    sendSuccess(res, employee, 201);
  } catch (error) {
    next(error);
  }
}

// ─── Create from Candidate (FR-EMP-02) ───────────────

export async function createFromCandidate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { candidateId } = req.params;

    const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!candidate) {
      throw new AppError(404, 'CANDIDATE_NOT_FOUND', 'Candidate not found');
    }
    if (candidate.status !== CandidateStatus.JOINED) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Only candidates with status "Joined" can be converted to employees');
    }

    // Check if already converted
    const existingEmployee = await prisma.employee.findFirst({ where: { candidateId } });
    if (existingEmployee) {
      throw new AppError(409, 'ALREADY_CONVERTED', 'This candidate has already been converted to an employee');
    }

    // Merge candidate data with the additional employee fields from request body
    const parsed = createEmployeeSchema.partial({
      fullName: true,
      email: true,
    }).safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input',
        parsed.error.errors.map(e => ({ field: e.path.join('.'), issue: e.message }))
      );
    }

    const data = parsed.data;
    const employeeCode = await getNextEmployeeCode();

    const employee = await prisma.employee.create({
      data: {
        employeeCode,
        candidateId,
        fullName: data.fullName || candidate.name,
        email: (data.email || candidate.email).toLowerCase(),
        phone: data.phone || candidate.phone,
        departmentId: data.departmentId!,
        designationId: data.designationId!,
        managerId: data.managerId || null,
        joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
        emergencyContactName: data.emergencyContactName || null,
        emergencyContactRelationship: data.emergencyContactRelationship || null,
        emergencyContactPhone: data.emergencyContactPhone || null,
        createdById: req.user?.id,
        updatedById: req.user?.id,
      },
      include: {
        department: { select: { name: true } },
        designation: { select: { name: true } },
      },
    });

    // Notification
    await prisma.notification.create({
      data: {
        type: NotificationType.EMPLOYEE_ADDED,
        message: `"${employee.fullName}" converted from candidate to employee`,
        referenceType: ReferenceType.EMPLOYEE,
        referenceId: employee.id,
      },
    });

    sendSuccess(res, employee, 201);
  } catch (error) {
    next(error);
  }
}

// ─── Get Employee Detail ─────────────────────────────

export async function getEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id },
      include: {
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, name: true } },
        manager: { select: { id: true, fullName: true, employeeCode: true } },
        reports: { select: { id: true, fullName: true, employeeCode: true }, where: { employmentStatus: EmploymentStatus.ACTIVE } },
        createdBy: { select: { name: true } },
        updatedBy: { select: { name: true } },
      },
    });

    if (!employee) {
      throw new AppError(404, 'EMPLOYEE_NOT_FOUND', 'Employee not found');
    }

    // Get documents
    const documents = await prisma.document.findMany({
      where: { ownerId: employee.id, ownerType: OwnerType.EMPLOYEE },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, { ...employee, documents });
  } catch (error) {
    next(error);
  }
}

// ─── Update Employee ─────────────────────────────────

export async function updateEmployee(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createEmployeeSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input',
        parsed.error.errors.map(e => ({ field: e.path.join('.'), issue: e.message }))
      );
    }

    const data = parsed.data;
    const employeeId = req.params.id;

    const existing = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!existing) {
      throw new AppError(404, 'EMPLOYEE_NOT_FOUND', 'Employee not found');
    }

    // Self-reference check (AC-EMP-03)
    if (data.managerId && data.managerId === employeeId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'An employee cannot be their own manager');
    }

    const employee = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        ...data,
        email: data.email?.toLowerCase(),
        joiningDate: data.joiningDate ? new Date(data.joiningDate) : undefined,
        updatedById: req.user?.id,
      },
      include: {
        department: { select: { name: true } },
        designation: { select: { name: true } },
        manager: { select: { id: true, fullName: true } },
      },
    });

    sendSuccess(res, employee);
  } catch (error) {
    next(error);
  }
}

// ─── Deactivate Employee (FR-EMP-09, FR-EMP-10) ─────

export async function deactivateEmployee(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const employeeId = req.params.id;
    const confirm = req.query.confirm === 'true';

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        reports: {
          where: { employmentStatus: EmploymentStatus.ACTIVE },
          select: { id: true, fullName: true },
        },
      },
    });

    if (!employee) {
      throw new AppError(404, 'EMPLOYEE_NOT_FOUND', 'Employee not found');
    }

    if (employee.employmentStatus === EmploymentStatus.INACTIVE) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Employee is already inactive');
    }

    // Check for active reports (FR-EMP-10)
    if (employee.reports.length > 0 && !confirm) {
      throw new AppError(409, 'HAS_ACTIVE_REPORTS',
        `This employee manages ${employee.reports.length} active employee(s). Confirm to proceed with deactivation.`,
      );
    }

    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        employmentStatus: EmploymentStatus.INACTIVE,
        updatedById: req.user?.id,
      },
    });

    sendSuccess(res, { id: employeeId, employmentStatus: EmploymentStatus.INACTIVE });
  } catch (error) {
    next(error);
  }
}

// ─── Upload Employee Document (FR-EMP-07) ────────────

export async function uploadEmployeeDocument(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      throw new AppError(400, 'VALIDATION_ERROR', 'File is required');
    }

    const parsed = uploadDocSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Valid document type is required (OFFER_LETTER, ID_PROOF, or CERTIFICATE)');
    }

    const employeeId = req.params.id;
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      throw new AppError(404, 'EMPLOYEE_NOT_FOUND', 'Employee not found');
    }

    const s3Key = generateS3Key('employee', employeeId, parsed.data.docType, req.file.originalname);

    await s3Client.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }));

    const document = await prisma.document.create({
      data: {
        ownerType: OwnerType.EMPLOYEE,
        ownerId: employeeId,
        docType: parsed.data.docType as DocType,
        fileName: req.file.originalname,
        s3Key,
        mimeType: req.file.mimetype,
        sizeBytes: BigInt(req.file.size),
        uploadedById: req.user?.id,
      },
    });

    sendSuccess(res, { documentId: document.id, fileName: document.fileName, docType: document.docType }, 201);
  } catch (error) {
    next(error);
  }
}

// ─── Get Employee Documents ──────────────────────────

export async function getEmployeeDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const documents = await prisma.document.findMany({
      where: { ownerId: req.params.id, ownerType: OwnerType.EMPLOYEE },
      orderBy: { createdAt: 'desc' },
    });

    // Generate signed URLs for each document
    const docsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: doc.s3Key });
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
        return {
          ...doc,
          sizeBytes: doc.sizeBytes.toString(), // BigInt serialization
          downloadUrl: signedUrl,
        };
      })
    );

    sendSuccess(res, docsWithUrls);
  } catch (error) {
    next(error);
  }
}
