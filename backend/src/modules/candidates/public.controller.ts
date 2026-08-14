import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { s3Client, S3_BUCKET } from '../../config/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppError } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import { OwnerType, DocType } from '@prisma/client';

/**
 * Public candidate profile endpoint (FR-PUB-03, FR-PUB-04, FR-PUB-05).
 * Returns an allow-listed set of fields only — never email, phone, salary.
 */
export async function getPublicCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = req.params;

    const candidate = await prisma.candidate.findUnique({
      where: { publicToken: token },
      include: {
        skills: { include: { skill: true } },
        notes: {
          where: { visibleToPublic: true },
          orderBy: { createdAt: 'desc' },
          select: { content: true, createdAt: true, noteType: true },
        },
      },
    });

    if (!candidate) {
      throw new AppError(404, 'LINK_NOT_FOUND', 'This link is not valid');
    }

    if (!candidate.publicLinkEnabled) {
      throw new AppError(410, 'LINK_DISABLED', 'Link disabled by HR');
    }

    // Log access (FR-PUB-09 — optional)
    try {
      await prisma.publicAccessLog.create({
        data: {
          candidateId: candidate.id,
          ipAddress: req.ip || req.socket.remoteAddress || null,
        },
      });
    } catch {
      // Non-critical — don't fail the request
    }

    // Get resume signed URL if exists
    let resumePreviewUrl = null;
    let resumeDownloadUrl = null;

    const resumeDoc = await prisma.document.findFirst({
      where: {
        ownerId: candidate.id,
        ownerType: OwnerType.CANDIDATE,
        docType: DocType.RESUME,
      },
    });

    if (resumeDoc) {
      const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: resumeDoc.s3Key });
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
      resumePreviewUrl = signedUrl;
      resumeDownloadUrl = signedUrl;
    }

    // Get company profile for footer
    const companyProfile = await prisma.companyProfile.findFirst();

    // Return only allow-listed fields (FR-PUB-05)
    sendSuccess(res, {
      name: candidate.name,
      positionApplied: candidate.positionApplied,
      yearsExperience: candidate.yearsExperience,
      skills: candidate.skills.map(s => s.skill.name),
      status: candidate.status,
      resumePreviewUrl,
      resumeDownloadUrl,
      resumeFileName: resumeDoc?.fileName || null,
      resumeMimeType: resumeDoc?.mimeType || null,
      linkedinUrl: candidate.linkedinUrl,
      githubUrl: candidate.githubUrl,
      portfolioUrl: candidate.portfolioUrl,
      personalWebsiteUrl: candidate.personalWebsiteUrl,
      publicNotes: candidate.notes,
      company: companyProfile ? {
        name: companyProfile.companyName,
        address: companyProfile.address,
        logoUrl: companyProfile.logoUrl,
      } : null,
    });
  } catch (error) {
    next(error);
  }
}
