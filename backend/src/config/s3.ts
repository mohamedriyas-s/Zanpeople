import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env';

export const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export const S3_BUCKET = env.AWS_S3_BUCKET;

/**
 * Generate a unique S3 key for document storage.
 * Format: {ownerType}/{ownerId}/{docType}/{timestamp}-{filename}
 */
export function generateS3Key(
  ownerType: string,
  ownerId: string,
  docType: string,
  fileName: string
): string {
  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${ownerType.toLowerCase()}/${ownerId}/${docType.toLowerCase()}/${timestamp}-${sanitizedName}`;
}
