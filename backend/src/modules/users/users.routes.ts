import { Router } from 'express'
import { z } from 'zod'
import { authenticate, requireRole } from '../../middleware/authenticate.js'
import { UserRole } from '../../generated/prisma/enums.js'
import { listUsers } from '../auth/auth.service.js'

const usersRouter = Router()
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

usersRouter.get('/', authenticate, requireRole(UserRole.ADMIN), async (request, response) => {
  const { page, pageSize } = paginationSchema.parse(request.query)
  response.json(await listUsers(page, pageSize))
})

export default usersRouter
