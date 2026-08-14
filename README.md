# Zansphere HR Portal

Internal HR management portal for Zansphere Private Limited — Candidate & Employee Management.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14+ (App Router), TypeScript, TailwindCSS |
| Backend | Node.js + Express.js, TypeScript |
| Database | PostgreSQL 16 (Docker for dev, Neon for prod) |
| ORM | Prisma |
| Auth | JWT (jsonwebtoken + bcrypt) |
| File Storage | AWS S3 |
| Email | Nodemailer |

## Quick Start

### Prerequisites

- Node.js 18+
- Docker Desktop (for PostgreSQL)

### 1. Clone & Setup

```bash
# Clone the repository
git clone <repo-url>
cd Zanpeople

# Copy env files
cp .env.example .env
# Edit .env with your SMTP, S3, and JWT credentials
```

### 2. Start Database

```bash
docker compose up -d
```

### 3. Backend Setup

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Backend runs at `http://localhost:4000`

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`

### 5. Login

| Role | Email | Password |
|---|---|---|
| Admin | admin@zansphere.com | admin123 |
| HR | hr@zansphere.com | hr123456 |

## Project Structure

```
Zanpeople/
├── frontend/          # Next.js App Router
│   └── src/
│       ├── app/       # Pages (login, dashboard, candidates, employees, settings)
│       ├── components/# Reusable UI (Sidebar, TopBar)
│       ├── lib/       # API client, auth context
│       └── types/     # TypeScript types
├── backend/           # Express.js API
│   └── src/
│       ├── config/    # DB, S3, mail, env
│       ├── middleware/ # Auth, error handler
│       ├── modules/   # Feature modules (auth, dashboard, candidates, employees, etc.)
│       └── utils/     # Token generation, response helpers
├── docker-compose.yml # Local PostgreSQL
└── .env.example       # Environment template
```

## Key Features

- **Dashboard** — 8 stat cards, recent lists, quick actions
- **Candidate Management** — Full CRUD, status workflow, timeline, notes, resume upload
- **Employee Management** — CRUD, auto-generated IDs (ZAN-YYYY-NNNN), candidate conversion
- **Public Candidate Profile** — Shareable, token-based, allow-listed fields
- **Global Search** — Cross-entity, debounced, grouped results
- **Notifications** — In-app bell with unread badge
- **Settings** — Company profile, departments, designations, user management
- **Auth** — JWT + RBAC (Admin/HR), forgot/reset password via Nodemailer
