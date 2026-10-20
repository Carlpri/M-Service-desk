import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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
  IN_PROGRESS: 'Under Fieldwork',
  RESOLVED: 'Resolved',
}

const statusIconMap: Record<RequestStatus, string> = {
  PENDING: '⏳',
  IN_PROGRESS: '⚡',
  RESOLVED: '✅',
}

const categoryIconMap: Record<string, string> = {
  'Roads & Infrastructure': '🛣️',
  'Water & Sanitation': '💧',
  'Waste Management': '♻️',
  'Public Health': '🏥',
  'Street Lighting & Energy': '💡',
  'Agriculture & Livestock': '🌱',
  'County Planning & Housing': '🏗️',
  'Environment & Forestry': '🌳',
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

  // Request details / tracking modal
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null)

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
      const msg = err instanceof Error ? err.message : 'Failed to load your service requests'
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

  // Calculate personal metrics
  const summaryMetrics = useMemo(() => {
    const total = requests.length
    const pending = requests.filter((r) => r.status === 'PENDING').length
    const inProgress = requests.filter((r) => r.status === 'IN_PROGRESS').length
    const resolved = requests.filter((r) => r.status === 'RESOLVED').length
    return { total, pending, inProgress, resolved }
  }, [requests])

  if (!token || !user) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3.5, sm: 5, md: 6 },
          textAlign: 'center',
          border: '1px solid rgba(0, 65, 46, 0.1)',
          borderRadius: 4,
          my: 4,
          bgcolor: 'background.paper',
          width: '100%',
        }}
      >
        <Box
          sx={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            bgcolor: '#E6F0EB',
            color: '#00412E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            mx: 'auto',
            mb: 2,
          }}
        >
          📋
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: '#00412E', fontSize: { xs: '1.6rem', md: '2rem' } }}>
          Sign In to Track Your Requests
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 520, mx: 'auto', mb: 3.5, fontSize: '1rem', lineHeight: 1.6 }}>
          Monitor live fieldwork status, review official Murang'a County resolution notes, and submit public service reports.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={onOpenAuth}
          sx={{ px: 4, py: 1.4, fontWeight: 700, fontSize: '1rem' }}
        >
          Sign In to Citizen Portal
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
        return 2
      default:
        return 0
    }
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 1000, mx: 'auto', py: { xs: 1.5, sm: 2.5 } }}>
      {/* ============================================================== */}
      {/* 1. GREETING & CITIZEN HEADER (Mobile-First Blue Finance Style)  */}
      {/* ============================================================== */}
      <Card
        sx={{
          p: { xs: 2.5, sm: 3 },
          mb: 2.5,
          borderRadius: 3.5,
          bgcolor: '#FFFFFF',
          border: '1px solid rgba(0, 65, 46, 0.08)',
          boxShadow: '0 4px 18px rgba(0, 65, 46, 0.04)',
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#00412E', fontSize: { xs: '1.4rem', sm: '1.75rem' } }}>
              Jambo, {user.name.split(' ')[0]} 👋
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3, fontSize: '0.9rem' }}>
              Murang'a County Citizen Public Service Request Desk
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            onClick={fetchRequests}
            disabled={loading}
            sx={{
              fontWeight: 700,
              borderRadius: 2,
              borderColor: 'rgba(0, 65, 46, 0.2)',
              color: '#00412E',
              alignSelf: { xs: 'flex-start', sm: 'center' },
            }}
          >
            {loading ? <CircularProgress size={14} sx={{ mr: 0.8 }} /> : '🔄 '}
            Refresh Status
          </Button>
        </Stack>
      </Card>

      {/* ============================================================== */}
      {/* 2. CITIZEN SUMMARY CARDS (2x2 on Mobile, 4 Cols on Desktop)     */}
      {/* ============================================================== */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
          gap: { xs: 1.5, sm: 2 },
          mb: 2.5,
        }}
      >
        {/* Card 1: Total */}
        <Card
          onClick={() => setStatusFilter('ALL')}
          sx={{
            p: 2,
            borderRadius: 3,
            cursor: 'pointer',
            bgcolor: statusFilter === 'ALL' ? '#E6F0EB' : '#FFFFFF',
            border: `1.5px solid ${statusFilter === 'ALL' ? '#00412E' : 'rgba(0, 65, 46, 0.08)'}`,
            transition: 'transform 0.15s ease',
            '&:hover': { transform: 'translateY(-2px)' },
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.72rem' }}>
            Total Logged
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#00412E', my: 0.5, fontSize: { xs: '1.8rem', sm: '2.2rem' } }}>
            {summaryMetrics.total}
          </Typography>
          <Typography variant="caption" sx={{ color: '#00412E', fontWeight: 600, fontSize: '0.75rem' }}>
            All requests
          </Typography>
        </Card>

        {/* Card 2: Pending */}
        <Card
          onClick={() => setStatusFilter('PENDING')}
          sx={{
            p: 2,
            borderRadius: 3,
            cursor: 'pointer',
            bgcolor: statusFilter === 'PENDING' ? '#FEF3C7' : '#FFFFFF',
            border: `1.5px solid ${statusFilter === 'PENDING' ? '#D97706' : 'rgba(217, 119, 6, 0.15)'}`,
            transition: 'transform 0.15s ease',
            '&:hover': { transform: 'translateY(-2px)' },
          }}
        >
          <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.72rem' }}>
            Pending
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#D97706', my: 0.5, fontSize: { xs: '1.8rem', sm: '2.2rem' } }}>
            {summaryMetrics.pending}
          </Typography>
          <Typography variant="caption" sx={{ color: '#B45309', fontWeight: 600, fontSize: '0.75rem' }}>
            Under review
          </Typography>
        </Card>

        {/* Card 3: In Progress */}
        <Card
          onClick={() => setStatusFilter('IN_PROGRESS')}
          sx={{
            p: 2,
            borderRadius: 3,
            cursor: 'pointer',
            bgcolor: statusFilter === 'IN_PROGRESS' ? '#E6F0EB' : '#FFFFFF',
            border: `1.5px solid ${statusFilter === 'IN_PROGRESS' ? '#00412E' : 'rgba(0, 65, 46, 0.15)'}`,
            transition: 'transform 0.15s ease',
            '&:hover': { transform: 'translateY(-2px)' },
          }}
        >
          <Typography variant="caption" sx={{ color: '#00412E', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.72rem' }}>
            In Progress
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#00412E', my: 0.5, fontSize: { xs: '1.8rem', sm: '2.2rem' } }}>
            {summaryMetrics.inProgress}
          </Typography>
          <Typography variant="caption" sx={{ color: '#00412E', fontWeight: 600, fontSize: '0.75rem' }}>
            Field action
          </Typography>
        </Card>

        {/* Card 4: Resolved */}
        <Card
          onClick={() => setStatusFilter('RESOLVED')}
          sx={{
            p: 2,
            borderRadius: 3,
            cursor: 'pointer',
            bgcolor: statusFilter === 'RESOLVED' ? '#DCFCE7' : '#FFFFFF',
            border: `1.5px solid ${statusFilter === 'RESOLVED' ? '#15803D' : 'rgba(21, 128, 61, 0.15)'}`,
            transition: 'transform 0.15s ease',
            '&:hover': { transform: 'translateY(-2px)' },
          }}
        >
          <Typography variant="caption" sx={{ color: '#15803D', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.72rem' }}>
            Resolved
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#15803D', my: 0.5, fontSize: { xs: '1.8rem', sm: '2.2rem' } }}>
            {summaryMetrics.resolved}
          </Typography>
          <Typography variant="caption" sx={{ color: '#15803D', fontWeight: 600, fontSize: '0.75rem' }}>
            Interventions done
          </Typography>
        </Card>
      </Box>

      {/* ============================================================== */}
      {/* 3. PROMINENT PRIMARY ACTION — SUBMIT A SERVICE REQUEST           */}
      {/* ============================================================== */}
      <Card
        sx={{
          p: { xs: 2.5, sm: 3 },
          mb: 3,
          borderRadius: 3.5,
          bgcolor: '#00412E', // Brand Primary Dark Green
          color: '#FFFFFF',
          boxShadow: '0 8px 24px rgba(0, 65, 46, 0.15)',
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, color: '#FFFFFF', fontSize: { xs: '1.15rem', sm: '1.3rem' } }}>
              Report a Public Service Breakdown
            </Typography>
            <Typography variant="body2" sx={{ color: '#96BF8A', fontSize: '0.88rem', mt: 0.3 }}>
              Road potholes, water pipeline bursts, streetlights, or waste management issues.
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="large"
            onClick={onNavigateToSubmit}
            sx={{
              bgcolor: '#96BF8A',
              color: '#00261A',
              fontWeight: 800,
              fontSize: '1rem',
              px: 3.5,
              py: 1.2,
              borderRadius: 2.5,
              whiteSpace: 'nowrap',
              '&:hover': { bgcolor: '#B5D6AB' },
            }}
          >
            + Submit Request
          </Button>
        </Stack>
      </Card>

      {/* ============================================================== */}
      {/* 4. SEARCH & FILTERS BAR                                         */}
      {/* ============================================================== */}
      <Card sx={{ p: 2, mb: 2.5, borderRadius: 3, boxShadow: '0 2px 10px rgba(0, 65, 46, 0.03)' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} justifyContent="space-between">
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.6}>
            {['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED'].map((filter) => (
              <Chip
                key={filter}
                label={filter === 'ALL' ? 'All' : filter.replace('_', ' ')}
                clickable
                color={statusFilter === filter ? 'primary' : 'default'}
                variant={statusFilter === filter ? 'filled' : 'outlined'}
                onClick={() => setStatusFilter(filter)}
                sx={{ fontWeight: 700, fontSize: '0.82rem', height: 30 }}
              />
            ))}
          </Stack>

          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              placeholder="Search reference # or ward..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void fetchRequests()
              }}
              sx={{ minWidth: { xs: 160, sm: 220 } }}
            />
            <Button variant="contained" size="small" onClick={fetchRequests} sx={{ px: 2, fontWeight: 700 }}>
              Search
            </Button>
          </Stack>
        </Stack>
      </Card>

      {/* ============================================================== */}
      {/* 5. MY RECENT REQUESTS LIST                                      */}
      {/* ============================================================== */}
      {error && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress size={36} color="primary" />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Loading your requests...
          </Typography>
        </Box>
      ) : requests.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 5,
            textAlign: 'center',
            border: '1px solid rgba(0, 65, 46, 0.08)',
            borderRadius: 3.5,
            bgcolor: '#FFFFFF',
          }}
        >
          <Box sx={{ fontSize: '3rem', mb: 1 }}>🍃</Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#00412E', mb: 0.5 }}>
            No Service Requests Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 450, mx: 'auto', mb: 3 }}>
            {statusFilter !== 'ALL' || search
              ? 'No requests match your current search or status filter.'
              : 'You have not submitted any service requests to Murang\'a County yet. Submit your first request to get started.'}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={onNavigateToSubmit}
            sx={{ fontWeight: 800, px: 3.5 }}
          >
            Submit a Request
          </Button>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {requests.map((req) => {
            const icon = categoryIconMap[req.category] || '📌'

            return (
              <Card
                key={req.id}
                sx={{
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: 3.5,
                  bgcolor: '#FFFFFF',
                  border: '1px solid rgba(0, 65, 46, 0.08)',
                  boxShadow: '0 2px 12px rgba(0, 65, 46, 0.03)',
                  transition: 'box-shadow 0.18s ease, border-color 0.18s ease',
                  '&:hover': {
                    borderColor: '#96BF8A',
                    boxShadow: '0 6px 18px rgba(0, 65, 46, 0.08)',
                  },
                }}
              >
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                  {/* Top line: Reference number + Copy + Status badge */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          bgcolor: '#E8EAE5',
                          px: 1.2,
                          py: 0.4,
                          borderRadius: 1.5,
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          fontSize: '0.88rem',
                          color: '#00412E',
                        }}
                      >
                        {req.referenceNumber}
                      </Box>
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => handleCopy(req.referenceNumber, req.id)}
                        sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#00412E', minWidth: 'auto', p: 0.5 }}
                      >
                        {copiedId === req.id ? 'Copied!' : 'Copy'}
                      </Button>
                    </Stack>

                    <Chip
                      size="small"
                      color={statusColorMap[req.status]}
                      label={`${statusIconMap[req.status]} ${statusLabelMap[req.status]}`}
                      sx={{ fontWeight: 800, fontSize: '0.78rem' }}
                    />
                  </Stack>

                  {/* Category & Location */}
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <Typography sx={{ fontSize: '1.2rem' }}>{icon}</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0B1C16', fontSize: '0.98rem' }}>
                      {req.category}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      • 📍 {req.location}
                    </Typography>
                  </Stack>

                  {/* Clean truncated description */}
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      fontSize: '0.9rem',
                      lineHeight: 1.5,
                      mb: 2,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {req.description}
                  </Typography>

                  {/* Bottom line: Date & View Details Button */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 1, borderTop: '1px solid rgba(0, 65, 46, 0.06)' }}>
                    <Typography variant="caption" color="text.secondary">
                      Submitted on {new Date(req.createdAt).toLocaleDateString()}
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setSelectedRequest(req)}
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        borderRadius: 2,
                        color: '#00412E',
                        borderColor: 'rgba(0, 65, 46, 0.25)',
                      }}
                    >
                      Track Progress →
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            )
          })}
        </Stack>
      )}

      {/* ============================================================== */}
      {/* 6. REQUEST TRACKING & DETAILS MODAL                             */}
      {/* ============================================================== */}
      <Dialog
        open={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, p: 1 } }}
      >
        <DialogTitle sx={{ pb: 1, pt: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#00412E', fontSize: '1.25rem' }}>
                Service Request Progress
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Reference: <strong>{selectedRequest?.referenceNumber}</strong>
              </Typography>
            </Box>
            {selectedRequest && (
              <Chip
                size="small"
                color={statusColorMap[selectedRequest.status]}
                label={statusLabelMap[selectedRequest.status]}
                sx={{ fontWeight: 800, fontSize: '0.78rem' }}
              />
            )}
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ py: 2.5 }}>
          {selectedRequest && (
            <Stack spacing={2.5}>
              {/* Stepper tracking current progress */}
              <Box sx={{ width: '100%', py: 2, bgcolor: '#F8FAF9', borderRadius: 3, px: 2 }}>
                <Stepper
                  activeStep={getStepIndex(selectedRequest.status)}
                  alternativeLabel
                  sx={{
                    '& .MuiStepLabel-label': { fontSize: '0.85rem', fontWeight: 700, mt: 0.8 },
                    '& .MuiStepIcon-root.Mui-active': { color: '#00412E' },
                    '& .MuiStepIcon-root.Mui-completed': { color: '#15803D' },
                  }}
                >
                  <Step completed={getStepIndex(selectedRequest.status) >= 0}>
                    <StepLabel>Submitted</StepLabel>
                  </Step>
                  <Step completed={getStepIndex(selectedRequest.status) >= 1}>
                    <StepLabel>Under Review</StepLabel>
                  </Step>
                  <Step completed={selectedRequest.status === 'RESOLVED'}>
                    <StepLabel>Resolved</StepLabel>
                  </Step>
                </Stepper>
              </Box>

              {/* Request metadata */}
              <Box sx={{ p: 2, bgcolor: '#FFFFFF', borderRadius: 2.5, border: '1px solid rgba(0, 65, 46, 0.08)' }}>
                <Typography variant="caption" sx={{ color: '#00412E', fontWeight: 800, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                  {categoryIconMap[selectedRequest.category] || '📌'} {selectedRequest.category}
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.6, color: '#0B1C16', mb: 1 }}>
                  {selectedRequest.description}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  📍 Location: <strong>{selectedRequest.location}</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  🕒 Logged: {new Date(selectedRequest.createdAt).toLocaleString()}
                </Typography>
              </Box>

              {/* Photo attachment if available */}
              {selectedRequest.imageUrl && (
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.5 }}>
                    Incident Photo Attachment:
                  </Typography>
                  <Box
                    component="img"
                    src={selectedRequest.imageUrl}
                    alt="Incident photo"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                    sx={{ maxHeight: 220, width: '100%', borderRadius: 2, objectFit: 'cover', border: '1px solid #E8EAE5' }}
                  />
                </Box>
              )}

              {/* Official County Resolution Note if available */}
              {selectedRequest.resolutionNote ? (
                <Alert severity="success" sx={{ borderRadius: 2.5, p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5, color: '#166534', fontSize: '0.92rem' }}>
                    Official County Resolution Note:
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#14532D', lineHeight: 1.5 }}>
                    {selectedRequest.resolutionNote}
                  </Typography>
                </Alert>
              ) : selectedRequest.status === 'IN_PROGRESS' ? (
                <Alert severity="info" sx={{ borderRadius: 2.5 }}>
                  Murang'a County field crews have been dispatched to the reported location for inspection and repairs.
                </Alert>
              ) : (
                <Alert severity="warning" sx={{ borderRadius: 2.5 }}>
                  Your request is queued for department review. You will receive live updates as crews are assigned.
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setSelectedRequest(null)} sx={{ fontWeight: 700, color: '#00412E' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
