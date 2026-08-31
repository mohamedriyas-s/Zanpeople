/**
 * Unit Tests: Candidates Module
 * Tests createCandidate, listCandidates, getCandidateById, updateCandidateStatus, and addNote.
 * Prisma is fully mocked — no real DB is needed.
 */

import { Request, Response, NextFunction } from 'express';

// ─── Mock Dependencies ──────────────────────────────────────────────────────

jest.mock('../../../config/database', () => ({
  prisma: {
    candidate: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    skill: {
      upsert: jest.fn(),
    },
    candidateSkillMap: {
      deleteMany: jest.fn(),
    },
    candidateNote: {
      create: jest.fn(),
    },
    candidateTimeline: {
      create: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    $transaction: jest.fn((ops) => Promise.all(Array.isArray(ops) ? ops : [ops])),
  },
}));

jest.mock('../../../config/s3', () => ({
  s3Client: {},
  S3_BUCKET: 'test-bucket',
  generateS3Key: jest.fn().mockReturnValue('mock/s3/key.pdf'),
}));

jest.mock('../../../utils/token', () => ({
  generatePublicToken: jest.fn().mockReturnValue('mock-public-token-abc123'),
}));

// ─── Import after mocks ─────────────────────────────────────────────────────

import {
  createCandidate,
  listCandidates,
  getCandidate,
  updateCandidateStatus,
  addCandidateNote,
} from '../candidates.controller';
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
    user: { id: 'user-uuid-1', role: 'ADMIN' },
    body: {},
    query: {},
    params: {},
    get: jest.fn(),
    ...overrides,
  } as any);

// ─── Test Data ────────────────────────────────────────────────────────────────

const MOCK_CANDIDATE = {
  id: 'cand-uuid-1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+919876543210',
  positionApplied: 'Frontend Developer',
  status: 'APPLIED',
  publicToken: 'mock-public-token-abc123',
  skills: [],
  notes: [],
  timeline: [],
  applications: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const VALID_CREATE_BODY = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+919876543210',
  positionApplied: 'Frontend Developer',
};

// ─── createCandidate Tests ────────────────────────────────────────────────────

describe('Candidates — createCandidate()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 400 when required fields are missing', async () => {
    const req = authReq({ body: {} });
    const res = mockRes();
    await createCandidate(req, res, mockNext);
    const err = (mockNext as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for invalid email', async () => {
    const req = authReq({ body: { ...VALID_CREATE_BODY, email: 'not-an-email' } });
    const res = mockRes();
    await createCandidate(req, res, mockNext);
    const err = (mockNext as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(400);
  });

  it('should return 400 for invalid phone number', async () => {
    const req = authReq({ body: { ...VALID_CREATE_BODY, phone: 'abc' } });
    const res = mockRes();
    await createCandidate(req, res, mockNext);
    const err = (mockNext as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(400);
  });

  it('should return 400 for phone shorter than 7 digits', async () => {
    const req = authReq({ body: { ...VALID_CREATE_BODY, phone: '123' } });
    const res = mockRes();
    await createCandidate(req, res, mockNext);
    const err = (mockNext as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(400);
  });

  it('should create a candidate and return 201 on valid input', async () => {
    (prisma.candidate.create as jest.Mock).mockResolvedValue(MOCK_CANDIDATE);
    (prisma.candidateTimeline.create as jest.Mock).mockResolvedValue({});
    (prisma.notification.create as jest.Mock).mockResolvedValue({});
    const req = authReq({ body: VALID_CREATE_BODY });
    const res = mockRes();
    await createCandidate(req, res, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(prisma.candidate.create).toHaveBeenCalled();
    const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonCall.data).toHaveProperty('name', 'Jane Doe');
  });

  it('should attach skills when provided', async () => {
    (prisma.candidate.create as jest.Mock).mockResolvedValue(MOCK_CANDIDATE);
    (prisma.skill.upsert as jest.Mock).mockResolvedValue({ id: 'skill-1', name: 'React' });
    (prisma.candidateTimeline.create as jest.Mock).mockResolvedValue({});
    (prisma.notification.create as jest.Mock).mockResolvedValue({});
    const req = authReq({ body: { ...VALID_CREATE_BODY, skills: ['React', 'TypeScript'] } });
    const res = mockRes();
    await createCandidate(req, res, mockNext);
    expect(prisma.skill.upsert).toHaveBeenCalledTimes(2);
  });
});

// ─── listCandidates Tests ────────────────────────────────────────────────────

describe('Candidates — listCandidates()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return a paginated list of candidates', async () => {
    (prisma.candidate.findMany as jest.Mock).mockResolvedValue([MOCK_CANDIDATE]);
    (prisma.candidate.count as jest.Mock).mockResolvedValue(1);
    const req = authReq({ query: {} });
    const res = mockRes();
    await listCandidates(req, res, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonCall.data.items).toHaveLength(1);
    expect(jsonCall.data.total).toBe(1);
  });

  it('should default to page 1 and limit 20', async () => {
    (prisma.candidate.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.candidate.count as jest.Mock).mockResolvedValue(0);
    const req = authReq({ query: {} });
    const res = mockRes();
    await listCandidates(req, res, mockNext);
    expect(prisma.candidate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 })
    );
  });

  it('should filter candidates by status', async () => {
    (prisma.candidate.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.candidate.count as jest.Mock).mockResolvedValue(0);
    const req = authReq({ query: { status: 'SHORTLISTED' } });
    const res = mockRes();
    await listCandidates(req, res, mockNext);
    expect(prisma.candidate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'SHORTLISTED' }) })
    );
  });
});

