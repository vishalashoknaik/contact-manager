# Authentication System Setup Guide

## Overview

The Contact Manager now includes a multi-tenant authentication system with center-based data isolation. Users can have roles (manager or admin) with different access levels across centers.

## Key Features

- **Phone-based Login**: Phone number serves as both username and password for simplicity
- **Multi-Center Support**: Users can be assigned to one or multiple centers
- **Role-Based Access**: Managers access assigned centers; admins can access all centers
- **Admin Center Switching**: Admins can switch between centers via dropdown selector
- **Data Isolation**: Each center's data is completely isolated by database foreign keys
- **Token-Based Sessions**: Simple base64-encoded tokens for stateless authentication

## Database Setup

### 1. Create PostgreSQL Database

```bash
# Create database
createdb contact_manager

# Or set DATABASE_URL in .env
# DATABASE_URL="postgresql://user:password@localhost:5432/contact_manager"
```

### 2. Run Prisma Migrations

```bash
cd src/backend

# Run migrations to create schema
npx prisma migrate dev --name init

# Alternatively, push schema directly (for development)
npx prisma db push

# Open Prisma Studio to verify
npx prisma studio
```

### 3. Seed Demo Data

```bash
cd src/backend

# Run seed script to populate demo users and centers
npx ts-node prisma/seed.ts
```

This creates:
- **3 Centers**: Center 1, Center 2, Center 3
- **2 Managers**:
  - Manager 1: Phone 9876543210 (Center 1 only)
  - Manager 2: Phone 9876543211 (Center 2 only)
- **1 Admin**: Phone 8765432109 (All centers)

## Backend Setup

### 1. Backend Environment Variables

Create `src/backend/.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/contact_manager"
PORT=3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### 2. Install Dependencies

```bash
cd src/backend
npm install
```

### 3. Start Backend Server

```bash
npm run dev
# or: npm run start
```

Server runs on `http://localhost:3001`

Available endpoints:
- `POST /api/auth/login` - Login with phone/password
- `POST /api/auth/register` - Register new user (admin only)
- `GET /api/auth/me` - Get current user
- `GET /api/centers` - Get all centers
- `GET /api/contacts` - Get contacts (center-scoped)
- `POST /api/contacts` - Create contact (center-scoped)
- And all existing endpoints with center filtering

## Frontend Setup

### 1. Frontend Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Frontend

```bash
npm run dev
```

Frontend runs on `http://localhost:3000`

## Authentication Flow

### Login Process

1. User visits application → redirected to login page if not authenticated
2. User enters phone number and password (same value)
3. Backend validates credentials and returns:
   - User object (phone, name, canAccessAllCenters, centers, centerDetails)
   - Authentication token (base64-encoded)
4. Frontend stores in localStorage:
   - `auth_user` - user object
   - `auth_token` - authentication token
   - `selected_center` - currently selected center
5. User is redirected to main page
6. CenterSelector component appears if user has multiple centers

### Session Persistence

- User data persists in localStorage
- AuthProvider hydrates on app load
- Unauthenticated users are redirected to login page

### Logout

- User clicks logout button
- localStorage entries are cleared
- User is redirected to login page

## Using Demo Credentials

### Manager (Single Center)

- **Phone**: 9876543210
- **Password**: 9876543210
- **Access**: Center 1 only (no center selector shown)

### Admin (Multiple Centers)

- **Phone**: 8765432109
- **Password**: 8765432109
- **Access**: All centers (center selector dropdown visible)

## Center-Based Data Isolation

### How It Works

1. All data tables (Contact, Activity, Area, Program) have `centerId` foreign key
2. Unique constraints include `centerId` to allow same names across centers
3. API endpoints include `X-Center-ID` header with current center
4. Backend filters all queries by centerId

### Example Query

```typescript
// Get contacts for specific center
const contacts = await prisma.contact.findMany({
  where: {
    centerId: userSelectedCenter
  }
})
```

### API Client Integration

The API client automatically:
- Adds authorization token to all requests
- Adds `X-Center-ID` header for data endpoints
- Retrieves center context from localStorage

```typescript
// Automatically includes centerId
const headers = getHeaders(selectedCenter)
// Returns: { Authorization: 'Bearer token', 'X-Center-ID': 'center-id' }
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx           # Wrapped with AuthProvider
│   ├── page.tsx             # Main page with auth check
│   └── auth.integration.test.tsx
├── components/
│   ├── LoginPage.tsx        # Login form
│   ├── CenterSelector.tsx   # Center dropdown (multi-center users)
├── hooks/
│   ├── useAuth.ts           # AuthProvider & useAuth hook
│   ├── useContacts.ts       # Needs center context update
│   ├── useConfig.ts         # Needs center context update
├── lib/
│   ├── api/
│   │   └── client.ts        # Updated with auth & center headers
│   └── types/
│       └── auth.ts          # Auth type definitions
└── backend/
    ├── src/
    │   ├── server.ts        # Auth routes mounted
    │   └── routes/
    │       ├── auth.ts      # Login, register, me, centers
    │       ├── contacts.ts  # Needs center filtering
    │       └── ...
    └── prisma/
        ├── schema.prisma    # Updated with User, Center, UserCenter
        ├── seed.ts          # Demo data generation
```

## Remaining Integration Tasks

### High Priority

1. **Update useContacts hook** to include selectedCenter
2. **Update useConfig hook** to include selectedCenter
3. **Protect API endpoints** with center filtering in routes
4. **Add tests for authentication** flow

### Medium Priority

1. Add password hashing (currently using plain phone number)
2. Implement actual JWT tokens (currently base64)
3. Add session expiration
4. Add refresh token logic

### Future Enhancements

1. OAuth2/Google login
2. Two-factor authentication
3. Audit logging for data access
4. Permission-based features (not just centers)
5. User management UI for admins

## Testing

### Run Tests

```bash
# Frontend tests
npm run test

# Backend tests (when implemented)
cd src/backend
npm run test
```

### Test Coverage

- LoginPage component
- CenterSelector component
- useAuth hook
- AuthProvider context
- API client headers
- Backend auth routes (pending)

## Troubleshooting

### "User not found" Login Error

- Verify database is seeded with demo users
- Check DATABASE_URL is correct
- Run `npx prisma db push` to create schema

### "No authorization header" Error

- Verify token is saved in localStorage after login
- Check browser dev tools → Application → Storage → localStorage
- Verify `auth_token` key exists

### Center Selector Not Showing

- User must have `canAccessAllCenters: true` or multiple assigned centers
- Check in Prisma Studio that user has multiple UserCenter records
- Verify centerDetails array in user object

### CORS Errors

- Verify FRONTEND_URL in backend .env matches frontend URL
- Check backend is using correct origin in CORS middleware

### Contacts Not Appearing by Center

- Verify backend routes include centerId filtering (pending implementation)
- Check `X-Center-ID` header is sent from frontend
- Verify Prisma queries include `where: { centerId }`

## Security Notes

⚠️ **Development Only**

The current implementation is simplified for development:
- Phone number is the password (use proper passwords in production)
- Tokens are base64-encoded (use JWT in production)
- No session expiration (add TTL in production)
- No password hashing (use bcrypt in production)

For production, implement:
1. Password hashing (bcrypt)
2. JWT tokens with expiration
3. Refresh tokens
4. HTTPS only
5. CSRF protection
6. Rate limiting on auth endpoints
7. Audit logging

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Next.js Authentication Guide](https://nextjs.org/docs/authentication)
- [React Context API](https://react.dev/reference/react/useContext)
- [Express.js Middleware](https://expressjs.com/en/guide/using-middleware.html)
