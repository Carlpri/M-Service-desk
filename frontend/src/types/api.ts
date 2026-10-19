export type UserRole = 'CITIZEN' | 'ADMIN'

export type RequestStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED'

export type UserProfile = {
  id: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  emailVerifiedAt: string | null
  createdAt: string
  updatedAt: string
}

export type AuthResponse = {
  token: string
  tokenType: 'Bearer'
  expiresAt: string
  user: UserProfile
}

export type ServiceRequestCitizen = {
  id: string
  name: string
  email: string
}

export type ServiceRequest = {
  id: string
  referenceNumber: string
  citizenId: string
  citizen?: ServiceRequestCitizen
  category: string
  location: string
  description: string
  imageUrl: string | null
  status: RequestStatus
  resolutionNote: string | null
  createdAt: string
  updatedAt: string
}

export type ServiceRequestAnalytics = {
  total: number
  pending: number
  inProgress: number
  resolved: number
  byCategory: Array<{ category: string; count: number }>
}

export type ApiHealthResponse = {
  application: string
  status: 'ok' | 'error'
  timestamp: string
  database: 'connected' | 'disconnected'
}

export type PaginatedUsersResponse = {
  users: UserProfile[]
  page: number
  pageSize: number
  total: number
}
