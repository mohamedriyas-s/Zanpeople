import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import { z } from 'zod';

// ─── Company Profile ─────────────────────────────────

export async function getCompanyProfile(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let profile = await prisma.companyProfile.findFirst();
    if (!profile) {
      profile = await prisma.companyProfile.create({
        data: { companyName: 'Zansphere Private Limited' },
      });
    }
    sendSuccess(res, profile);
  } catch (error) {
    next(error);
  }
}

export async function updateCompanyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schema = z.object({
      companyName: z.string().min(1).max(150),
      logoUrl: z.string().max(500).optional().nullable(),
      address: z.string().max(255).optional().nullable(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input',
        parsed.error.errors.map(e => ({ field: e.path.join('.'), issue: e.message }))
      );
    }

    let profile = await prisma.companyProfile.findFirst();
    if (profile) {
      profile = await prisma.companyProfile.update({ where: { id: profile.id }, data: parsed.data });
    } else {
      profile = await prisma.companyProfile.create({ data: parsed.data });
    }

    sendSuccess(res, profile);
  } catch (error) {
    next(error);
  }
}

// ─── Departments ─────────────────────────────────────

export async function listDepartments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const activeOnly = req.query.activeOnly !== 'false';
    const departments = await prisma.department.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { name: 'asc' },
    });
    sendSuccess(res, departments);
  } catch (error) {
    next(error);
  }
}

export async function createDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schema = z.object({ name: z.string().min(1, 'Name is required').max(100) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input',
        parsed.error.errors.map(e => ({ field: e.path.join('.'), issue: e.message }))
      );
    }

    const existing = await prisma.department.findUnique({ where: { name: parsed.data.name } });
    if (existing) {
      throw new AppError(409, 'DUPLICATE', 'A department with this name already exists');
    }

    const department = await prisma.department.create({ data: parsed.data });
    sendSuccess(res, department, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schema = z.object({ name: z.string().min(1).max(100) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input',
        parsed.error.errors.map(e => ({ field: e.path.join('.'), issue: e.message }))
      );
    }

    const department = await prisma.department.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    sendSuccess(res, department);
  } catch (error) {
    next(error);
  }
}

export async function toggleDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dept = await prisma.department.findUnique({ where: { id: req.params.id } });
    if (!dept) {
      throw new AppError(404, 'NOT_FOUND', 'Department not found');
    }

    // Soft deactivate — historical records preserved (FR-SET-06)
    const updated = await prisma.department.update({
      where: { id: req.params.id },
      data: { isActive: !dept.isActive },
    });
    sendSuccess(res, updated);
  } catch (error) {
    next(error);
  }
}

// ─── Designations ────────────────────────────────────

export async function listDesignations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const activeOnly = req.query.activeOnly !== 'false';
    const designations = await prisma.designation.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { name: 'asc' },
    });
    sendSuccess(res, designations);
  } catch (error) {
    next(error);
  }
}

export async function createDesignation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schema = z.object({ name: z.string().min(1, 'Name is required').max(100) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input',
        parsed.error.errors.map(e => ({ field: e.path.join('.'), issue: e.message }))
      );
    }

    const existing = await prisma.designation.findUnique({ where: { name: parsed.data.name } });
    if (existing) {
      throw new AppError(409, 'DUPLICATE', 'A designation with this name already exists');
    }

    const designation = await prisma.designation.create({ data: parsed.data });
    sendSuccess(res, designation, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateDesignation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schema = z.object({ name: z.string().min(1).max(100) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input',
        parsed.error.errors.map(e => ({ field: e.path.join('.'), issue: e.message }))
      );
    }

    const designation = await prisma.designation.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    sendSuccess(res, designation);
  } catch (error) {
    next(error);
  }
}

export async function toggleDesignation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const desig = await prisma.designation.findUnique({ where: { id: req.params.id } });
    if (!desig) {
      throw new AppError(404, 'NOT_FOUND', 'Designation not found');
    }

    const updated = await prisma.designation.update({
      where: { id: req.params.id },
      data: { isActive: !desig.isActive },
    });
    sendSuccess(res, updated);
  } catch (error) {
    next(error);
  }
}

// ─── User Management (Admin only, FR-AUTH-08) ────────

export async function listUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    sendSuccess(res, users);
  } catch (error) {
    next(error);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schema = z.object({
      name: z.string().min(1, 'Name is required').max(150),
      email: z.string().email('Valid email is required'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      role: z.enum(['ADMIN', 'HR']),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input',
        parsed.error.errors.map(e => ({ field: e.path.join('.'), issue: e.message }))
      );
    }

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (existing) {
      throw new AppError(409, 'DUPLICATE', 'A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash,
        role: parsed.data.role,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    sendSuccess(res, user, 201);
  } catch (error) {
    next(error);
  }
}
