# Database Setup & Backend Connection Guide

## Overview

Your Contact Manager app now has a full PostgreSQL backend with Prisma ORM. The frontend can connect to it for persistent database storage instead of using localStorage.

## Prerequisites

- PostgreSQL running locally on `localhost:5432`
- Node.js and npm installed

## 1. Initialize Backend Database

```bash
cd src/backend

# Install dependencies
npm install

# Create database and run migrations
npm run prisma:migrate
```

This will:
- Create the `contact-manager` database (if it doesn't exist)
- Set up all tables: `contacts`, `activities`, `areas`, `programs`, and junction tables
- Generate Prisma client

Verify with Prisma Studio:
```bash
npm run prisma:studio
```
This opens a UI at `http://localhost:5555` to browse your database.

## 2. Start the Backend Server

In a new terminal:

```bash
cd src/backend
npm run dev
```

Expected output:
```
✅ Backend server running on http://localhost:3001
```

Keep this terminal open while testing.

## 3. Frontend Connects Automatically

The frontend app (at `localhost:3000`) will:
1. **First attempt:** Connect to the backend API at `http://localhost:3001/api`
2. **If successful:** Load/save contacts to PostgreSQL
3. **If failed:** Fall back to localStorage automatically

No code changes needed—the connection happens automatically when the backend is running.

## Test the Connection

1. **Start backend**: `npm run dev` (from `src/backend`)
2. **Start frontend**: `npm run dev` (from project root)
3. **Add a contact** in the UI
4. **Open Prisma Studio**: `npm run prisma:studio` (from `src/backend`)
5. **Check the database**: Navigate to the `contacts` table—you should see your contact there!

## Configuration

### Backend URL
The frontend looks for the backend at `http://localhost:3001/api` by default.

To change it, edit `.env.local` in the project root:
```
NEXT_PUBLIC_API_URL=http://your-backend-url/api
```

### Database Connection
The backend connects to PostgreSQL using:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/contact-manager"
```

Edit `src/backend/.env.local` to use different credentials:
```
DATABASE_URL="postgresql://user:password@host:port/database"
```

## Data Flow

### With Backend (PostgreSQL)
```
UI → React Hooks → API Client → Backend API → PostgreSQL
                                           ↓
                              Prisma ORM ← 
```

### Without Backend (Fallback)
```
UI → React Hooks → localStorage (browser)
```

## Common Issues

### "Cannot find module @/lib/api/client"
The API client was just added. Make sure you have the latest code.

### "Backend connection failed"
- Check that `npm run dev` is running in `src/backend`
- Verify backend is on `localhost:3001`:
  ```bash
  curl http://localhost:3001/api/health
  ```
  Should return: `{"status":"ok","message":"Backend is running"}`

### Database doesn't have my data
- Confirm the backend is running and connecting (check browser console for warnings)
- Check Prisma Studio to see if data was written:
  ```bash
  npm run prisma:studio
  ```

### Want to use Supabase instead?
1. Create a Supabase project and get the PostgreSQL connection string
2. Update `src/backend/.env.local`:
   ```
   DATABASE_URL="your-supabase-postgres-url"
   ```
3. Run migrations: `npm run prisma:migrate`
4. Deploy the backend (e.g., Vercel, Railway, Render)
5. Update frontend `.env.local` with your deployed backend URL

## Next Steps

- ✅ Database is initialized with Prisma
- ✅ Backend API is running
- ✅ Frontend automatically connects to backend
- 📍 Start both servers and test adding contacts
- 🚀 Ready to deploy to production

Need help? Check:
- `src/backend/README.md` — Backend setup details
- `src/lib/api/client.ts` — API client methods
- `src/hooks/useContacts.ts` — Frontend data management
