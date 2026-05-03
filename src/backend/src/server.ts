import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import contactsRouter from './routes/contacts.js'
import activitiesRouter from './routes/activities.js'
import areasRouter from './routes/areas.js'
import programsRouter from './routes/programs.js'
import authRouter from './routes/auth.js'
import attendanceRouter from './routes/attendance.js'
import campaignsRouter from './routes/campaigns.js'

const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 3001

function parseAllowedOrigins() {
  const configured = process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000'
  return configured
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
}

const allowedOrigins = parseAllowedOrigins()

function normalizeOrigin(origin: string) {
  return origin.trim().replace(/\/$/, '')
}

function isOriginAllowed(origin: string, configuredOrigins: string[]) {
  const normalizedOrigin = normalizeOrigin(origin)

  return configuredOrigins.some(configured => {
    const normalizedConfigured = normalizeOrigin(configured)

    if (normalizedConfigured.startsWith('*.')) {
      return normalizedOrigin.endsWith(normalizedConfigured.slice(1))
    }

    return normalizedOrigin === normalizedConfigured
  })
}

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true)
      return
    }

    if (isOriginAllowed(origin, allowedOrigins)) {
      callback(null, true)
      return
    }

    callback(new Error(`Origin not allowed by CORS: ${origin}`))
  },
  credentials: true
}))
app.set('trust proxy', 1)
app.use(express.json({ limit: '1mb' }))

// Auth Routes (must come first for login/register without auth)
app.use('/api/auth', authRouter)

// Routes
app.use('/api/contacts', contactsRouter)
app.use('/api/activities', activitiesRouter)
app.use('/api/areas', areasRouter)
app.use('/api/programs', programsRouter)
app.use('/api/attendance', attendanceRouter)
app.use('/api/campaigns', campaignsRouter)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running', uptime: process.uptime() })
})

app.get('/api/ready', async (req, res) => {
  try {
    await prisma.$queryRawUnsafe('SELECT 1')
    res.json({ status: 'ready' })
  } catch {
    res.status(503).json({ status: 'not-ready' })
  }
})

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  })
})

// Start server
const server = app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`)
  console.log(`📊 Prisma Studio: npm run prisma:studio`)
  console.log(`🌐 Allowed origins: ${allowedOrigins.join(', ')}`)
})

async function shutdown() {
  console.log('\n🛑 Shutting down...')
  await new Promise<void>((resolve, reject) => {
    server.close(error => {
      if (error) reject(error)
      else resolve()
    })
  })
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGINT', () => {
  void shutdown()
})

process.on('SIGTERM', () => {
  void shutdown()
})
