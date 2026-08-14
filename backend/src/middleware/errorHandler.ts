import { Request, Response, NextFunction } from 'express';

/**
 * Custom application error with HTTP status code and error code.
 */
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: Array<{ field: string; issue: string }>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Array<{ field: string; issue: string }>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Global error handler middleware.
 * Produces the standard error response shape per SRS Section 7.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Structured logging for all errors
  console.error(`[ERROR] ${new Date().toISOString()}`, {
    name: err.name,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details || [],
      },
    });
    return;
  }

  // Prisma known request error
  if (err.name === 'PrismaClientKnownRequestError') {
    res.status(400).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'A database constraint was violated',
        details: [],
      },
    });
    return;
  }

  // Multer file upload errors
  if (err.name === 'MulterError') {
    const multerErr = err as any;
    let message = 'File upload error';
    let code = 'FILE_UPLOAD_ERROR';

    if (multerErr.code === 'LIMIT_FILE_SIZE') {
      message = 'File exceeds the maximum size of 5MB';
      code = 'FILE_TOO_LARGE';
    }

    res.status(400).json({
      success: false,
      error: { code, message, details: [] },
    });
    return;
  }

  // Generic unhandled error
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      details: [],
    },
  });
}
