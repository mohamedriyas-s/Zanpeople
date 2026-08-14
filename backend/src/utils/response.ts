import { Response } from 'express';

/**
 * Standard success response helper.
 * Matches the SRS Section 7 standard response shape.
 */
export function sendSuccess(res: Response, data: any, statusCode: number = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
  });
}

/**
 * Standard paginated success response helper.
 */
export function sendPaginated(
  res: Response,
  items: any[],
  total: number,
  page: number,
  limit: number
): void {
  res.status(200).json({
    success: true,
    data: {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
