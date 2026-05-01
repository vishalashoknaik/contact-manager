# API Endpoint Protection - Implementation Guide

## Overview

Currently, the data API endpoints (contacts, activities, areas, programs) do NOT enforce center-based filtering. Any authenticated user could theoretically access data from any center by modifying headers or database queries.

This guide shows exactly how to add center-based protection to each endpoint.

## Implementation Pattern

Every data endpoint should follow this pattern:

```typescript
// 1. Extract center ID from header
const centerId = req.headers['x-center-id'] as string

// 2. Validate center ID exists and format is correct
if (!centerId) {
  return res.status(400).json({ error: 'Center ID required' })
}

// 3. Validate user has access to this center (future: implement auth middleware)
// For now, trust header (implement proper auth in production)

// 4. Add center filter to all Prisma queries
const data = await prisma.contact.findMany({
  where: {
    centerId: centerId  // ← ADD THIS TO ALL WHERE CLAUSES
  }
})

// 5. Return data (now automatically filtered by center)
return res.json(data)
```

## Files to Modify

### 1. src/backend/src/routes/contacts.ts

**Current Code (Line ~30-40):**
```typescript
router.get('/', async (req: Request, res: Response) => {
  try {
    const contacts = await prisma.contact.findMany()
    res.json(contacts)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contacts' })
  }
})
```

**Updated Code:**
```typescript
router.get('/', async (req: Request, res: Response) => {
  try {
    const centerId = req.headers['x-center-id'] as string
    
    if (!centerId) {
      return res.status(400).json({ error: 'Center ID required' })
    }

    const contacts = await prisma.contact.findMany({
      where: {
        centerId: centerId  // ← ADD THIS LINE
      }
    })
    res.json(contacts)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contacts' })
  }
})
```

**Other endpoints in contacts.ts to update:**

- `GET /` - List contacts (shown above)
- `POST /` - Create contact (add centerId to where when finding existing)
- `PATCH /:id` - Update contact (add centerId filter)
- `DELETE /:id` - Delete contact (add centerId filter)
- `GET /:id` - Get single contact (add centerId filter)

**Pattern for each:**
```typescript
// Before creating/updating/deleting, verify contact belongs to this center
const contact = await prisma.contact.findFirst({
  where: {
    id: id,
    centerId: centerId  // ← ALWAYS ADD THIS
  }
})

if (!contact) {
  return res.status(404).json({ error: 'Contact not found' })
}
```

### 2. src/backend/src/routes/activities.ts

**Same pattern:**
```typescript
// GET all
where: { centerId: centerId }

// POST create
// Verify name not used in THIS center
where: { name: name, centerId: centerId }

// PATCH/DELETE
where: { id: id, centerId: centerId }
```

**Affected endpoints:**
- GET / - List activities
- POST / - Create activity
- PATCH /:id - Update activity
- DELETE /:id - Delete activity

### 3. src/backend/src/routes/areas.ts

**Same pattern as activities**

### 4. src/backend/src/routes/programs.ts

**Same pattern as activities**

## Detailed Implementation Example

### contacts.ts - Full Update

```typescript
import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// Helper to get center ID and validate
function getCenterId(req: Request, res: Response): string | null {
  const centerId = req.headers['x-center-id'] as string
  if (!centerId) {
    res.status(400).json({ error: 'Center ID required' })
    return null
  }
  return centerId
}

// GET all contacts for center
router.get('/', async (req: Request, res: Response) => {
  try {
    const centerId = getCenterId(req, res)
    if (!centerId) return

    const contacts = await prisma.contact.findMany({
      where: { centerId }, // ← ADDED
      include: {
        activities: {
          include: { activity: true }
        },
        areas: {
          include: { area: true }
        },
        programs: {
          include: { program: true }
        }
      }
    })
    res.json(contacts)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contacts' })
  }
})

// GET single contact
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const centerId = getCenterId(req, res)
    if (!centerId) return

    const contact = await prisma.contact.findFirst({
      where: {
        id: req.params.id,
        centerId // ← ADDED
      },
      include: {
        activities: { include: { activity: true } },
        areas: { include: { area: true } },
        programs: { include: { program: true } }
      }
    })

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' })
    }

    res.json(contact)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contact' })
  }
})

// POST create contact
router.post('/', async (req: Request, res: Response) => {
  try {
    const centerId = getCenterId(req, res)
    if (!centerId) return

    const { name, phone, activities, areas, programs } = req.body

    // Check if phone already used in THIS center
    const existing = await prisma.contact.findFirst({
      where: {
        phone,
        centerId // ← ADDED
      }
    })

    if (existing) {
      return res.status(400).json({ error: 'Contact already exists in this center' })
    }

    const contact = await prisma.contact.create({
      data: {
        name,
        phone,
        centerId, // ← ADDED
        activities: activities ? {
          create: Object.entries(activities).map(([activityId, count]) => ({
            activityId,
            count: count as number
          }))
        } : undefined
      }
    })

    res.status(201).json(contact)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create contact' })
  }
})

// PATCH update contact
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const centerId = getCenterId(req, res)
    if (!centerId) return

    // Verify contact exists in this center
    const contact = await prisma.contact.findFirst({
      where: {
        id: req.params.id,
        centerId // ← ADDED
      }
    })

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' })
    }

    const updated = await prisma.contact.update({
      where: { id: req.params.id },
      data: req.body
    })

    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update contact' })
  }
})

// DELETE contact
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const centerId = getCenterId(req, res)
    if (!centerId) return

    // Verify contact exists in this center
    const contact = await prisma.contact.findFirst({
      where: {
        id: req.params.id,
        centerId // ← ADDED
      }
    })

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' })
    }

    await prisma.contact.delete({
      where: { id: req.params.id }
    })

    res.json({ message: 'Contact deleted' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete contact' })
  }
})

export default router
```

