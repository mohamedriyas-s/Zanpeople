/**
 * Unit Tests: Settings Module
 * Tests company profile, departments, designations, and user management.
 * Prisma is fully mocked.
 */

import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';

// ─── Mock Dependencies ──────────────────────────────────────────────────────

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

jest.mock('../../../config/database', () => ({
  prisma: {
    companyProfile: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    department: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    designation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import {
  getCompanyProfile,
  updateCompanyProfile,
  listDepartments,
  createDepartment,
  updateDepartment,
  toggleDepartment,
  listDesignations,
  createDesignation,
  updateDesignation,
  toggleDesignation,
  listUsers,
  createUser,
} from '../settings.controller';
import { prisma } from '../../../config/database';

// ─── Helpers ────────────────────────────────────────────────────────────────

const mockRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

const reqObj = (overrides = {}) =>
  ({
    body: {},
    query: {},
    params: {},
    get: jest.fn(),
    ...overrides,
  } as any);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Settings Module', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('Company Profile', () => {
    it('should create profile on first get if missing', async () => {
      (prisma.companyProfile.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.companyProfile.create as jest.Mock).mockResolvedValue({ id: 'cp-1', companyName: 'Zansphere' });

      const req = reqObj();
      const res = mockRes();
      await getCompanyProfile(req, res, mockNext);

      expect(prisma.companyProfile.create).toHaveBeenCalled();
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.id).toBe('cp-1');
    });

    it('should return existing profile', async () => {
      (prisma.companyProfile.findFirst as jest.Mock).mockResolvedValue({ id: 'cp-1', companyName: 'Zansphere' });

      const req = reqObj();
      const res = mockRes();
      await getCompanyProfile(req, res, mockNext);

      expect(prisma.companyProfile.create).not.toHaveBeenCalled();
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.id).toBe('cp-1');
    });

    it('should return 400 on invalid update profile', async () => {
      const req = reqObj({ body: { companyName: '' } });
      const res = mockRes();
      await updateCompanyProfile(req, res, mockNext);
      expect((mockNext as jest.Mock).mock.calls[0][0].statusCode).toBe(400);
    });

    it('should update company profile', async () => {
      (prisma.companyProfile.findFirst as jest.Mock).mockResolvedValue({ id: 'cp-1' });
      (prisma.companyProfile.update as jest.Mock).mockResolvedValue({ id: 'cp-1', companyName: 'New Name' });

      const req = reqObj({ body: { companyName: 'New Name' } });
      const res = mockRes();
      await updateCompanyProfile(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(prisma.companyProfile.update).toHaveBeenCalled();
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.companyName).toBe('New Name');
    });
  });

  describe('Departments', () => {
    it('should list active departments by default', async () => {
      (prisma.department.findMany as jest.Mock).mockResolvedValue([{ id: 'd1', isActive: true }]);
      const req = reqObj();
      const res = mockRes();
      await listDepartments(req, res, mockNext);
      expect(prisma.department.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isActive: true } }));
    });

    it('should list all departments if activeOnly is false', async () => {
      (prisma.department.findMany as jest.Mock).mockResolvedValue([{ id: 'd1' }]);
      const req = reqObj({ query: { activeOnly: 'false' } });
      const res = mockRes();
      await listDepartments(req, res, mockNext);
      expect(prisma.department.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    });

    it('should return 409 if department already exists', async () => {
      (prisma.department.findUnique as jest.Mock).mockResolvedValue({ id: 'd1' });
      const req = reqObj({ body: { name: 'Eng' } });
      const res = mockRes();
      await createDepartment(req, res, mockNext);
      expect((mockNext as jest.Mock).mock.calls[0][0].statusCode).toBe(409);
    });

    it('should create department successfully', async () => {
      (prisma.department.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.department.create as jest.Mock).mockResolvedValue({ id: 'd1', name: 'Eng' });
      const req = reqObj({ body: { name: 'Eng' } });
      const res = mockRes();
      await createDepartment(req, res, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.id).toBe('d1');
    });

    it('should update department', async () => {
      (prisma.department.update as jest.Mock).mockResolvedValue({ id: 'd1', name: 'Marketing' });
      const req = reqObj({ params: { id: 'd1' }, body: { name: 'Marketing' } });
      const res = mockRes();
      await updateDepartment(req, res, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should toggle department active status', async () => {
      (prisma.department.findUnique as jest.Mock).mockResolvedValue({ id: 'd1', isActive: true });
      (prisma.department.update as jest.Mock).mockResolvedValue({ id: 'd1', isActive: false });
      const req = reqObj({ params: { id: 'd1' } });
      const res = mockRes();
      await toggleDepartment(req, res, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(prisma.department.update).toHaveBeenCalledWith({
        where: { id: 'd1' }, data: { isActive: false }
      });
    });
  });

  describe('Designations', () => {
    it('should list designations', async () => {
      (prisma.designation.findMany as jest.Mock).mockResolvedValue([{ id: 'ds1' }]);
      const req = reqObj();
      const res = mockRes();
      await listDesignations(req, res, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should create designation successfully', async () => {
      (prisma.designation.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.designation.create as jest.Mock).mockResolvedValue({ id: 'ds1' });
      const req = reqObj({ body: { name: 'SE' } });
      const res = mockRes();
      await createDesignation(req, res, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should update designation', async () => {
      (prisma.designation.update as jest.Mock).mockResolvedValue({ id: 'ds1' });
      const req = reqObj({ params: { id: 'ds1' }, body: { name: 'SE II' } });
      const res = mockRes();
      await updateDesignation(req, res, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should toggle designation', async () => {
      (prisma.designation.findUnique as jest.Mock).mockResolvedValue({ id: 'ds1', isActive: true });
      (prisma.designation.update as jest.Mock).mockResolvedValue({ id: 'ds1', isActive: false });
      const req = reqObj({ params: { id: 'ds1' } });
      const res = mockRes();
      await toggleDesignation(req, res, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('User Management', () => {
    it('should list users', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 'u1' }]);
      const req = reqObj();
      const res = mockRes();
      await listUsers(req, res, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid user input', async () => {
      const req = reqObj({ body: { email: 'bad-email' } });
      const res = mockRes();
      await createUser(req, res, mockNext);
      expect((mockNext as jest.Mock).mock.calls[0][0].statusCode).toBe(400);
    });

    it('should return 409 if email exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u1' });
      const req = reqObj({ body: { name: 'A', email: 'test@example.com', password: 'password', role: 'HR' } });
      const res = mockRes();
      await createUser(req, res, mockNext);
      expect((mockNext as jest.Mock).mock.calls[0][0].statusCode).toBe(409);
    });

    it('should create user and hash password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({ id: 'u2', email: 'test@example.com' });
      const req = reqObj({ body: { name: 'A', email: 'test@example.com', password: 'password', role: 'HR' } });
      const res = mockRes();
      
      await createUser(req, res, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith('password', 10);
      expect(prisma.user.create).toHaveBeenCalled();
    });
  });
});
