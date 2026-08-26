// ─── Common Types ────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details: Array<{ field: string; issue: string }>;
  };
}

// ─── User ────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'HR';
  isActive?: boolean;
  createdAt?: string;
}

// ─── Dashboard ───────────────────────────────────────

export interface DashboardStats {
  totalCandidates: number;
  newCandidates: number;
  shortlisted: number;
  interviewScheduled: number;
  selected: number;
  rejected: number;
  joined: number;
  totalEmployees: number;
}

// ─── Candidate ───────────────────────────────────────

export type CandidateStatus =
  | 'DRAFT'
  | 'APPLIED'
  | 'SHORTLISTED'
  | 'INTERVIEW_SCHEDULED'
  | 'SELECTED'
  | 'REJECTED'
  | 'ACCEPTED';

export interface Candidate {
  id: string;
  publicToken: string;
  name: string;
  email: string;
  phone: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  positionApplied: string;
  yearsExperience?: number | null;
  currentCompany?: string | null;
  noticePeriod?: string | null;
  currentSalary?: number | null;
  expectedSalary?: number | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  personalWebsiteUrl?: string | null;
  status: CandidateStatus;
  publicLinkEnabled: boolean;
  interviewDate?: string | null;
  skills: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: { name: string } | null;
  updatedBy?: { name: string } | null;
  notes?: CandidateNote[];
  timeline?: TimelineEntry[];
  documents?: Document[];
  applications?: CandidateApplication[];
  employee?: { id: string } | null;
}

export interface CandidateNote {
  id: string;
  noteType: 'INTERVIEW_COMMENT' | 'HR_COMMENT';
  content: string;
  visibleToPublic: boolean;
  createdAt: string;
  createdBy?: { name: string } | null;
}

export interface TimelineEntry {
  id: string;
  eventType: string;
  description: string;
  createdAt: string;
  createdBy?: { name: string } | null;
}

// ─── Employee ────────────────────────────────────────

export type EmploymentStatus = 'ACTIVE' | 'INACTIVE';

export interface Employee {
  id: string;
  employeeCode: string;
  candidateId?: string | null;
  fullName: string;
  email: string;
  phone?: string | null;
  departmentId: string;
  designationId: string;
  managerId?: string | null;
  joiningDate: string;
  employmentStatus: EmploymentStatus;
  emergencyContactName?: string | null;
  emergencyContactRelationship?: string | null;
  emergencyContactPhone?: string | null;
  department: { id?: string; name: string };
  designation: { id?: string; name: string };
  manager?: { id: string; fullName: string; employeeCode?: string } | null;
  reports?: Array<{ id: string; fullName: string; employeeCode: string }>;
  documents?: Document[];
  createdAt: string;
  updatedAt: string;
  createdBy?: { name: string } | null;
  updatedBy?: { name: string } | null;
}

// ─── Document ────────────────────────────────────────

export interface Document {
  id: string;
  ownerType: 'CANDIDATE' | 'EMPLOYEE';
  ownerId: string;
  docType: 'RESUME' | 'PORTFOLIO' | 'OFFER_LETTER' | 'ID_PROOF' | 'CERTIFICATE';
  fileName: string;
  s3Key: string;
  mimeType: string;
  sizeBytes: string;
  downloadUrl?: string;
  createdAt: string;
}

// ─── Settings ────────────────────────────────────────

