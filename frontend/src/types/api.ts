export type ApiHealthResponse = {
  application: string
  status: 'ok' | 'error'
  timestamp: string
  database: 'connected' | 'disconnected'
}
