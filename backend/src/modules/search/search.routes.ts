import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { globalSearch } from './search.controller';

const router = Router();

router.use(authenticate);
router.get('/', globalSearch);

export { router as searchRoutes };
