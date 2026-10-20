import type {
  ApiHealthResponse,
  AuthResponse,
  PaginatedUsersResponse,
  RequestStatus,
  ServiceRequest,
  ServiceRequestAnalytics,
  UserProfile,
} from '../types/api'

function resolveApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL
  if (configured && !configured.includes('localhost')) {
    return configured.replace(/\/+$/, '')
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    // If running on Vercel or public domain, connect to the deployed Render backend
    if (host.endsWith('vercel.app') || (!host.includes('localhost') && !host.includes('127.0.0.1') && !host.startsWith('192.168.') && !host.startsWith('10.') && !host.startsWith('172.'))) {
      return 'https://m-service-desk.onrender.com'
    }
    // If running on local LAN Wi-Fi (e.g. 192.168.0.104), connect to host machine backend
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return `${window.location.protocol}//${host}:3000`
    }
  }

  return 'http://localhost:3000'
}

const apiBaseUrl = resolveApiBaseUrl()

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${apiBaseUrl}${path}`
  const headers = new Headers(options.headers || {})

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(url, {
      ...options,
      headers,
    })
  } catch {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine
    if (isOffline) {
      throw new Error('You are currently offline. Please check your internet connection.')
    }
    throw new Error(
      'Unable to connect to M-Service Desk server. If this persists, the server may be sleeping or restarting.',
    )
  }

  const contentType = response.headers.get('content-type')
  const isJson = contentType && contentType.includes('application/json')
  const data = isJson ? await response.json() : null

  if (!response.ok) {
    const detailsMap: Record<string, string> = {}
    if (Array.isArray(data?.details)) {
      for (const d of data.details) {
        if (d.path && d.path.length > 0) {
          detailsMap[String(d.path[0])] = d.message
        }
      }
    }

    const detailsMessage =
      Array.isArray(data?.details) && data.details.length > 0
        ? data.details
            .map((d: { path?: (string | number)[]; message: string }) => d.message)
            .join(' • ')
        : null

    let statusMessage = data?.message || detailsMessage
    if (!statusMessage) {
      switch (response.status) {
        case 400:
          statusMessage = 'Request validation failed. Please check the entered data.'
          break
        case 401:
          statusMessage = 'Email or password is incorrect.'
          break
        case 403:
          statusMessage =
            data?.error === 'CORS_ORIGIN_DENIED'
              ? 'Access denied by CORS security policy. This domain is not permitted.'
              : 'Access denied. You do not have permission for this resource.'
          break
        case 404:
          statusMessage = 'The requested endpoint was not found.'
          break
        case 409:
          statusMessage = 'An account with this email already exists.'
          break
        case 429:
          statusMessage = 'Too many requests. Please wait a few seconds and try again.'
          break
        default:
          statusMessage =
            response.status >= 500
              ? 'County Desk server encountered an error. Please try again shortly.'
              : `Request failed with status ${response.status}`
      }
    }

    const error = new Error(statusMessage)
    ;(error as unknown as { status: number; code?: string; fieldErrors?: Record<string, string> }).status = response.status
    ;(error as unknown as { status: number; code?: string; fieldErrors?: Record<string, string> }).code = data?.error
    ;(error as unknown as { status: number; code?: string; fieldErrors?: Record<string, string> }).fieldErrors = detailsMap
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
