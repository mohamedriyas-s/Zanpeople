/**
 * Unit Tests: Auth Module
 * Tests login, logout, forgot-password, reset-password, and get-me endpoints.
 * Prisma is fully mocked so no real DB is needed.
 */

import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ─── Mock Dependencies ──────────────────────────────────────────────────────

jest.mock('../../../config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    passwordResetToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../../config/mail', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-key-at-least-32-chars',
    FRONTEND_URL: 'http://localhost:3000',
  },
}));

jest.mock('../../../utils/token', () => ({
  generateResetToken: jest.fn().mockReturnValue('raw-reset-token'),
  hashToken: jest.fn().mockReturnValue('hashed-reset-token'),
}));

// ─── Import after mocks ─────────────────────────────────────────────────────

import { login, logout, forgotPassword, resetPassword, getMe } from '../auth.controller';
import { prisma } from '../../../config/database';

// ─── Helpers ────────────────────────────────────────────────────────────────

const mockRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

// ─── Test Data ───────────────────────────────────────────────────────────────

const HASHED_PASSWORD = bcrypt.hashSync('Password1!', 10);

const MOCK_USER = {
  id: 'user-uuid-1',
  name: 'Test Admin',
  email: 'admin@zanpeople.com',
  passwordHash: HASHED_PASSWORD,
  role: 'ADMIN' as const,
  isActive: true,
  failedLoginAttempts: 0,
  lockedUntil: null,
};

// ─── Login Tests ─────────────────────────────────────────────────────────────

describe('Auth — login()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 400 on missing/invalid body', async () => {
    const req = { body: {} } as Request;
    const res = mockRes();
    await login(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
    const err = (mockNext as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('should return 401 for non-existent user', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const req = { body: { email: 'ghost@zanpeople.com', password: 'any' } } as Request;
    const res = mockRes();
    await login(req, res, mockNext);
    const err = (mockNext as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('INVALID_CREDENTIALS');
  });

  it('should return 401 for inactive user', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...MOCK_USER, isActive: false });
    const req = { body: { email: 'admin@zanpeople.com', password: 'Password1!' } } as Request;
    const res = mockRes();
    await login(req, res, mockNext);
    const err = (mockNext as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });

  it('should return 423 when account is locked', async () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...MOCK_USER, lockedUntil: futureDate });
    const req = { body: { email: 'admin@zanpeople.com', password: 'Password1!' } } as Request;
    const res = mockRes();
    await login(req, res, mockNext);
    const err = (mockNext as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(423);
    expect(err.code).toBe('ACCOUNT_LOCKED');
  });

  it('should return 401 for wrong password and increment failed attempts', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(MOCK_USER);
    (prisma.user.update as jest.Mock).mockResolvedValue({});
    const req = { body: { email: 'admin@zanpeople.com', password: 'WrongPass1!' } } as Request;
    const res = mockRes();
    await login(req, res, mockNext);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ failedLoginAttempts: 1 }) })
    );
    const err = (mockNext as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });

  it('should lock account after 5 failed attempts', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...MOCK_USER, failedLoginAttempts: 4 });
    (prisma.user.update as jest.Mock).mockResolvedValue({});
    const req = { body: { email: 'admin@zanpeople.com', password: 'WrongPass1!' } } as Request;
    const res = mockRes();
    await login(req, res, mockNext);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lockedUntil: expect.any(Date), failedLoginAttempts: 0 }),
      })
    );
  });

  it('should return a JWT token on successful login', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(MOCK_USER);
    (prisma.user.update as jest.Mock).mockResolvedValue({});
    const req = { body: { email: 'admin@zanpeople.com', password: 'Password1!' } } as Request;
    const res = mockRes();
    await login(req, res, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonCall.data).toHaveProperty('token');
    const decoded = jwt.verify(jsonCall.data.token, 'test-secret-key-at-least-32-chars') as any;
    expect(decoded.userId).toBe(MOCK_USER.id);
    expect(decoded.role).toBe(MOCK_USER.role);
  });

  it('should reset failed attempts on successful login', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...MOCK_USER, failedLoginAttempts: 2 });
    (prisma.user.update as jest.Mock).mockResolvedValue({});
    const req = { body: { email: 'admin@zanpeople.com', password: 'Password1!' } } as Request;
    const res = mockRes();
    await login(req, res, mockNext);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { failedLoginAttempts: 0, lockedUntil: null } })
    );
  });
});