## Implementation Checklist

- [ ] **contacts.ts** - Add centerId to all findMany, findFirst, create, update, delete
  - [ ] GET / → where: { centerId }
  - [ ] GET /:id → where: { id, centerId }
  - [ ] POST / → where: { phone, centerId } for existing check
  - [ ] POST / → data: { centerId }
  - [ ] PATCH /:id → where: { id, centerId }
  - [ ] DELETE /:id → where: { id, centerId }

- [ ] **activities.ts** - Add centerId to all queries
  - [ ] GET / → where: { centerId }
  - [ ] GET /:id → where: { id, centerId }
  - [ ] POST / → where: { name, centerId } for existing check
  - [ ] POST / → data: { centerId }
  - [ ] PATCH /:id → where: { id, centerId }
  - [ ] DELETE /:id → where: { id, centerId }

- [ ] **areas.ts** - Add centerId to all queries
  - [ ] Same pattern as activities.ts

- [ ] **programs.ts** - Add centerId to all queries
  - [ ] Same pattern as activities.ts

## Testing After Implementation

### Test 1: Verify Contacts Isolated by Center

```bash
# Terminal 1: Start backend
cd src/backend
npm run dev

# Terminal 2: Test with curl
# Login as Manager 1 (Center 1)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","password":"9876543210"}'

# Copy token from response

# Get token for use
TOKEN="eyJwaXN6..."

# Create contact in Center 1
curl -X POST http://localhost:3001/api/contacts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Center-ID: center-1-uuid" \
  -d '{"name":"Test Contact","phone":"1234567890"}'

# Try to access same contact as Admin but with different center
# Should return 404 or empty if not in that center

TOKEN_ADMIN="..."
curl -X GET http://localhost:3001/api/contacts \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "X-Center-ID: center-2-uuid"
# Should NOT show Center 1 contacts
```

### Test 2: Verify Phone Uniqueness Per Center

```bash
# Add contact to Center 1
curl -X POST http://localhost:3001/api/contacts \
  -H "X-Center-ID: center-1-uuid" \
  -d '{"name":"Alice","phone":"1111111111"}'

# Try to add same phone to Center 1 - should fail
curl -X POST http://localhost:3001/api/contacts \
  -H "X-Center-ID: center-1-uuid" \
  -d '{"name":"Alice 2","phone":"1111111111"}'
# Should return 400 - "Contact already exists"

# Add same phone to Center 2 - should succeed
curl -X POST http://localhost:3001/api/contacts \
  -H "X-Center-ID: center-2-uuid" \
  -d '{"name":"Alice 2","phone":"1111111111"}'
# Should return 201 - success
```

### Test 3: Verify Bulk Operations are Center-Specific

When updating activities/areas/programs, verify they only affect current center:

```bash
# Create activity in Center 1
curl -X POST http://localhost:3001/api/activities \
  -H "X-Center-ID: center-1-uuid" \
  -d '{"name":"Walkathon"}'

# Add same activity to Center 2
curl -X POST http://localhost:3001/api/activities \
  -H "X-Center-ID: center-2-uuid" \
  -d '{"name":"Walkathon"}'

# Update Center 1 activity - should not affect Center 2
curl -X PATCH http://localhost:3001/api/activities/activity-id \
  -H "X-Center-ID: center-1-uuid" \
  -d '{"name":"Walk 2023"}'

# Get Center 2 activities - should still show "Walkathon"
```

## Frontend Integration

Once backend is protected, update frontend hooks:

### useContacts.ts

```typescript
// Before: const contacts = await contactsApi.getAll()
// After:
const { selectedCenter } = useAuth()
const contacts = await contactsApi.getAll(selectedCenter)
```

### useConfig.ts

```typescript
// Add selectedCenter to all API calls
const { selectedCenter } = useAuth()

// Update existing calls to include center
const activities = await configApi.getActivities(selectedCenter)
```

## Security Notes

1. ✅ **Database Constraints**: Foreign keys ensure referential integrity
2. ✅ **Composite Unique**: (phone, centerId) prevents cross-center duplication
3. ⚠️ **Header Validation**: Currently trusts X-Center-ID header
4. ⚠️ **Missing Auth Check**: Should validate user has access to center
5. ⚠️ **No Rate Limiting**: Add rate limiting in production

### Future: Add Auth Middleware

```typescript
// auth.middleware.ts
export async function validateCenterAccess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  const centerId = req.headers['x-center-id']

  if (!token || !centerId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Decode token, get user, check if user has access to centerId
  // For now, just validate format
  if (typeof centerId !== 'string' || centerId.length === 0) {
    return res.status(400).json({ error: 'Invalid center ID' })
  }

  next()
}

// Then add to routes:
router.use(validateCenterAccess)
```

---

**Status**: Ready for Implementation
**Priority**: High (Required for Data Isolation)
**Estimated Time**: 30-60 minutes