// ─── getCandidateById Tests ───────────────────────────────────────────────────

describe('Candidates — getCandidateById()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 404 when candidate is not found', async () => {
    (prisma.candidate.findUnique as jest.Mock).mockResolvedValue(null);
    const req = authReq({ params: { id: 'non-existent-uuid' } });
    const res = mockRes();
    await getCandidate(req, res, mockNext);
    const err = (mockNext as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(404);
  });

  it('should return candidate data when found', async () => {
    (prisma.candidate.findUnique as jest.Mock).mockResolvedValue(MOCK_CANDIDATE);
    const req = authReq({ params: { id: 'cand-uuid-1' } });
    const res = mockRes();
    await getCandidate(req, res, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonCall.data.id).toBe('cand-uuid-1');
  });
});

// ─── updateCandidateStatus Tests ─────────────────────────────────────────────

describe('Candidates — updateCandidateStatus()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 400 for invalid status value', async () => {
    (prisma.candidate.findUnique as jest.Mock).mockResolvedValue(MOCK_CANDIDATE);
    const req = authReq({ params: { id: 'cand-uuid-1' }, body: { status: 'INVALID_STATUS' } });
    const res = mockRes();
    await updateCandidateStatus(req, res, mockNext);
    const err = (mockNext as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(400);
  });

  it('should update candidate status successfully', async () => {
    (prisma.candidate.findUnique as jest.Mock).mockResolvedValue(MOCK_CANDIDATE);
    (prisma.candidate.update as jest.Mock).mockResolvedValue({ ...MOCK_CANDIDATE, status: 'SHORTLISTED' });
    (prisma.candidateTimeline.create as jest.Mock).mockResolvedValue({});
    (prisma.notification.create as jest.Mock).mockResolvedValue({});
    const req = authReq({ params: { id: 'cand-uuid-1' }, body: { status: 'SHORTLISTED' } });
    const res = mockRes();
    await updateCandidateStatus(req, res, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(prisma.candidate.update).toHaveBeenCalled();
  });
});

// ─── addNote Tests ────────────────────────────────────────────────────────────

describe('Candidates — addCandidateNote()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 400 for missing note content', async () => {
    (prisma.candidate.findUnique as jest.Mock).mockResolvedValue(MOCK_CANDIDATE);
    const req = authReq({ params: { id: 'cand-uuid-1' }, body: { noteType: 'HR_COMMENT', content: '' } });
    const res = mockRes();
    await addCandidateNote(req, res, mockNext);
    const err = (mockNext as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(400);
  });

  it('should create a note successfully', async () => {
    (prisma.candidate.findUnique as jest.Mock).mockResolvedValue(MOCK_CANDIDATE);
    (prisma.candidateNote.create as jest.Mock).mockResolvedValue({ id: 'note-1', content: 'Good candidate' });
    const req = authReq({
      params: { id: 'cand-uuid-1' },
      body: { noteType: 'HR_COMMENT', content: 'Good candidate', visibleToPublic: false },
    });
    const res = mockRes();
    await addCandidateNote(req, res, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(prisma.candidateNote.create).toHaveBeenCalled();
  });
});
