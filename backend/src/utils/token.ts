import crypto from 'crypto';

/**
 * Generate a cryptographically random, URL-safe token.
 * Used for candidate public profile links (FR-PUB-01).
 * Minimum 16 characters, ≥96 bits entropy (NFR-09).
 */
export function generatePublicToken(length: number = 24): string {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

/**
 * Generate a secure password reset token.
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a reset token for secure storage (we store hash, not plaintext).
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate an employee code in the format: PREFIX-YYYY-NNNN
 * Year auto-detects from current date (per user requirement).
 */
export function generateEmployeeCode(prefix: string, sequenceNumber: number): string {
  const year = new Date().getFullYear();
  const paddedSequence = String(sequenceNumber).padStart(4, '0');
  return `${prefix}-${year}-${paddedSequence}`;
}
