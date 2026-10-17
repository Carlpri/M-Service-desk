import { Router } from 'express'
import { prisma } from '../../config/prisma.js'

const healthRouter = Router()

healthRouter.get('/', async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    response.status(200).json({
      application: 'M-Service Desk',
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    })
  } catch {
    console.error('Database health check failed')
    response.status(503).json({
      application: 'M-Service Desk',
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    })
  }
})

export default healthRouter