export interface Department {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface Designation {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface CompanyProfile {
  id: string;
  companyName: string;
  logoUrl?: string | null;
  address?: string | null;
}

// ─── Notification ────────────────────────────────────

export interface Notification {
  id: string;
  type: 'CANDIDATE_ADDED' | 'INTERVIEW_SCHEDULED' | 'EMPLOYEE_ADDED';
  message: string;
  referenceType: 'CANDIDATE' | 'EMPLOYEE';
  referenceId: string;
  isRead: boolean;
  createdAt: string;
}

// ─── Search ──────────────────────────────────────────

export interface SearchResults {
  candidates: Array<{
    id: string;
    name: string;
    email: string;
    positionApplied: string;
    status: CandidateStatus;
    createdAt: string;
  }>;
  employees: Array<{
    id: string;
    employeeCode: string;
    fullName: string;
    email: string;
    employmentStatus: EmploymentStatus;
    department: { name: string };
    designation: { name: string };
  }>;
}

// ─── Public Profile ──────────────────────────────────

export interface PublicCandidateProfile {
  name: string;
  positionApplied: string;
  yearsExperience?: number | null;
  skills: string[];
  status: CandidateStatus;
  resumePreviewUrl?: string | null;
  resumeDownloadUrl?: string | null;
  resumeFileName?: string | null;
  resumeMimeType?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  personalWebsiteUrl?: string | null;
  publicNotes: Array<{ content: string; createdAt: string; noteType: string }>;
  company?: {
    name: string;
    address?: string | null;
    logoUrl?: string | null;
  } | null;
}

// ─── Pipeline & Recruitment ──────────────────────────

export type StageType = 'APPLICATION' | 'SCREENING' | 'TASK' | 'INTERVIEW' | 'EVALUATION' | 'CUSTOM';
export type JobStatus = 'OPEN' | 'ON_HOLD' | 'CLOSED' | 'FILLED';
export type ApplicationStatus = 'IN_PIPELINE' | 'SELECTED' | 'REJECTED' | 'WITHDRAWN' | 'ON_HOLD';
export type StageProgressStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
export type StageDecision = 'PENDING' | 'PASS' | 'FAIL' | 'HOLD';
export type InterviewStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface PipelineTemplate {
  id: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  stages?: PipelineStage[];
  _count?: { jobOpenings: number };
}

export interface PipelineStage {
  id: string;
  templateId: string;
  name: string;
  stageOrder: number;
  stageType: StageType;
  isEliminatory: boolean;
  config?: any;
  createdAt: string;
}

export interface JobOpening {
  id: string;
  title: string;
  departmentId: string;
  designationId?: string | null;
  templateId: string;
  description?: string | null;
  vacancies: number;
  status: JobStatus;
  createdAt: string;
  department?: { name: string };
  designation?: { name: string } | null;
  template?: PipelineTemplate;
  _count?: { applications: number };
}

export interface CandidateApplication {
  id: string;
  candidateId: string;
  jobOpeningId: string;
  currentStageId?: string | null;
  status: ApplicationStatus;
  appliedAt: string;
  candidate?: Candidate;
  jobOpening?: JobOpening;
  currentStage?: PipelineStage | null;
  stageProgress?: StageProgress[];
}

export interface StageProgress {
  id: string;
  applicationId: string;
  stageId: string;
  status: StageProgressStatus;
  decision: StageDecision;
  remarks?: string | null;
  enteredAt: string;
  completedAt?: string | null;
  movedBy?: { name: string } | null;
  stage?: PipelineStage;
  taskAssignment?: TaskAssignment | null;
  interviews?: InterviewRound[];
}

export interface TaskAssignment {
  id: string;
  stageProgressId: string;
  title: string;
  description?: string | null;
  deadline?: string | null;
  submissionUrl?: string | null;
  submissionNotes?: string | null;
  submittedAt?: string | null;
  score?: number | null;
  evaluatorRemarks?: string | null;
  evaluatedAt?: string | null;
  evaluator?: { name: string } | null;
}

export interface InterviewRound {
  id: string;
  stageProgressId: string;
  interviewerId: string;
  scheduledAt: string;
  durationMinutes: number;
  meetingLink?: string | null;
  status: InterviewStatus;
  rating?: number | null;
  remarks?: string | null;
  recommendation?: 'STRONG_YES' | 'YES' | 'NEUTRAL' | 'NO' | 'STRONG_NO' | null;
  completedAt?: string | null;
  interviewer?: { fullName: string };
}
