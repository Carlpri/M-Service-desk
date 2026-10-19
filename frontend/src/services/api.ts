import type {
  ApiHealthResponse,
  AuthResponse,
  PaginatedUsersResponse,
  RequestStatus,
  ServiceRequest,
  ServiceRequestAnalytics,
  UserProfile,
} from '../types/api'

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${apiBaseUrl}${path}`
  const headers = new Headers(options.headers || {})

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  const contentType = response.headers.get('content-type')
  const isJson = contentType && contentType.includes('application/json')
  const data = isJson ? await response.json() : null

  if (!response.ok) {
    const detailsMessage =
      Array.isArray(data?.details) && data.details.length > 0
        ? data.details
            .map((d: { path?: (string | number)[]; message: string }) => {
              const field = d.path && d.path.length > 0 ? `${d.path.join('.')}: ` : ''
              return `${field}${d.message}`
            })
            .join('; ')
        : null

    const errorMessage =
      detailsMessage ||
      data?.message ||
      data?.error ||
      `Request failed with status ${response.status}`
    const error = new Error(errorMessage)
    ;(error as unknown as { status: number; code?: string }).status = response.status
    ;(error as unknown as { status: number; code?: string }).code = data?.error
    throw error
  }

  return data as T
}

export async function getApiHealth(): Promise<ApiHealthResponse> {
  return request<ApiHealthResponse>('/api/health')
}

// Authentication API
export async function registerUser(input: {
  name: string
  email: string
  password: string
}): Promise<{ message: string; user: UserProfile }> {
  return request<{ message: string; user: UserProfile }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function loginUser(input: {
  email: string
  password: string
}): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function getMe(token: string): Promise<{ user: UserProfile }> {
  return request<{ user: UserProfile }>('/api/auth/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function logoutUser(token: string): Promise<{ message: string }> {
  return request<{ message: string }>('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

// Service Requests API (Citizen)
export async function createServiceRequest(
  token: string,
  input: {
    category: string
    location: string
    description: string
    imageUrl?: string
  },
): Promise<{ message: string; request: ServiceRequest }> {
  return request<{ message: string; request: ServiceRequest }>('/api/service-requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  })
}

export async function getMyRequests(
  token: string,
  query?: {
    status?: string
    category?: string
    search?: string
    page?: number
    pageSize?: number
  },
): Promise<{ requests: ServiceRequest[]; page: number; pageSize: number; total: number }> {
  const params = new URLSearchParams()
  if (query?.status) params.set('status', query.status)
  if (query?.category) params.set('category', query.category)
  if (query?.search) params.set('search', query.search)
  if (query?.page) params.set('page', String(query.page))
  if (query?.pageSize) params.set('pageSize', String(query.pageSize))

  const queryString = params.toString() ? `?${params.toString()}` : ''
  return request<{ requests: ServiceRequest[]; page: number; pageSize: number; total: number }>(
    `/api/service-requests${queryString}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    },
  )
}

export async function getRequestById(
  token: string,
  id: string,
): Promise<{ request: ServiceRequest }> {
  return request<{ request: ServiceRequest }>(`/api/service-requests/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
}

// Service Requests API (Admin)
export async function getAllRequests(
  token: string,
  query?: {
    status?: string
    category?: string
    search?: string
    page?: number
    pageSize?: number
  },
): Promise<{ requests: ServiceRequest[]; page: number; pageSize: number; total: number }> {
  const params = new URLSearchParams()
  if (query?.status) params.set('status', query.status)
  if (query?.category) params.set('category', query.category)
  if (query?.search) params.set('search', query.search)
  if (query?.page) params.set('page', String(query.page))
  if (query?.pageSize) params.set('pageSize', String(query.pageSize))

  const queryString = params.toString() ? `?${params.toString()}` : ''
  return request<{ requests: ServiceRequest[]; page: number; pageSize: number; total: number }>(
    `/api/admin/service-requests${queryString}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    },
  )
}

export async function updateRequestStatus(
  token: string,
  id: string,
  input: {
    status: RequestStatus
    resolutionNote?: string
  },
): Promise<{ message: string; request: ServiceRequest }> {
  return request<{ message: string; request: ServiceRequest }>(
    `/api/admin/service-requests/${encodeURIComponent(id)}/status`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    },
  )
}

export async function getAdminAnalytics(
  token: string,
): Promise<{ analytics: ServiceRequestAnalytics }> {
  return request<{ analytics: ServiceRequestAnalytics }>('/api/admin/service-requests/analytics', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function getAdminUsers(
  token: string,
  page = 1,
  pageSize = 20,
): Promise<PaginatedUsersResponse> {
  return request<PaginatedUsersResponse>(`/api/admin/users?page=${page}&pageSize=${pageSize}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
}
