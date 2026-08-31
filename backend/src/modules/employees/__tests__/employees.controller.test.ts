/**
 * Unit Tests: Employees Module
 * Tests listEmployees, createEmployee, createFromCandidate, and getEmployee.
 * Prisma is fully mocked — no real DB is needed.
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../middleware/auth';

// ─── Mock Dependencies ──────────────────────────────────────────────────────

jest.mock('../../../config/database', () => ({
  prisma: {
    employee: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    candidate: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    department: {
      findUnique: jest.fn(),
    },
    designation: {
      findUnique: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    candidateTimeline: {
      create: jest.fn(),
    },
    document: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

jest.mock('../../../config/s3', () => ({
  s3Client: {},
  S3_BUCKET: 'test-bucket',
  generateS3Key: jest.fn(),
}));

jest.mock('../../../utils/token', () => ({
  generateEmployeeCode: jest.fn().mockReturnValue('EMP-2026-001'),
}));

jest.mock('../../../config/env', () => ({
  env: { EMPLOYEE_ID_PREFIX: 'EMP' },
}));

// ─── Import after mocks ─────────────────────────────────────────────────────

import {
  listEmployees,
  createEmployee,
  createFromCandidate,
  getEmployee,
} from '../employees.controller';
import { prisma } from '../../../config/database';

// ─── Helpers ────────────────────────────────────────────────────────────────

const mockRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockNext: NextFunction = jest.fn();

const authReq = (overrides = {}) =>
  ({
    user: { id: 'user-uuid-1', role: 'HR' },
    body: {},
    query: {},
    params: {},
    ...overrides,
  } as any);

// ─── Test Data ────────────────────────────────────────────────────────────────

const MOCK_DEPT = { id: '11111111-1111-1111-1111-111111111111', name: 'Engineering', isActive: true };
const MOCK_DESIG = { id: '22222222-2222-2222-2222-222222222222', name: 'Developer', isActive: true };

const MOCK_EMPLOYEE = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  employeeCode: 'EMP-2026-001',
  fullName: 'Jane Doe',
  email: 'jane@zanpeople.com',
  phone: '+919876543210',
  departmentId: '11111111-1111-1111-1111-111111111111',
  designationId: '22222222-2222-2222-2222-222222222222',
  employmentStatus: 'ACTIVE',
  joiningDate: new Date('2026-01-01'),
  department: { name: 'Engineering' },
  designation: { name: 'Developer' },
  interviews: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const MOCK_CANDIDATE = {
  id: 'cand-uuid-1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+919876543210',
  status: 'ACCEPTED',
  positionApplied: 'Frontend Developer',
};

const VALID_EMPLOYEE_BODY = {
  fullName: 'Jane Doe',
  email: 'jane@zanpeople.com',
  departmentId: MOCK_DEPT.id,
  designationId: MOCK_DESIG.id,
  joiningDate: '2026-01-01',
};

// ─── listEmployees Tests ──────────────────────────────────────────────────────

describe('Employees — listEmployees()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return paginated employees defaulting to ACTIVE status', async () => {
    (prisma.employee.findMany as jest.Mock).mockResolvedValue([MOCK_EMPLOYEE]);
    (prisma.employee.count as jest.Mock).mockResolvedValue(1);
    const req = authReq({ query: {} });
    const res = mockRes();
    await listEmployees(req, res, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(prisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ employmentStatus: 'ACTIVE' }) })
    );
    const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonCall.data.items).toHaveLength(1);
  });

  it('should filter by department', async () => {
    (prisma.employee.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.employee.count as jest.Mock).mockResolvedValue(0);
    const req = authReq({ query: { department: MOCK_DEPT.id } });
    const res = mockRes();
    await listEmployees(req, res, mockNext);
    expect(prisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ departmentId: MOCK_DEPT.id }) })
    );
  });

  it('should filter by search term across name, code, and email', async () => {
    (prisma.employee.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.employee.count as jest.Mock).mockResolvedValue(0);
    const req = authReq({ query: { search: 'jane' } });
    const res = mockRes();
    await listEmployees(req, res, mockNext);
    expect(prisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) })
    );
  });
});

// ─── createEmployee Tests ─────────────────────────────────────────────────────

describe('Employees — createEmployee()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 400 when required fields are missing', async () => {
    const req = authReq({ body: {} });
    const res = mockRes();
    await createEmployee(req, res, mockNext);
    const err = (mockNext as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for invalid email format', async () => {
    const req = authReq({ body: { ...VALID_EMPLOYEE_BODY, email: 'not-an-email' } });
    const res = mockRes();
    await createEmployee(req, res, mockNext);
    const err = (mockNext as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(400);
  });

  it('should return 400 for inactive department', async () => {
    (prisma.department.findUnique as jest.Mock).mockResolvedValue({ ...MOCK_DEPT, isActive: false });
    const req = authReq({ body: VALID_EMPLOYEE_BODY });
    const res = mockRes();
    await createEmployee(req, res, mockNext);
    const err = (mockNext as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    // The error wraps in generic "Invalid input" from the schema layer, just check the status
  });

  it('should return 400 for non-existent department', async () => {
    (prisma.department.findUnique as jest.Mock).mockResolvedValue(null);
    const req = authReq({ body: VALID_EMPLOYEE_BODY });
    const res = mockRes();
    await createEmployee(req, res, mockNext);
    const err = (mockNext as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(400);
  });

  it('should create employee and return 201 on valid input', async () => {
    (prisma.department.findUnique as jest.Mock).mockResolvedValue(MOCK_DEPT);
    (prisma.designation.findUnique as jest.Mock).mockResolvedValue(MOCK_DESIG);
    // getNextEmployeeCode calls employee.findFirst
    (prisma.employee.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.employee.create as jest.Mock).mockResolvedValue(MOCK_EMPLOYEE);
    (prisma.notification.create as jest.Mock).mockResolvedValue({});
    const req = authReq({ body: VALID_EMPLOYEE_BODY });
    const res = mockRes();
    await createEmployee(req, res, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonCall.data).toHaveProperty('fullName', 'Jane Doe');
    // sendSuccess is called with statusCode 201
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

// ─── createFromCandidate Tests ────────────────────────────────────────────────

describe('Employees — createFromCandidate()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 404 when candidate is not found', async () => {
    (prisma.candidate.findUnique as jest.Mock).mockResolvedValue(null);
    const req = authReq({ params: { candidateId: 'non-existent' }, body: VALID_EMPLOYEE_BODY });
    const res = mockRes();
    await createFromCandidate(req, res, mockNext);
    const err = (mockNext as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('CANDIDATE_NOT_FOUND');
  });

  it('should return 400 if candidate status is not ACCEPTED', async () => {
    (prisma.candidate.findUnique as jest.Mock).mockResolvedValue({ ...MOCK_CANDIDATE, status: 'SHORTLISTED' });
    const req = authReq({ params: { candidateId: 'cand-uuid-1' }, body: VALID_EMPLOYEE_BODY });
    const res = mockRes();
    await createFromCandidate(req, res, mockNext);
    const err = (mockNext as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.message).toContain('Accepted');
  });

  it('should return 409 if candidate already converted', async () => {
    (prisma.candidate.findUnique as jest.Mock).mockResolvedValue(MOCK_CANDIDATE);
    (prisma.employee.findFirst as jest.Mock).mockResolvedValue(MOCK_EMPLOYEE);
    const req = authReq({ params: { candidateId: 'cand-uuid-1' }, body: VALID_EMPLOYEE_BODY });
    const res = mockRes();
    await createFromCandidate(req, res, mockNext);
    const err = (mockNext as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('ALREADY_CONVERTED');
  });

  it('should successfully convert candidate to employee', async () => {
    (prisma.candidate.findUnique as jest.Mock).mockResolvedValue(MOCK_CANDIDATE);
    (prisma.employee.findFirst as jest.Mock)
      .mockResolvedValueOnce(null)  // not already converted check
      .mockResolvedValueOnce(null); // getNextEmployeeCode lookup
    (prisma.employee.create as jest.Mock).mockResolvedValue(MOCK_EMPLOYEE);
    (prisma.notification.create as jest.Mock).mockResolvedValue({});
    const req = authReq({ params: { candidateId: 'cand-uuid-1' }, body: VALID_EMPLOYEE_BODY });
    const res = mockRes();
    await createFromCandidate(req, res, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(prisma.employee.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

// ─── getEmployee Tests ────────────────────────────────────────────────────────

describe('Employees — getEmployee()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 404 for non-existent employee', async () => {
    (prisma.employee.findUnique as jest.Mock).mockResolvedValue(null);
    const req = authReq({ params: { id: 'non-existent' } });
    const res = mockRes();
    await getEmployee(req, res, mockNext);
    const err = (mockNext as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('EMPLOYEE_NOT_FOUND');
  });

  it('should return employee data when found', async () => {
    (prisma.employee.findUnique as jest.Mock).mockResolvedValue({ ...MOCK_EMPLOYEE, reports: [], createdBy: null, updatedBy: null, manager: null });
    const req = authReq({ params: { id: 'emp-uuid-1' } });
    const res = mockRes();
    await getEmployee(req, res, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonCall.data).toHaveProperty('employeeCode', 'EMP-2026-001');
  });
});
