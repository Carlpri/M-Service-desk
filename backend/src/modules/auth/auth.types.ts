import type { UserRole } from '../../generated/prisma/enums.js'

export type AuthenticatedUser = {
  userId: string
  role: UserRole
  sessionId: string
}
