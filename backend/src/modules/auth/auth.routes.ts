import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { login, logout, forgotPassword, resetPassword, getMe } from './auth.controller';

const router = Router();

// Public routes (no JWT required)
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

export { router as authRoutes };
