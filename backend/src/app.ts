import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './modules/auth/auth.routes';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes';
import { candidateRoutes } from './modules/candidates/candidates.routes';
import { publicCandidateRoutes } from './modules/candidates/public.routes';
import { employeeRoutes } from './modules/employees/employees.routes';
import { searchRoutes } from './modules/search/search.routes';
import { notificationRoutes } from './modules/notifications/notifications.routes';
import { settingsRoutes } from './modules/settings/settings.routes';
import { userRoutes } from './modules/settings/user.routes';
import { pipelineRoutes } from './modules/pipelines/pipelines.routes';
import { jobsRoutes } from './modules/jobs/jobs.routes';
import { applicationRoutes } from './modules/applications/applications.routes';

import { apiLimiter, strictLimiter } from './middleware/rateLimiter';

const app = express();

// ─── Global Middleware ───────────────────────────────
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Apply general rate limiting to all /api/v1 routes
app.use('/api/v1', apiLimiter);

// ─── Health Check ────────────────────────────────────
app.get('/api/v1/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// ─── API Routes ──────────────────────────────────────
app.use('/api/v1/auth', strictLimiter, authRoutes); // Strict limit for login/auth
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/candidates', candidateRoutes);
app.use('/api/v1/public/candidate', strictLimiter, publicCandidateRoutes); // Strict limit for public candidate links
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/pipelines', pipelineRoutes);
app.use('/api/v1/jobs', jobsRoutes);
app.use('/api/v1/applications', applicationRoutes);

// ─── 404 Handler ─────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'The requested endpoint does not exist' },
  });
});

// ─── Global Error Handler ────────────────────────────
app.use(errorHandler);

export default app;
