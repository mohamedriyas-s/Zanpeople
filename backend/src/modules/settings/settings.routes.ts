import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import {
  getCompanyProfile,
  updateCompanyProfile,
  listDepartments,
  createDepartment,
  updateDepartment,
  toggleDepartment,
  listDesignations,
  createDesignation,
  updateDesignation,
  toggleDesignation,
  listUsers,
  createUser,
} from './settings.controller';

const router = Router();

router.use(authenticate);

// Company Profile (Admin only)
router.get('/company-profile', getCompanyProfile);
router.put('/company-profile', requireRole('ADMIN'), updateCompanyProfile);

// Departments (Admin only for write; HR can read for dropdowns)
router.get('/departments', listDepartments);
router.post('/departments', requireRole('ADMIN'), createDepartment);
router.put('/departments/:id', requireRole('ADMIN'), updateDepartment);
router.delete('/departments/:id', requireRole('ADMIN'), toggleDepartment);

// Designations (same pattern)
router.get('/designations', listDesignations);
router.post('/designations', requireRole('ADMIN'), createDesignation);
router.put('/designations/:id', requireRole('ADMIN'), updateDesignation);
router.delete('/designations/:id', requireRole('ADMIN'), toggleDesignation);

// Users (Admin only)
router.get('/users', requireRole('ADMIN'), listUsers);
router.post('/users', requireRole('ADMIN'), createUser);

export { router as settingsRoutes };
