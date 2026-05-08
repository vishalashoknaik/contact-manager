# Meditators Nurturing App — Backend

Express.js + Prisma + PostgreSQL backend API for Meditators Nurturing App.

## Setup

### 1. Install Dependencies

```bash
cd src/backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` and update with your PostgreSQL credentials:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/contact-manager"
```

### 3. Initialize Database

Run Prisma migrations to create tables:

```bash
npm run prisma:migrate
```

This will:
- Create the PostgreSQL database if it doesn't exist
- Run migrations to set up tables: contacts, activities, areas, programs
- Generate Prisma client

### 4. Start Backend

```bash
npm run dev
```

Server runs on `http://localhost:3001`

## Available Commands

- `npm run dev` - Start dev server with hot reload
- `npm run build` - Compile TypeScript to dist/
- `npm start` - Run compiled backend
- `npm run prisma:migrate` - Run migrations
- `npm run prisma:studio` - Open Prisma Studio UI for database management
- `npm run prisma:generate` - Regenerate Prisma client

## API Endpoints

### Contacts
- `GET /api/contacts` - Get all contacts
- `POST /api/contacts` - Create/update contact
- `PATCH /api/contacts/:id` - Update contact fields (selected, importOrder)
- `DELETE /api/contacts/:id` - Delete contact

### Activities / Areas / Programs
- `GET /api/activities` - Get all activities
- `POST /api/activities` - Create activity
- `DELETE /api/activities/:name` - Delete activity
- (Same for areas and programs)

### Health Check
- `GET /api/health` - Server status

## Database Schema

### Contact
- `id` (UUID) - Primary key
- `name` (String) - Contact name
- `phone` (String) - Unique phone number
- `selected` (Boolean) - Selection state
- `lastUpdated` (DateTime) - Last update timestamp
- `importOrder` (Int?) - Order for imported contacts
- Relations: activities, areas, programs

### Activity / Area / Program
- `id` (UUID)
- `name` (String) - Unique name
- Relations: contacts via junction tables

### Junction Tables
- `ContactActivity` - Contact-Activity with count
- `ContactArea` - Contact-Area with count
- `ContactProgram` - Contact-Program with count

## Migration to Supabase

When ready to use Supabase:

1. Create a Supabase project and get the connection string
2. Update `DATABASE_URL` in `.env.local`:
   ```
   DATABASE_URL="postgresql://[user]:[password]@[host]:[port]/[database]"
   ```
3. Run `npm run prisma:migrate` to sync schema
4. Update frontend `REACT_APP_BACKEND_URL` to Supabase backend URL
5. Deploy backend (e.g., Vercel, Render, Railway)

## Notes

- Tests use SQLite in-memory database (to be added)
- CORS is configured for `http://localhost:3000` (frontend)
- Prisma client is auto-generated on npm install
- Use Prisma Studio for visual database management: `npm run prisma:studio`
