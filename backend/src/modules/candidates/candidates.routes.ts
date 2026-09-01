import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import multer from 'multer';
import {
  listCandidates,
  createCandidate,
  getCandidate,
  updateCandidate,
  deleteCandidate,
  updateCandidateStatus,
  addCandidateNote,
  getCandidateTimeline,
  addTimelineEntry,
  uploadResume,
  getResumeUrl,
  regeneratePublicLink,
  togglePublicLink,
} from './candidates.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max (FR-CAND-05)
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('UNSUPPORTED_FILE_TYPE'));
    }
  },
});

const router = Router();

router.use(authenticate);

router.get('/', listCandidates);
router.post('/', createCandidate);
router.get('/:id', getCandidate);
router.put('/:id', updateCandidate);
router.delete('/:id', deleteCandidate);
router.patch('/:id/status', updateCandidateStatus);
router.post('/:id/notes', addCandidateNote);
router.get('/:id/timeline', getCandidateTimeline);
router.post('/:id/timeline', addTimelineEntry);
router.post('/:id/resume', upload.single('file'), uploadResume);
router.get('/:id/resume', getResumeUrl);
router.post('/:id/regenerate-link', regeneratePublicLink);
router.patch('/:id/toggle-public-link', togglePublicLink);

export { router as candidateRoutes };