// ─── Logout Tests ─────────────────────────────────────────────────────────────

describe('Auth — logout()', () => {
  it('should always return success', async () => {
    const req = {} as Request;
    const res = mockRes();
    await logout(req, res);
    const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonCall.data.message).toBe('Logged out successfully');
  });
});

// ─── Forgot Password Tests ────────────────────────────────────────────────────

describe('Auth — forgotPassword()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 400 for invalid email format', async () => {
    const req = { body: { email: 'not-an-email' } } as Request;
    const res = mockRes();
    await forgotPassword(req, res, mockNext);
    const err = (mockNext as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(400);
  });

  it('should always return success even if user does not exist (no enumeration)', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const req = { body: { email: 'ghost@test.com' } } as Request;
    const res = mockRes();
    await forgotPassword(req, res, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonCall.data.message).toContain('reset link has been sent');
  });

  it('should create a reset token and send email for existing active user', async () => {
    const { sendEmail } = require('../../../config/mail');
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(MOCK_USER);
    (prisma.passwordResetToken.create as jest.Mock).mockResolvedValue({});
    const req = { body: { email: 'admin@zanpeople.com' } } as Request;
    const res = mockRes();
    await forgotPassword(req, res, mockNext);
    expect(prisma.passwordResetToken.create).toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalled();
  });
});

// ─── Reset Password Tests ─────────────────────────────────────────────────────

describe('Auth — resetPassword()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 400 on missing token or short password', async () => {
    const req = { body: { token: '', newPassword: 'short' } } as Request;
    const res = mockRes();
    await resetPassword(req, res, mockNext);
    const err = (mockNext as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(400);
  });

  it('should return 400 for password without a number', async () => {
    const req = { body: { token: 'valid-token', newPassword: 'NoNumbers!' } } as Request;
    const res = mockRes();
    await resetPassword(req, res, mockNext);
    const err = (mockNext as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(400);
  });

  it('should return 400 for invalid or expired token', async () => {
    (prisma.passwordResetToken.findFirst as jest.Mock).mockResolvedValue(null);
    const req = { body: { token: 'bad-token', newPassword: 'ValidPass1!' } } as Request;
    const res = mockRes();
    await resetPassword(req, res, mockNext);
    const err = (mockNext as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('INVALID_OR_EXPIRED_TOKEN');
  });

  it('should update password and mark token as used on success', async () => {
    (prisma.passwordResetToken.findFirst as jest.Mock).mockResolvedValue({
      id: 'token-1', userId: MOCK_USER.id,
    });
    (prisma.$transaction as jest.Mock).mockResolvedValue([]);
    const req = { body: { token: 'valid-token', newPassword: 'NewPass1!' } } as Request;
    const res = mockRes();
    await resetPassword(req, res, mockNext);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
    const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonCall.data.message).toContain('Password updated');
  });
});

// ─── Get Me Tests ─────────────────────────────────────────────────────────────

describe('Auth — getMe()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 401 if no user in request', async () => {
    const req = { user: undefined } as any;
    const res = mockRes();
    await getMe(req, res, mockNext);
    const err = (mockNext as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });

  it('should return user data for authenticated user', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: MOCK_USER.id, name: MOCK_USER.name, email: MOCK_USER.email, role: MOCK_USER.role, createdAt: new Date(),
    });
    const req = { user: { id: MOCK_USER.id, role: MOCK_USER.role } } as any;
    const res = mockRes();
    await getMe(req, res, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonCall.data).toHaveProperty('email', MOCK_USER.email);
  });
});
