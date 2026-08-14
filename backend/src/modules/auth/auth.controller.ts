import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { sendEmail } from '../../config/mail';
import { AppError } from '../../middleware/errorHandler';
import { AuthenticatedRequest } from '../../middleware/auth';
import { sendSuccess } from '../../utils/response';
import { generateResetToken, hashToken } from '../../utils/token';
import { z } from 'zod';

// ─── Validators ──────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Valid email is required'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/\d/, 'Password must contain at least one number'),
});

// ─── Login ───────────────────────────────────────────

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', 
        parsed.error.errors.map(e => ({ field: e.path.join('.'), issue: e.message }))
      );
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    // Check if account is locked (FR-AUTH-04)
    if (user && user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError(423, 'ACCOUNT_LOCKED', 'Account temporarily locked due to too many failed login attempts. Try again later.');
    }

    // Generic error — no user enumeration (FR-AUTH-03)
    if (!user || !user.isActive) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      // Increment failed login attempts
      const failedAttempts = user.failedLoginAttempts + 1;
      const updateData: any = { failedLoginAttempts: failedAttempts };

      // Lock after 5 consecutive failures (FR-AUTH-04)
      if (failedAttempts >= 5) {
        updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        updateData.failedLoginAttempts = 0;
      }

      await prisma.user.update({ where: { id: user.id }, data: updateData });
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Reset failed attempts on successful login
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    // Generate JWT (FR-AUTH-02)
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      env.JWT_SECRET as jwt.Secret,
      { expiresIn: '24h' } as jwt.SignOptions
    );

    sendSuccess(res, {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── Logout ──────────────────────────────────────────

export async function logout(_req: Request, res: Response): Promise<void> {
  // JWT is stateless; client discards token. Server-side blacklist optional for MVP.
  sendSuccess(res, { message: 'Logged out successfully' });
}

// ─── Forgot Password ────────────────────────────────

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Valid email is required',
        parsed.error.errors.map(e => ({ field: e.path.join('.'), issue: e.message }))
      );
    }

    const { email } = parsed.data;

    // Always return success — no user enumeration (FR-AUTH-05)
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (user && user.isActive) {
      // Generate reset token
      const resetToken = generateResetToken();
      const tokenHash = hashToken(resetToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      // Send reset email via Nodemailer
      const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      await sendEmail({
        to: user.email,
        subject: 'Zansphere HR Portal — Password Reset',
        html: `
          <div style="font-family: 'Inter', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #1a1a1a;">Password Reset</h2>
            <p style="color: #555;">You requested a password reset for your Zansphere HR Portal account.</p>
            <p style="color: #555;">Click the button below to reset your password. This link expires in 1 hour.</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">Reset Password</a>
            <p style="color: #999; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });
    }

    // Always return the same message
    sendSuccess(res, { message: 'If this email exists, a reset link has been sent.' });
  } catch (error) {
    next(error);
  }
}

// ─── Reset Password ─────────────────────────────────

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input',
        parsed.error.errors.map(e => ({ field: e.path.join('.'), issue: e.message }))
      );
    }

    const { token, newPassword } = parsed.data;
    const tokenHash = hashToken(token);

    const resetRecord = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetRecord) {
      throw new AppError(400, 'INVALID_OR_EXPIRED_TOKEN', 'This reset link is invalid or has expired');
    }

    // Hash new password and update user
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { used: true },
      }),
    ]);

    sendSuccess(res, { message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
}

// ─── Get Current User ────────────────────────────────

export async function getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
}
