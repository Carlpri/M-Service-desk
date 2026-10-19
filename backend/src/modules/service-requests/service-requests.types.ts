import { RequestStatus } from '../../generated/prisma/enums.js'

export type ServiceRequestCitizen = {
  id: string
  name: string
  email: string
}

export type ServiceRequestRecord = {
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
  createdAt: Date
  updatedAt: Date
}

export type ServiceRequestAnalytics = {
  total: number
  pending: number
  inProgress: number
  resolved: number
  byCategory: Array<{ category: string; count: number }>
}
