import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import multer from 'multer';
import {
  listEmployees,
  createEmployee,
  createFromCandidate,
  getEmployee,
  updateEmployee,
  deactivateEmployee,
  uploadEmployeeDocument,
  getEmployeeDocuments,
} from './employees.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for employee docs
});

const router = Router();

router.use(authenticate);

router.get('/', listEmployees);
router.post('/', createEmployee);
router.post('/from-candidate/:candidateId', createFromCandidate);
router.get('/:id', getEmployee);
router.put('/:id', updateEmployee);
router.patch('/:id/deactivate', deactivateEmployee);
router.post('/:id/documents', upload.single('file'), uploadEmployeeDocument);
router.get('/:id/documents', getEmployeeDocuments);

export { router as employeeRoutes };
