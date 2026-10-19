import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material'
import { getMyRequests } from '../services/api'
import type { RequestStatus, ServiceRequest, UserProfile } from '../types/api'

type CitizenRequestsListProps = {
  token: string | null
  user: UserProfile | null
  onOpenAuth: () => void
  onNavigateToSubmit: () => void
}

const statusColorMap: Record<RequestStatus, 'warning' | 'info' | 'success'> = {
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  RESOLVED: 'success',
}

const statusLabelMap: Record<RequestStatus, string> = {
  PENDING: 'Pending Review',
  IN_PROGRESS: 'In Progress (Field Action)',
  RESOLVED: 'Resolved',
}

export default function CitizenRequestsList({
  token,
  user,
  onOpenAuth,
  onNavigateToSubmit,
}: CitizenRequestsListProps) {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchRequests = async () => {
    if (!token) return
    setLoading(true)
    setError(null)

    try {
      const response = await getMyRequests(token, {
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search.trim() || undefined,
      })
      setRequests(response.requests)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load service requests'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      void fetchRequests()
    }
  }, [token, statusFilter])

  const handleCopy = (ref: string, id: string) => {
    navigator.clipboard.writeText(ref)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (!token || !user) {
    return (
      <Paper elevation={0} sx={{ p: { xs: 4, md: 6 }, textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 4, my: 4, width: '100%' }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1.5, color: 'primary.main', fontSize: { xs: '1.8rem', md: '2.2rem' } }}>
          Sign In to Track Your Requests
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', mb: 4, fontSize: '1.15rem' }}>
          Track the live status of your submitted service requests, monitor fieldwork progress, and review official county resolution notes.
        </Typography>
        <Button variant="contained" color="primary" size="large" onClick={onOpenAuth} sx={{ px: 5, py: 1.6, fontWeight: 700, fontSize: '1.1rem' }}>
          Sign In
        </Button>
      </Paper>
    )
  }

  const getStepIndex = (status: RequestStatus) => {
    switch (status) {
      case 'PENDING':
        return 0
      case 'IN_PROGRESS':
        return 1
      case 'RESOLVED':
        return 3
      default:
        return 0
    }
  }

  return (
    <Box sx={{ width: '100%', py: 3 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', fontSize: { xs: '1.8rem', md: '2.3rem' } }}>
            My Public Service Requests
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.15rem', mt: 0.5 }}>
            Tracking requests submitted by <strong>{user.name}</strong>
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" size="large" onClick={fetchRequests} disabled={loading} sx={{ fontWeight: 700, px: 3 }}>
            Refresh
          </Button>
          <Button variant="contained" color="primary" size="large" onClick={onNavigateToSubmit} sx={{ fontWeight: 700, px: 3.5 }}>
            + New Request
          </Button>
        </Stack>
      </Stack>

      {/* Filters and Search Bar spanning full width */}
      <Card sx={{ mb: 4, p: 2.5, width: '100%' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems={{ md: 'center' }} justifyContent="space-between">
          <Stack direction="row" spacing={1.5} flexWrap="wrap" gap={1}>
            {['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED'].map((filter) => (
              <Chip
                key={filter}
                label={filter === 'ALL' ? 'All Requests' : filter.replace('_', ' ')}
                clickable
                color={statusFilter === filter ? 'primary' : 'default'}
                variant={statusFilter === filter ? 'filled' : 'outlined'}
                onClick={() => setStatusFilter(filter)}
                sx={{ fontWeight: 700, fontSize: '0.95rem', py: 2.2, px: 1.2 }}
              />
            ))}
          </Stack>

          <Stack direction="row" spacing={1.5} sx={{ width: { xs: '100%', md: 'auto' } }}>
            <TextField
              size="medium"
              placeholder="Search reference # or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void fetchRequests()
              }}
              sx={{ minWidth: 280, flexGrow: 1 }}
            />
            <Button variant="contained" size="large" onClick={fetchRequests} sx={{ px: 3, fontWeight: 700 }}>
              Search
            </Button>
          </Stack>
        </Stack>
      </Card>

      {/* Content State */}
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress size={44} color="primary" />
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2.5, fontSize: '1.15rem' }}>
            Loading your service requests...
          </Typography>
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2, fontSize: '1.05rem', py: 1.5 }}>
          {error}
        </Alert>
      ) : requests.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1.5 }}>
            No Service Requests Found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, fontSize: '1.15rem' }}>
            {statusFilter !== 'ALL' || search
              ? 'No requests match your current search or status filter.'
              : 'You have not submitted any service requests to Murang\'a County yet.'}
          </Typography>
          <Button variant="contained" color="primary" size="large" onClick={onNavigateToSubmit} sx={{ px: 4, py: 1.4, fontWeight: 700 }}>
            Submit a Request Now
          </Button>
        </Paper>
      ) : (
        <Stack spacing={3.5}>
          {requests.map((req) => (
            <Card key={req.id} sx={{ overflow: 'visible', width: '100%', p: { xs: 2, sm: 3, md: 4 } }}>
              <CardContent sx={{ p: 0 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 2.5 }}>
                  <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" gap={1.5}>
                    <Box
                      sx={{
                        bgcolor: '#f1f5f9',
                        px: 2,
                        py: 0.8,
                        borderRadius: 2,
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        fontSize: '1.15rem',
                        color: 'primary.dark',
                        border: '1px solid #cbd5e1',
                      }}
                    >
                      {req.referenceNumber}
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleCopy(req.referenceNumber, req.id)}
                      sx={{ fontSize: '0.85rem', fontWeight: 600, py: 0.5, px: 1.5 }}
                    >
                      {copiedId === req.id ? 'Copied!' : 'Copy Ref'}
                    </Button>
                    <Chip size="medium" label={req.category} sx={{ fontWeight: 700, bgcolor: '#e0f2fe', color: '#0369a1', fontSize: '0.95rem', py: 2 }} />
                  </Stack>

                  <Chip
                    size="medium"
                    color={statusColorMap[req.status]}
                    label={statusLabelMap[req.status]}
                    sx={{ fontWeight: 800, fontSize: '1rem', py: 2.2, px: 1.5 }}
                  />
                </Stack>

                {/* Progress Stepper */}
                <Box sx={{ width: '100%', py: 2.5, mb: 2.5, bgcolor: '#f8fafc', borderRadius: 3, px: { xs: 2, md: 4 } }}>
                  <Stepper activeStep={getStepIndex(req.status)} alternativeLabel sx={{ '& .MuiStepLabel-label': { fontSize: '0.95rem', fontWeight: 700, mt: 1 } }}>
                    <Step completed={getStepIndex(req.status) >= 0}>
                      <StepLabel>Submitted</StepLabel>
                    </Step>
                    <Step completed={getStepIndex(req.status) >= 1}>
                      <StepLabel>Under Review / Fieldwork</StepLabel>
                    </Step>
                    <Step completed={req.status === 'RESOLVED'}>
                      <StepLabel>Resolved</StepLabel>
                    </Step>
                  </Stepper>
                </Box>

                <Stack spacing={1.5} sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.98rem' }}>
                    Location: <strong style={{ color: '#0f172a' }}>{req.location}</strong> • Submitted: {new Date(req.createdAt).toLocaleDateString()} at {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'text.primary', lineHeight: 1.7, fontSize: '1.15rem' }}>
                    {req.description}
                  </Typography>
                </Stack>

                {req.imageUrl && (
                  <Box sx={{ mt: 2, mb: 2 }}>
                    <Box
                      component="img"
                      src={req.imageUrl}
                      alt="Incident photo"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                      sx={{ maxHeight: 220, borderRadius: 2, border: '1px solid #e2e8f0', objectFit: 'cover', boxShadow: '0 4px 10px rgba(0,0,0,0.06)' }}
                    />
                  </Box>
                )}

                {req.resolutionNote && (
                  <Alert severity="success" sx={{ borderRadius: 3, mt: 2, p: 2, fontSize: '1.08rem' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'block', mb: 0.8, fontSize: '1.05rem', color: '#065f46' }}>
                      Official County Resolution Note:
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#047857', lineHeight: 1.6 }}>{req.resolutionNote}</Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  )
}
