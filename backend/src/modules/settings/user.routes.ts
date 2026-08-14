import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { getMyProfile, updateMyProfile, changePassword } from './user.controller';

const router = Router();

router.use(authenticate);

router.get('/me', getMyProfile);
router.put('/me', updateMyProfile);
router.put('/me/password', changePassword);

export { router as userRoutes };
