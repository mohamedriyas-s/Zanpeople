import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess } from '../../utils/response';
import { CandidateStatus, EmploymentStatus } from '@prisma/client';

// ─── Dashboard Stats (FR-DASH-01, FR-DASH-02, FR-DASH-03) ──

export async function getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalCandidates,
      newCandidates,
      shortlisted,
      interviewScheduled,
      selected,
      rejected,
      joined,
      totalEmployees,
    ] = await Promise.all([
      prisma.candidate.count(),
      prisma.candidate.count({
        where: { status: CandidateStatus.APPLIED, createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.candidate.count({ where: { status: CandidateStatus.SHORTLISTED } }),
      prisma.candidate.count({ where: { status: CandidateStatus.INTERVIEW_SCHEDULED } }),
      prisma.candidate.count({ where: { status: CandidateStatus.SELECTED } }),
      prisma.candidate.count({ where: { status: CandidateStatus.REJECTED } }),
      prisma.candidate.count({ where: { status: CandidateStatus.JOINED } }),
      prisma.employee.count({ where: { employmentStatus: EmploymentStatus.ACTIVE } }),
    ]);

    sendSuccess(res, {
      totalCandidates,
      newCandidates,
      shortlisted,
      interviewScheduled,
      selected,
      rejected,
      joined,
      totalEmployees,
    });
  } catch (error) {
    next(error);
  }
}

// ─── Recent Applications (FR-DASH-04) ────────────────

export async function getRecentApplications(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const candidates = await prisma.candidate.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        positionApplied: true,
        status: true,
        createdAt: true,
      },
    });

    sendSuccess(res, candidates);
  } catch (error) {
    next(error);
  }
}

// ─── Upcoming Interviews (FR-DASH-05) ────────────────

export async function getUpcomingInterviews(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const candidates = await prisma.candidate.findMany({
      where: {
        status: CandidateStatus.INTERVIEW_SCHEDULED,
        interviewDate: { gte: new Date() },
      },
      take: 5,
      orderBy: { interviewDate: 'asc' },
      select: {
        id: true,
        name: true,
        positionApplied: true,
        interviewDate: true,
        status: true,
      },
    });

    sendSuccess(res, candidates);
  } catch (error) {
    next(error);
  }
}

// ─── Recently Joined Employees (FR-DASH-06) ──────────

export async function getRecentEmployees(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const employees = await prisma.employee.findMany({
      where: { employmentStatus: EmploymentStatus.ACTIVE },
      take: 5,
      orderBy: { joiningDate: 'desc' },
      select: {
        id: true,
        employeeCode: true,
        fullName: true,
        joiningDate: true,
        department: { select: { name: true } },
        designation: { select: { name: true } },
      },
    });

    sendSuccess(res, employees);
  } catch (error) {
    next(error);
  }
}
