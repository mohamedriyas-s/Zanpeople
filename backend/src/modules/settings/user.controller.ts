import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { AuthenticatedRequest } from '../../middleware/auth';
import { sendSuccess } from '../../utils/response';
import { z } from 'zod';

// ─── Get My Profile (FR-SET-05) ──────────────────────

export async function getMyProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
}

// ─── Update My Profile ──────────────────────────────

export async function updateMyProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const schema = z.object({
      name: z.string().min(1).max(150).optional(),
      email: z.string().email().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input',
        parsed.error.errors.map(e => ({ field: e.path.join('.'), issue: e.message }))
      );
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...parsed.data,
        email: parsed.data.email?.toLowerCase(),
      },
      select: { id: true, name: true, email: true, role: true },
    });

    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
}

// ─── Change Password (FR-SET-05) ─────────────────────

export async function changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z.string().min(8, 'New password must be at least 8 characters').regex(/\d/, 'New password must contain at least one number'),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input',
        parsed.error.errors.map(e => ({ field: e.path.join('.'), issue: e.message }))
      );
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }

    const validCurrent = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!validCurrent) {
      throw new AppError(400, 'INVALID_PASSWORD', 'Current password is incorrect');
    }

    const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { passwordHash: newHash },
    });

    sendSuccess(res, { message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
}
