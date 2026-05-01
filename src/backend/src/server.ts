import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import contactsRouter from './routes/contacts.js'
import activitiesRouter from './routes/activities.js'
import areasRouter from './routes/areas.js'
import programsRouter from './routes/programs.js'
import authRouter from './routes/auth.js'

const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(express.json())

// Auth Routes (must come first for login/register without auth)
app.use('/api/auth', authRouter)

// Routes
app.use('/api/contacts', contactsRouter)
app.use('/api/activities', activitiesRouter)
app.use('/api/areas', areasRouter)
app.use('/api/programs', programsRouter)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' })
})

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`)
  console.log(`📊 Prisma Studio: npm run prisma:studio`)
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...')
  await prisma.$disconnect()
  process.exit(0)
})
