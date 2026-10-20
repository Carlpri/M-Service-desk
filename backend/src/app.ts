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

import { HttpError } from './utils/http-error.js'

const app = express()

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        env.frontendOrigins.includes(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(
          origin,
        )
      ) {
        callback(null, true)
        return
      }

      callback(new HttpError(403, 'CORS_ORIGIN_DENIED', `Origin '${origin}' is not allowed by CORS`))
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
