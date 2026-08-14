import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';
import { EmploymentStatus } from '@prisma/client';

/**
 * Global search across candidates and employees (FR-SEARCH-02, FR-SEARCH-03, FR-SEARCH-04, FR-SEARCH-05).
 * Case-insensitive, partial-match (substring) search.
 */
export async function globalSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = (req.query.q as string || '').trim();

    if (!query) {
      sendSuccess(res, { candidates: [], employees: [] });
      return;
    }

    const [candidates, employees] = await Promise.all([
      // Candidate search: Name, Email, Phone, Position Applied, Skills, Status
      prisma.candidate.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query } },
            { positionApplied: { contains: query, mode: 'insensitive' } },
            { status: { equals: query.toUpperCase().replace(/ /g, '_') as any } },
            { skills: { some: { skill: { name: { contains: query, mode: 'insensitive' } } } } },
          ],
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          positionApplied: true,
          status: true,
          createdAt: true,
        },
      }),

      // Employee search: Employee ID, Department, Designation, Name
      prisma.employee.findMany({
        where: {
          employmentStatus: EmploymentStatus.ACTIVE,
          OR: [
            { fullName: { contains: query, mode: 'insensitive' } },
            { employeeCode: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { department: { name: { contains: query, mode: 'insensitive' } } },
            { designation: { name: { contains: query, mode: 'insensitive' } } },
          ],
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          employeeCode: true,
          fullName: true,
          email: true,
          employmentStatus: true,
          department: { select: { name: true } },
          designation: { select: { name: true } },
        },
      }),
    ]);

    sendSuccess(res, { candidates, employees });
  } catch (error) {
    next(error);
  }
}
