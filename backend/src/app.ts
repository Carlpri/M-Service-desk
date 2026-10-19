import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { errorHandler } from './middleware/error-handler.js'
import { notFoundHandler } from './middleware/not-found.js'
import healthRouter from './modules/health/health.routes.js'
import authRouter from './modules/auth/auth.routes.js'
import usersRouter from './modules/users/users.routes.js'
import {
  adminServiceRequestsRouter,
  serviceRequestsRouter,
} from './modules/service-requests/service-requests.routes.js'

const app = express()

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.frontendOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      callback(new Error('Origin is not allowed by CORS'))
    },
  }),
)
app.use(express.json())

app.get('/', (_request, response) => {
  response.json({
    application: 'M-Service Desk',
    status: 'ok',
  })
})

app.use('/api/health', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/admin/users', usersRouter)
app.use('/api/service-requests', serviceRequestsRouter)
app.use('/api/admin/service-requests', adminServiceRequestsRouter)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
