# Setup & Configuration Guide

This guide covers the complete setup of the Meditators Nurturing App, including the database, backend API server, and frontend.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Authentication](#authentication)
6. [Center-Based Data Isolation](#center-based-data-isolation)
7. [Production Deployment](#production-deployment)

---

## Prerequisites

| Dependency | Minimum Version |
|---|---|
| Node.js | 20.x |
| npm | 10.x |
| PostgreSQL | 14.x |

---

## Database Setup

### 1. Create the PostgreSQL Database

```bash
createdb contact_manager
```

Or use an existing PostgreSQL instance and update the connection string accordingly.

### 2. Configure the Database URL

Create `src/backend/.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/contact_manager"
PORT=3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### 3. Run Migrations

```bash
cd src/backend

npm install

# Apply all migrations and generate the Prisma client
npx prisma migrate dev --name init
```

### 4. Seed Demo Data

```bash
npx ts-node prisma/seed.ts
```

This creates the following demo dataset:

| Name | Phone | Role | Centers |
|---|---|---|---|
| Manager 1 | 9876543210 | USER | Center 1 |
| Manager 2 | 9876543211 | USER | Center 2 |
| Admin | 8765432109 | ADMIN | All centers |

### 5. Verify the Database

```bash
# Open Prisma Studio (browser UI at http://localhost:5555)
npx prisma studio
```

---

## Backend Setup

### Starting the Backend

```bash
cd src/backend
npm run dev
```

The API server starts at `http://localhost:3001`.

### API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate with phone + password |
| `POST` | `/api/auth/register` | Register a new user (admin only) |
| `GET` | `/api/auth/me` | Get the current authenticated user |
| `GET` | `/api/centers` | List all available centers |
| `GET/POST` | `/api/contacts` | List or create contacts |
| `PATCH/DELETE` | `/api/contacts/:id` | Update or delete a contact |
| `GET/POST/DELETE` | `/api/activities` | Manage activities |
| `GET/POST/DELETE` | `/api/areas` | Manage areas |
| `GET/POST/DELETE` | `/api/programs` | Manage programs |
| `GET/POST` | `/api/campaigns` | List or create campaigns |
| `GET/POST` | `/api/attendance` | Manage attendance sessions |

All data endpoints require the `Authorization: Bearer <token>` header and an `X-Center-ID` header specifying the active center.

---

## Frontend Setup

### 1. Configure the Frontend Environment

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Development Server

```bash
npm run dev
```

The frontend starts at `http://localhost:3000`.

### Fallback Behavior

If the backend is unreachable, the frontend automatically falls back to `localStorage` for contact data. This is intended for development only; all production deployments should have the backend running.

---

## Authentication

### Login Flow

1. User submits phone number and password on the login page.
2. The backend validates credentials and returns the user profile and a session token.
3. The frontend stores `auth_user`, `auth_token`, and `selected_center` in `localStorage`.
4. On subsequent visits, `AuthProvider` reads from `localStorage` and restores the session.
5. If no valid session is found, the user is redirected to the login page.

### Session Token Format

Tokens are base64-encoded strings. All API requests must include:

```
Authorization: Bearer <token>
X-Center-ID: <centerId>
```

The API client (`src/lib/api/client.ts`) adds these headers automatically based on the stored session.

### Logout

Clicking logout clears `auth_user`, `auth_token`, and `selected_center` from `localStorage` and redirects to the login page.

---

## Center-Based Data Isolation

Every data record (Contact, Activity, Area, Program, Campaign, AttendanceSession) is bound to a `centerId` foreign key. The backend enforces this by filtering all queries with the `X-Center-ID` header value. Users can only read and write data within their authorized centers.

Example:

```typescript
// All contact queries are center-scoped
const contacts = await prisma.contact.findMany({
  where: { centerId: req.headers['x-center-id'] }
})
```

Unique constraints (e.g., phone number uniqueness) are enforced per center, not globally, allowing the same phone to exist in multiple centers independently.

---

## Production Deployment

### Build

```bash
# Build frontend and backend together
npm run build:prod
```

### Start

```bash
# Terminal 1 — Backend
npm run start:backend:prod

# Terminal 2 — Frontend
npm run start
```

### Docker

A `Dockerfile` is provided at the project root for containerized deployments. A separate `Dockerfile` is available for the backend at `src/backend/Dockerfile`.

```bash
# Build and run the backend container
docker build -f src/backend/Dockerfile -t contact-manager-api src/backend
docker run -e DATABASE_URL=<url> -p 3001:3001 contact-manager-api
```

### Environment Variables (Production)

| Variable | Where | Description |
|---|---|---|
| `DATABASE_URL` | Backend | PostgreSQL connection string |
| `PORT` | Backend | API server port (default: 3001) |
| `FRONTEND_URL` | Backend | Allowed CORS origin |
| `NODE_ENV` | Backend | Set to `production` |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend API base URL |
