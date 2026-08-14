import { Router } from 'express';
import { getPublicCandidate } from './public.controller';

const router = Router();

// Public route — no JWT required (FR-PUB-08)
router.get('/:token', getPublicCandidate);

export { router as publicCandidateRoutes };
