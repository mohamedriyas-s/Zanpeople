import { PrismaClient, UserRole, CandidateStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ─── 1. Admin & HR Users ─────────────────────────────
  const adminHash = await bcrypt.hash('admin123', 10);
  const hrHash = await bcrypt.hash('hr123456', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@zansphere.com' },
    update: {},
    create: {
      name: 'Zansphere Admin',
      email: 'admin@zansphere.com',
      passwordHash: adminHash,
      role: UserRole.ADMIN,
    },
  });
  console.log('✅ Admin user: admin@zansphere.com / admin123');

  const hrUser = await prisma.user.upsert({
    where: { email: 'hr@zansphere.com' },
    update: {},
    create: {
      name: 'Priya Sharma',
      email: 'hr@zansphere.com',
      passwordHash: hrHash,
      role: UserRole.HR,
    },
  });
  console.log('✅ HR user: hr@zansphere.com / hr123456');

  // ─── 2. Company Profile ──────────────────────────────
  await prisma.companyProfile.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      companyName: 'Zansphere Private Limited',
      address: 'Hyderabad, Telangana, India',
    },
  });
  console.log('✅ Company profile created');

  // ─── 3. Departments ──────────────────────────────────
  const departments = [
    'Engineering',
    'Product',
    'Design',
    'Quality Assurance',
    'Human Resources',
    'Finance',
    'Marketing',
    'Operations',
  ];

  const deptRecords: Record<string, string> = {};
  for (const name of departments) {
    const dept = await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    deptRecords[name] = dept.id;
  }
  console.log(`✅ ${departments.length} departments created`);

  // ─── 4. Designations ─────────────────────────────────
  const designations = [
    'Software Engineer',
    'Senior Software Engineer',
    'Tech Lead',
    'Engineering Manager',
    'Product Manager',
    'UI/UX Designer',
    'QA Engineer',
    'Senior QA Engineer',
    'HR Executive',
    'HR Manager',
    'DevOps Engineer',
    'Data Analyst',
    'Business Analyst',
    'Intern',
  ];

  const desigRecords: Record<string, string> = {};
  for (const name of designations) {
    const desig = await prisma.designation.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    desigRecords[name] = desig.id;
  }
  console.log(`✅ ${designations.length} designations created`);

  // ─── 5. Skills ────────────────────────────────────────
  const skills = [
    'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js',
    'Express.js', 'Python', 'Java', 'Go', 'Rust',
    'PostgreSQL', 'MongoDB', 'Redis', 'AWS', 'Docker',
    'Kubernetes', 'GraphQL', 'REST API', 'Git', 'CI/CD',
    'TailwindCSS', 'Figma', 'Selenium', 'Jest', 'Cypress',
  ];

  for (const name of skills) {
    await prisma.skill.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`✅ ${skills.length} skills created`);

  // ─── 6. Sample Employees ──────────────────────────────
  const emp1 = await prisma.employee.upsert({
    where: { employeeCode: 'ZAN-2025-0001' },
    update: {},
    create: {
      employeeCode: 'ZAN-2025-0001',
      fullName: 'Rahul Krishnan',
      email: 'rahul.k@zansphere.com',
      phone: '9876543210',
      departmentId: deptRecords['Engineering'],
      designationId: desigRecords['Engineering Manager'],
      joiningDate: new Date('2025-01-15'),
      createdById: admin.id,
      updatedById: admin.id,
    },
  });

  await prisma.employee.upsert({
    where: { employeeCode: 'ZAN-2025-0002' },
    update: {},
    create: {
      employeeCode: 'ZAN-2025-0002',
      fullName: 'Ananya Reddy',
      email: 'ananya.r@zansphere.com',
      phone: '9876543211',
      departmentId: deptRecords['Engineering'],
      designationId: desigRecords['Senior Software Engineer'],
      managerId: emp1.id,
      joiningDate: new Date('2025-03-01'),
      createdById: admin.id,
      updatedById: admin.id,
    },
  });

  await prisma.employee.upsert({
    where: { employeeCode: 'ZAN-2025-0003' },
    update: {},
    create: {
      employeeCode: 'ZAN-2025-0003',
      fullName: 'Vikram Singh',
      email: 'vikram.s@zansphere.com',
      phone: '9876543212',
      departmentId: deptRecords['Product'],
      designationId: desigRecords['Product Manager'],
      joiningDate: new Date('2025-02-10'),
      createdById: admin.id,
      updatedById: admin.id,
    },
  });

  await prisma.employee.upsert({
    where: { employeeCode: 'ZAN-2026-0001' },
    update: {},
    create: {
      employeeCode: 'ZAN-2026-0001',
      fullName: 'Sneha Patel',
      email: 'sneha.p@zansphere.com',
      phone: '9876543213',
      departmentId: deptRecords['Human Resources'],
      designationId: desigRecords['HR Executive'],
      joiningDate: new Date('2026-06-01'),
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  console.log('✅ 4 sample employees created');

  // ─── 7. Sample Candidates ─────────────────────────────
  const candidateData = [
    {
      name: 'Arjun Mehta',
      email: 'arjun.mehta@email.com',
      phone: '9123456789',
      positionApplied: 'Senior Software Engineer',
      yearsExperience: 5.0,
      currentCompany: 'TechCorp India',
      noticePeriod: '30 days',
      currentSalary: 1200000,
      expectedSalary: 1600000,
      status: CandidateStatus.INTERVIEW_SCHEDULED,
      interviewDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
      linkedinUrl: 'https://linkedin.com/in/arjun-mehta',
      githubUrl: 'https://github.com/arjunmehta',
    },
    {
      name: 'Deepika Nair',
      email: 'deepika.nair@email.com',
      phone: '9123456790',
      positionApplied: 'UI/UX Designer',
      yearsExperience: 3.5,
      currentCompany: 'DesignStudio',
      noticePeriod: '15 days',
      currentSalary: 800000,
      expectedSalary: 1100000,
      status: CandidateStatus.SHORTLISTED,
      skills: ['Figma', 'TailwindCSS', 'React'],
      portfolioUrl: 'https://deepika-design.com',
    },
    {
      name: 'Karthik Raman',
      email: 'karthik.r@email.com',
      phone: '9123456791',
      positionApplied: 'Backend Developer',
      yearsExperience: 2.0,
      currentCompany: 'StartupXYZ',
      noticePeriod: '60 days',
      currentSalary: 600000,
      expectedSalary: 900000,
      status: CandidateStatus.APPLIED,
      skills: ['Node.js', 'Express.js', 'MongoDB', 'Docker'],
      githubUrl: 'https://github.com/karthikr',
    },
    {
      name: 'Meera Joshi',
      email: 'meera.j@email.com',
      phone: '9123456792',
      positionApplied: 'QA Engineer',
      yearsExperience: 4.0,
      currentCompany: 'QualitySoft',
      noticePeriod: '30 days',
      currentSalary: 900000,
      expectedSalary: 1200000,
      status: CandidateStatus.SELECTED,
      skills: ['Selenium', 'Cypress', 'Jest', 'REST API'],
    },
    {
      name: 'Rohan Gupta',
      email: 'rohan.g@email.com',
      phone: '9123456793',
      positionApplied: 'DevOps Engineer',
      yearsExperience: 6.0,
      currentCompany: 'CloudNative Inc',
      noticePeriod: '90 days',
      currentSalary: 1500000,
      expectedSalary: 2000000,
      status: CandidateStatus.REJECTED,
      skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Python'],
    },
    {
      name: 'Aisha Khan',
      email: 'aisha.k@email.com',
      phone: '9123456794',
      positionApplied: 'Software Engineer',
      yearsExperience: 1.5,
      status: CandidateStatus.APPLIED,
      skills: ['JavaScript', 'React', 'Git'],
    },
  ];

  for (const c of candidateData) {
    const publicToken = crypto.randomBytes(16).toString('base64url').slice(0, 24);
    const { skills: skillNames, ...candidateFields } = c;

    const candidate = await prisma.candidate.create({
      data: {
        ...candidateFields,
        publicToken,
        yearsExperience: candidateFields.yearsExperience ?? null,
        currentSalary: candidateFields.currentSalary ?? null,
        expectedSalary: candidateFields.expectedSalary ?? null,
        interviewDate: (candidateFields as any).interviewDate ?? null,
        createdById: hrUser.id,
        updatedById: hrUser.id,
      },
    });

    // Link skills
    for (const skillName of (skillNames || [])) {
      const skill = await prisma.skill.findUnique({ where: { name: skillName } });
      if (skill) {
        await prisma.candidateSkillMap.create({
          data: { candidateId: candidate.id, skillId: skill.id },
        });
      }
    }

    // Create timeline entry
    await prisma.candidateTimeline.create({
      data: {
        candidateId: candidate.id,
        eventType: 'STATUS_CHANGE',
        description: `Candidate created with status ${c.status.replace(/_/g, ' ')}`,
        createdById: hrUser.id,
      },
    });
  }
  console.log(`✅ ${candidateData.length} sample candidates created`);

  // ─── 8. Pipeline Templates & Jobs ─────────────────────
  
  // Default hiring pipeline
  const defaultPipeline = await prisma.pipelineTemplate.create({
    data: {
      name: 'Default Hiring Pipeline',
      description: 'Standard multi-stage interview process',
      isDefault: true,
      createdById: admin.id,
      stages: {
        create: [
          { name: 'Application Review', stageOrder: 1, stageType: 'SCREENING' },
          { name: 'Take-home Task', stageOrder: 2, stageType: 'TASK', config: { instructions: 'Submit code assignment' } },
          { name: 'Technical Interview', stageOrder: 3, stageType: 'INTERVIEW', config: { durationMinutes: 60, interviewType: 'TECHNICAL' } },
          { name: 'Managerial Interview', stageOrder: 4, stageType: 'INTERVIEW', config: { durationMinutes: 45, interviewType: 'MANAGERIAL' } },
          { name: 'Final Evaluation', stageOrder: 5, stageType: 'EVALUATION' }
        ]
      }
    }
  });
  console.log(`✅ Default pipeline template created with 5 stages`);

  // Sample job opening
  const sampleJob = await prisma.jobOpening.create({
    data: {
      title: 'Software Engineering Intern — 2026',
      departmentId: deptRecords['Engineering'],
      templateId: defaultPipeline.id,
      vacancies: 3,
      description: 'Looking for a passionate frontend intern to join our engineering team.',
      status: 'OPEN',
      createdById: admin.id,
    }
  });
  console.log(`✅ Sample job opening created`);

  // Link first two candidates as applications to this job
  const cands = await prisma.candidate.findMany({ take: 2, orderBy: { createdAt: 'asc' } });
  if (cands.length === 2) {
    const firstStage = await prisma.pipelineStage.findFirst({
      where: { templateId: defaultPipeline.id, stageOrder: 1 }
    });
    
    if (firstStage) {
      for (const cand of cands) {
        const app = await prisma.candidateApplication.create({
          data: {
            candidateId: cand.id,
            jobOpeningId: sampleJob.id,
            currentStageId: firstStage.id,
            status: 'IN_PIPELINE'
          }
        });
        await prisma.stageProgress.create({
          data: {
            applicationId: app.id,
            stageId: firstStage.id,
            status: 'IN_PROGRESS'
          }
        });
      }
      console.log(`✅ Linked 2 candidates to sample job opening`);
    }
  }

  // ─── 9. Sample Notifications ──────────────────────────
  console.log('✅ Sample notifications will be auto-generated by the app\n');

  console.log('🎉 Seed complete!');
  console.log('─────────────────────────────────────────');
  console.log('Admin login: admin@zansphere.com / admin123');
  console.log('HR login:    hr@zansphere.com / hr123456');
  console.log('─────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
