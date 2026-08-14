-- CreateEnum
CREATE TYPE "StageType" AS ENUM ('APPLICATION', 'SCREENING', 'TASK', 'INTERVIEW', 'EVALUATION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('OPEN', 'ON_HOLD', 'CLOSED', 'FILLED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('IN_PIPELINE', 'SELECTED', 'REJECTED', 'WITHDRAWN', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "StageProgressStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "StageDecision" AS ENUM ('PENDING', 'PASS', 'FAIL', 'HOLD');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "InterviewRecommendation" AS ENUM ('STRONG_YES', 'YES', 'NEUTRAL', 'NO', 'STRONG_NO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'STAGE_ADVANCED';
ALTER TYPE "NotificationType" ADD VALUE 'TASK_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'APPLICATION_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'APPLICATION_SELECTED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReferenceType" ADD VALUE 'JOB_OPENING';
ALTER TYPE "ReferenceType" ADD VALUE 'APPLICATION';

-- CreateTable
CREATE TABLE "pipeline_templates" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pipeline_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_stages" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "stage_order" INTEGER NOT NULL,
    "stage_type" "StageType" NOT NULL,
    "is_eliminatory" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_openings" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "department_id" UUID NOT NULL,
    "designation_id" UUID,
    "template_id" UUID NOT NULL,
    "description" TEXT,
    "vacancies" INTEGER NOT NULL DEFAULT 1,
    "status" "JobStatus" NOT NULL DEFAULT 'OPEN',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ,

    CONSTRAINT "job_openings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_applications" (
    "id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "job_opening_id" UUID NOT NULL,
    "current_stage_id" UUID,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'IN_PIPELINE',
    "applied_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_progress" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "status" "StageProgressStatus" NOT NULL DEFAULT 'PENDING',
    "decision" "StageDecision" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "entered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    "moved_by" UUID,

    CONSTRAINT "stage_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_assignments" (
    "id" UUID NOT NULL,
    "stage_progress_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "deadline" TIMESTAMPTZ,
    "submission_url" TEXT,
    "submission_notes" TEXT,
    "submitted_at" TIMESTAMPTZ,
    "evaluator_id" UUID,
    "evaluator_remarks" TEXT,
    "score" INTEGER,
    "evaluated_at" TIMESTAMPTZ,

    CONSTRAINT "task_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_rounds" (
    "id" UUID NOT NULL,
    "stage_progress_id" UUID NOT NULL,
    "interviewer_id" UUID NOT NULL,
    "scheduled_at" TIMESTAMPTZ NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "meeting_link" TEXT,
    "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "rating" INTEGER,
    "remarks" TEXT,
    "recommendation" "InterviewRecommendation",
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "interview_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pipeline_stages_template_id_idx" ON "pipeline_stages"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_stages_template_id_stage_order_key" ON "pipeline_stages"("template_id", "stage_order");

-- CreateIndex
CREATE INDEX "job_openings_status_idx" ON "job_openings"("status");

-- CreateIndex
CREATE INDEX "job_openings_department_id_idx" ON "job_openings"("department_id");

-- CreateIndex
CREATE INDEX "job_openings_created_at_idx" ON "job_openings"("created_at" DESC);

-- CreateIndex
CREATE INDEX "candidate_applications_job_opening_id_idx" ON "candidate_applications"("job_opening_id");

-- CreateIndex
CREATE INDEX "candidate_applications_status_idx" ON "candidate_applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_applications_candidate_id_job_opening_id_key" ON "candidate_applications"("candidate_id", "job_opening_id");

-- CreateIndex
CREATE INDEX "stage_progress_application_id_idx" ON "stage_progress"("application_id");

-- CreateIndex
CREATE INDEX "stage_progress_stage_id_idx" ON "stage_progress"("stage_id");

-- CreateIndex
CREATE UNIQUE INDEX "stage_progress_application_id_stage_id_key" ON "stage_progress"("application_id", "stage_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_assignments_stage_progress_id_key" ON "task_assignments"("stage_progress_id");

-- CreateIndex
CREATE INDEX "interview_rounds_stage_progress_id_idx" ON "interview_rounds"("stage_progress_id");

-- CreateIndex
CREATE INDEX "interview_rounds_interviewer_id_idx" ON "interview_rounds"("interviewer_id");

-- AddForeignKey
ALTER TABLE "pipeline_templates" ADD CONSTRAINT "pipeline_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "pipeline_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_openings" ADD CONSTRAINT "job_openings_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "pipeline_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_openings" ADD CONSTRAINT "job_openings_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_openings" ADD CONSTRAINT "job_openings_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_openings" ADD CONSTRAINT "job_openings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_applications" ADD CONSTRAINT "candidate_applications_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_applications" ADD CONSTRAINT "candidate_applications_job_opening_id_fkey" FOREIGN KEY ("job_opening_id") REFERENCES "job_openings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_applications" ADD CONSTRAINT "candidate_applications_current_stage_id_fkey" FOREIGN KEY ("current_stage_id") REFERENCES "pipeline_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_progress" ADD CONSTRAINT "stage_progress_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "candidate_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_progress" ADD CONSTRAINT "stage_progress_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "pipeline_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_progress" ADD CONSTRAINT "stage_progress_moved_by_fkey" FOREIGN KEY ("moved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_stage_progress_id_fkey" FOREIGN KEY ("stage_progress_id") REFERENCES "stage_progress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_rounds" ADD CONSTRAINT "interview_rounds_stage_progress_id_fkey" FOREIGN KEY ("stage_progress_id") REFERENCES "stage_progress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_rounds" ADD CONSTRAINT "interview_rounds_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
