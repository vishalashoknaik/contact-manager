# Volunteers Coordination

A web application for managing meditators, campaigns, and attendance for organizational centers. Built with Next.js 16, Node.js, and PostgreSQL.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Requirements](#requirements)
3. [Use Cases](#use-cases)
4. [Architecture](#architecture)
5. [Data Model](#data-model)
6. [User Roles & Permissions](#user-roles--permissions)
7. [Quick Start](#quick-start)
8. [Development](#development)

---

## Project Overview

Volunteers Coordination is designed for organizations that operate across multiple centers (branches, locations, or chapters). Each center maintains its own isolated dataset—contacts, activities, areas, programs, campaigns, and attendance sessions—while a central admin can oversee all centers and switch between them.

The application is offline-capable: attendance records are persisted locally and synced to the server when connectivity is restored.

---

## Requirements

### Functional Requirements

#### Authentication & Authorization
- Users authenticate using their phone number and password.
- Each user is assigned to one or more centers with a specific role.
- Users with the `ADMIN` role can access and switch between all centers.
- Unauthenticated users are redirected to the login page.
- Authentication state persists across browser sessions via `localStorage`.

#### Contact Management
- Contacts are scoped to a center; a phone number may exist in multiple centers independently.
- Each contact stores: name, phone, gender, initial engagement date, area of stay, and remarks.
- Contacts can be associated with multiple activities, areas, and programs (with counts).
- Contacts can be selected individually or in bulk for batch operations.
- Contacts support inline editing and deletion.

#### CSV Import
- Authorized users can import contacts in bulk via a CSV file.
- The CSV parser maps columns to contact fields and reports import errors per row.
- Duplicate phone numbers within the same center are handled gracefully.

#### Configuration Management
- Admins and managers can define the lists of Activities, Areas, and Programs available to a center.
- Configuration changes are reflected immediately across all contact forms and filters.

#### Filtering & Sorting
- The contact list can be filtered by: activity, area, program, gender, and free-text search.
- The list supports multi-column sorting.
- Active filters are preserved across navigation within a session.

#### Campaign Management
- Campaigns are center-scoped calling lists.
- A campaign can have multiple volunteer callers assigned to it.
- Each contact in a campaign has a status: `PENDING`, `COMPLETED`, or `SKIPPED`.
- After each call, the volunteer records feedback: `COMPLETED`, `NO_RESPONSE`, or `CONNECT_LATER`.
- Additional call flags include: center change, do-not-disturb, and not interested.
- Campaigns support customizable SMS and WhatsApp message templates.
- Call logs are viewable and editable by authorized users.

#### Attendance Sessions
- Authorized users can create named attendance sessions scoped to a center.
- A session is optionally tagged with activities, areas, and programs.
- Volunteers can be added to a session, allowing them to record attendee entries.
- Attendance entries record the attendee's phone, name, gender, initial engagement date, and area of stay.
- If the attendee's phone exists in the contact database, their record is updated automatically.
- Sessions support offline data entry: entries are saved to `localStorage` and synced when online.
- Sessions can be ended, preventing further entries.

### Non-Functional Requirements

- **Security**: All API endpoints require authentication. Data access is filtered by the authenticated user's center and role.
- **Offline Support**: Attendance entry functions without internet connectivity; data syncs automatically upon reconnection.
- **PWA**: The application is installable as a Progressive Web App on mobile and desktop.
- **Responsiveness**: The UI adapts to mobile, tablet, and desktop screen sizes.
- **Testability**: Core logic is unit-tested; critical paths have integration test coverage.

---

## Use Cases

### UC-01: User Login
**Actor**: Any registered user  
**Precondition**: User account exists in the database.  
**Flow**:
1. User opens the application.
2. System detects no valid session and displays the login page.
3. User enters their phone number and password.
4. System validates credentials and returns the user profile with assigned centers.
5. If the user has one center, that center is selected automatically.
6. If the user has multiple centers (or is an admin), they are prompted to select a center.
7. User is redirected to the main contact list.

**Alternate Flow — Invalid Credentials**: System displays an error message; no session is created.

---

### UC-02: Browse and Filter Contacts
**Actor**: Manager, Admin  
**Precondition**: User is logged in and a center is selected.  
**Flow**:
1. System loads all contacts for the selected center.
2. User applies filters (activity, area, program, gender, search query).
3. System narrows the displayed list in real time.
4. User applies a sort order on one or more columns.
5. System reorders the displayed list.

---

### UC-03: Add a Contact
**Actor**: Manager, Admin  
**Precondition**: User is logged in with a role of `USER` or `ADMIN` for the selected center.  
**Flow**:
1. User opens the contact form.
2. User fills in the required fields (name, phone) and optional fields.
3. User assigns activities, areas, and programs.
4. User submits the form.
5. System validates uniqueness of the phone number within the center and saves the contact.
6. The new contact appears in the list.

**Alternate Flow — Duplicate Phone**: System rejects the submission and highlights the conflict.

---

### UC-04: Import Contacts via CSV
**Actor**: Manager, Admin  
**Precondition**: User has a CSV file with contact data.  
**Flow**:
1. User opens the CSV Import panel and selects a file.
2. System parses the file and previews the detected records.
3. User confirms the import.
4. System creates new contacts and skips rows with duplicate phone numbers.
5. System displays a summary of imported and skipped rows.

---

### UC-05: Edit or Delete a Contact
**Actor**: Manager, Admin  
**Flow**:
1. User locates the contact in the list.
2. User clicks Edit; the row switches to inline edit mode.
3. User modifies fields and saves.
4. System updates the record and refreshes the list.
5. Alternatively, user selects one or more contacts and deletes them in bulk.

---

### UC-06: Manage Center Configuration
**Actor**: Admin  
**Flow**:
1. Admin opens the Admin Panel and navigates to the Configuration tab.
2. Admin adds, renames, or removes Activities, Areas, or Programs for the center.
3. Changes are immediately reflected in contact forms and filter dropdowns.

---

### UC-07: Create and Run a Campaign
**Actor**: Admin  
**Flow**:
1. Admin creates a new campaign with a name and assigns contacts from the center list.
2. Admin assigns volunteer callers to the campaign.
3. A volunteer opens the campaign and is presented with the next pending contact.
4. Volunteer initiates the call and records the outcome (feedback, flags, remarks).
5. Contact status updates to `COMPLETED` or `SKIPPED`.
6. Campaign progress is visible to the admin via the call logs view.

---

### UC-08: Record Attendance (Online)
**Actor**: Attendance Taker, Manager, Admin  
**Precondition**: An active attendance session exists for the center.  
**Flow**:
1. User navigates to the Attendance page.
2. User selects an active session or creates a new one.
3. User enters the attendee's phone number.
4. System looks up the phone in the contact database and pre-fills known fields.
5. User confirms or supplements the attendee details and submits.
6. System saves the attendance entry and updates the contact record.

---

### UC-09: Record Attendance (Offline)
**Actor**: Attendance Taker  
**Precondition**: Device has no internet connection; an active session was previously loaded.  
**Flow**:
1. User enters attendee details as in UC-08.
2. System detects the offline state and saves the entry to `localStorage` with status `pending`.
3. User continues recording entries offline.
4. When connectivity is restored, system automatically syncs all `pending` entries to the server.
5. Entries are updated to status `synced`.

---

### UC-10: Admin — Switch Centers
**Actor**: Admin  
**Flow**:
1. Admin clicks the center selector dropdown in the navigation bar.
2. System lists all centers the admin has access to.
3. Admin selects a different center.
4. System reloads contacts, configuration, and campaigns for the new center.

---

## Data Integrity Policy

This application enforces strict data integrity. There are **no dummy values, no hardcoded defaults, and no silent fallbacks** anywhere in the codebase.

### Principles

1. **No dummy/default values** — Users must configure everything explicitly. The app never pre-populates fields with fake data (e.g., sample message templates, hardcoded activities/areas/programs). If data is not configured, the UI shows an empty state and prompts the user to add it.

2. **No optimistic updates** — Configuration changes (activities, areas, programs, message templates) are only reflected in the UI *after* the backend confirms a successful write. If the backend call fails, the local state is not modified and the user sees an error message.

3. **All errors are surfaced** — Every backend failure must reach the user. There are no silent `catch` blocks that swallow errors. If a configuration load fails, a network call fails, or a save fails, the user is informed with a specific error message.

4. **No fallback to stale or fake data** — If a required data load fails (e.g., config, sessions), the UI blocks the relevant feature and shows an error rather than proceeding with outdated or invented data.

### Consequences for contributors

- Do not add `|| defaultValue` patterns that hide missing configuration.
- Do not silently catch API errors without setting an error state visible to the user.
- Do not update React state before the corresponding API call succeeds.
- Do not use hardcoded strings as initial state for user-configured data.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Client)                      │
│                                                             │
│  Next.js 16 (App Router)                                    │
│  ├── /              — Contact list, filtering, bulk ops      │
│  ├── /attendance    — Attendance session management          │
│  └── /campaigns     — Campaign management & calling UI       │
│                                                             │
│  State Management: React Context + Custom Hooks             │
│  Offline Storage:  localStorage (attendance sync queue)      │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP (REST)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend API Server                      │
│                                                             │
│  Node.js + Express (TypeScript)                             │
│  ├── POST /api/auth/login          — Authenticate user       │
│  ├── GET  /api/auth/me             — Current user profile    │
│  ├── GET  /api/centers             — List centers            │
│  ├── /api/contacts                 — CRUD contacts           │
│  ├── /api/activities|areas|programs — Configuration          │
│  ├── /api/campaigns                — Campaign management     │
│  ├── /api/attendance               — Session management      │
│  └── middleware/auth               — Token validation        │
└────────────────────────┬────────────────────────────────────┘
                         │ Prisma ORM
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      PostgreSQL Database                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Model

| Entity | Key Fields | Scoped To |
|---|---|---|
| `User` | phone (PK), name, canAccessAllCenters | — |
| `Center` | id, name | — |
| `UserCenter` | userPhone, centerId, role, isApproved | Center |
| `Contact` | id, name, phone, gender, ieDate, areaOfStay | Center |
| `Activity` | id, name | Center |
| `Area` | id, name | Center |
| `Program` | id, name | Center |
| `Campaign` | id, name, messageTemplates | Center |
| `CampaignContact` | campaignId, contactId, status | Campaign |
| `CampaignCallLog` | campaignContactId, feedback, flags, remarks | Campaign |
| `AttendanceSession` | id, name, activities[], areas[], programs[] | Center |
| `AttendanceSessionEntry` | sessionId, contactId, submittedByPhone | Session |

All data tables (contacts, activities, areas, programs, campaigns, attendance) carry a `centerId` foreign key, ensuring complete data isolation between centers.

---

## User Roles & Permissions

| Action | ATTENDANCE_TAKER | USER (Manager) | ADMIN |
|---|:---:|:---:|:---:|
| View contacts | — | ✓ | ✓ |
| Add / edit / delete contacts | — | ✓ | ✓ |
| Import CSV | — | ✓ | ✓ |
| Manage configuration (activities, areas, programs) | — | ✓ | ✓ |
| Create / manage campaigns | — | — | ✓ |
| Volunteer in campaigns (make calls) | — | ✓ | ✓ |
| Create attendance sessions | — | ✓ | ✓ |
| Record attendance entries | ✓ | ✓ | ✓ |
| Switch between centers | — | — | ✓ |
| Manage users | — | — | ✓ |

---

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+

### 1. Clone and Install

```bash
git clone <repo-url>
cd contact-manager

# Install frontend dependencies
npm install

# Install backend dependencies
npm install --prefix src/backend
```

### 2. Configure Environment

Copy and edit the root environment file:

```bash
cp .env.example .env.local
```

Key variables:

```env
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

```env
# Backend (src/backend/.env)
DATABASE_URL="postgresql://user:password@localhost:5432/contact_manager"
PORT=3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### 3. Initialize the Database

```bash
cd src/backend

# Apply migrations
npx prisma migrate dev --name init

# Seed demo data (creates 3 centers, 2 managers, 1 admin)
npx ts-node prisma/seed.ts
```

Demo credentials after seeding:

| Role | Phone | Centers |
|---|---|---|
| Manager | 9876543210 | Center 1 |
| Manager | 9876543211 | Center 2 |
| Admin | 8765432109 | All centers |

### 4. Start the Application

```bash
# Terminal 1 — Backend
cd src/backend && npm run dev

# Terminal 2 — Frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Development

### Project Structure

```
contact-manager/
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── page.tsx       # Main contact list
│   │   ├── attendance/    # Attendance module
│   │   └── campaigns/     # Campaigns module
│   ├── components/        # Shared React components
│   ├── hooks/             # React custom hooks (state management)
│   ├── lib/
│   │   ├── api/           # API client (HTTP layer)
│   │   ├── services/      # Business logic services
│   │   └── types/         # TypeScript type definitions
│   └── backend/
│       ├── src/
│       │   ├── server.ts       # Express app entry point
│       │   ├── routes/         # API route handlers
│       │   └── middleware/     # Auth and validation middleware
│       └── prisma/
│           ├── schema.prisma   # Database schema
│           ├── migrations/     # Migration history
│           └── seed.ts         # Demo data script
├── public/                # Static assets, PWA manifest
├── SETUP.md               # Detailed setup and configuration guide
└── README.md              # This file
```

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Build the frontend for production |
| `npm run build:prod` | Build frontend and backend for production |
| `npm run start` | Start the production frontend server |
| `npm run start:backend` | Start the production backend server |
| `npm run test` | Run all unit and integration tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint |

### Running Tests

```bash
npm run test
```

Tests are written with Vitest and Testing Library. Test files live alongside source files (`*.test.ts`, `*.test.tsx`).

### Database Utilities

```bash
cd src/backend

# Open Prisma Studio (database browser UI)
npx prisma studio

# Apply schema changes as a new migration
npx prisma migrate dev --name <migration-name>

# Reset the database (destructive — development only)
npx prisma migrate reset
```
