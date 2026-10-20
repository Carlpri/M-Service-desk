import { useEffect, useState } from 'react'
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
  Grid,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { getAdminAnalytics, getAdminUsers, getAllRequests, updateRequestStatus } from '../services/api'
import type { RequestStatus, ServiceRequest, ServiceRequestAnalytics, UserProfile } from '../types/api'

type AdminDashboardProps = {
  token: string | null
  user: UserProfile | null
  onOpenAuth: () => void
}

const statusColorMap: Record<RequestStatus, 'warning' | 'info' | 'success'> = {
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  RESOLVED: 'success',
}

export default function AdminDashboard({ token, user, onOpenAuth }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState(0)

  // Analytics State
  const [analytics, setAnalytics] = useState<ServiceRequestAnalytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  // Requests Table State
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  // Registered Users State
  const [users, setUsers] = useState<UserProfile[]>([])
  const [usersLoading, setUsersLoading] = useState(false)

  // Status Update Dialog State
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null)
  const [newStatus, setNewStatus] = useState<RequestStatus>('PENDING')
  const [resolutionNote, setResolutionNote] = useState('')
  const [updating, setUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [dashboardError, setDashboardError] = useState<string | null>(null)

  const fetchAnalytics = async () => {
    if (!token) return
    setAnalyticsLoading(true)
    try {
      const response = await getAdminAnalytics(token)
      setAnalytics(response.analytics)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load analytics KPIs'
      setDashboardError(msg)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const fetchRequests = async () => {
    if (!token) return
    setRequestsLoading(true)
    try {
      const response = await getAllRequests(token, {
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search.trim() || undefined,
      })
      setRequests(response.requests)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load service requests'
      setDashboardError(msg)
    } finally {
      setRequestsLoading(false)
    }
  }

  const fetchUsers = async () => {
    if (!token) return
    setUsersLoading(true)
    try {
      const response = await getAdminUsers(token)
      setUsers(response.users)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load registered users'
      setDashboardError(msg)
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    if (token && user?.role === 'ADMIN') {
      void fetchAnalytics()
      void fetchRequests()
      void fetchUsers()
    }
  }, [token, user, statusFilter])

  const handleOpenStatusDialog = (req: ServiceRequest) => {
    setSelectedRequest(req)
    setNewStatus(req.status)
    setResolutionNote(req.resolutionNote || '')
    setUpdateError(null)
  }

  const handleSaveStatus = async () => {
    if (!token || !selectedRequest) return
    setUpdating(true)
    setUpdateError(null)

    try {
      await updateRequestStatus(token, selectedRequest.id, {
        status: newStatus,
        resolutionNote: resolutionNote.trim() || undefined,
      })

      setSuccessMessage(`Request ${selectedRequest.referenceNumber} status updated to ${newStatus}`)
      setTimeout(() => setSuccessMessage(null), 4000)

      setSelectedRequest(null)
      void fetchAnalytics()
      void fetchRequests()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update request status'
      setUpdateError(msg)
    } finally {
      setUpdating(false)
    }
  }

  if (!token || !user) {
    return (
      <Paper elevation={0} sx={{ p: { xs: 4, md: 6 }, textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 4, my: 4, width: '100%' }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1.5, color: 'primary.main', fontSize: { xs: '1.8rem', md: '2.2rem' } }}>
          Administrator Authentication Required
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 650, mx: 'auto', mb: 4, fontSize: '1.15rem' }}>
          Access to county service request triage, resolution workflows, and analytics requires an authorized administrator session.
        </Typography>
        <Button variant="contained" color="primary" size="large" onClick={onOpenAuth} sx={{ px: 5, py: 1.6, fontWeight: 700, fontSize: '1.1rem' }}>
          Sign In as Administrator
        </Button>
      </Paper>
    )
  }

  if (user.role !== 'ADMIN') {
    return (
      <Paper elevation={0} sx={{ p: { xs: 4, md: 6 }, textAlign: 'center', border: '2px solid #fed7aa', borderRadius: 4, my: 4, bgcolor: '#fffbeb', width: '100%' }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1.5, color: '#9a3412', fontSize: { xs: '1.8rem', md: '2.2rem' } }}>
          Access Restricted: Citizen Account
        </Typography>
        <Typography variant="body1" sx={{ maxWidth: 680, mx: 'auto', color: '#b45309', fontSize: '1.15rem', lineHeight: 1.6 }}>
          Your current account has the <strong>CITIZEN</strong> role. Administrative actions (status changes, triage, county-wide listings, and analytics) are restricted to authorized administrators via backend role checks.
        </Typography>
      </Paper>
    )
  }

  return (
    <Box sx={{ width: '100%', py: 3 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.dark', fontSize: { xs: '1.8rem', md: '2.4rem' } }}>
            Murang'a County Administrator Desk
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.15rem', mt: 0.5 }}>
            Operational triage dashboard for public service requests, status management, and real-time analytics.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="large"
          sx={{ fontWeight: 700, px: 3, py: 1.2 }}
          onClick={() => {
            void fetchAnalytics()
            void fetchRequests()
            void fetchUsers()
          }}
        >
          Refresh Data
        </Button>
      </Stack>

      {dashboardError && (
        <Alert
          severity="error"
          onClose={() => setDashboardError(null)}
          sx={{ mb: 4, borderRadius: 3, fontSize: '1.08rem', py: 1.5 }}
        >
          {dashboardError}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 4, borderRadius: 3, fontSize: '1.08rem', py: 1.5 }}>
          {successMessage}
        </Alert>
      )}

      {/* Analytics KPI Summary Cards spanning full width */}
      <Grid container spacing={3} sx={{ mb: 4.5 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: '#ffffff', p: 2, height: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 1 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.95rem' }}>
                Total Requests
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, color: 'primary.main', my: 1, fontSize: { xs: '2.5rem', md: '3.4rem' } }}>
                {analyticsLoading ? <CircularProgress size={30} /> : analytics?.total ?? 0}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                Submitted across all sub-counties
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: '#ffffff', p: 2, height: '100%', borderLeft: '6px solid #f59e0b', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 1 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.95rem' }}>
                Pending Review
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, color: '#d97706', my: 1, fontSize: { xs: '2.5rem', md: '3.4rem' } }}>
                {analyticsLoading ? <CircularProgress size={30} /> : analytics?.pending ?? 0}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                Awaiting department triage
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: '#ffffff', p: 2, height: '100%', borderLeft: '6px solid #0284c7', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 1 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.95rem' }}>
                In Progress
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, color: '#0284c7', my: 1, fontSize: { xs: '2.5rem', md: '3.4rem' } }}>
                {analyticsLoading ? <CircularProgress size={30} /> : analytics?.inProgress ?? 0}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                Fieldwork or repair ongoing
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: '#ffffff', p: 2, height: '100%', borderLeft: '6px solid #10b981', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 1 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.95rem' }}>
                Resolved
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, color: '#059669', my: 1, fontSize: { xs: '2.5rem', md: '3.4rem' } }}>
                {analyticsLoading ? <CircularProgress size={30} /> : analytics?.resolved ?? 0}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                Completed with resolution note
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Sector Breakdown */}
      {analytics?.byCategory && analytics.byCategory.length > 0 && (
        <Card sx={{ mb: 4.5, p: 3, width: '100%' }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 2, fontSize: '1.4rem' }}>
            Requests by County Service Sector
          </Typography>
          <Grid container spacing={2}>
            {analytics.byCategory.map((cat) => (
              <Grid key={cat.category} size={{ xs: 12, sm: 6, md: 4 }}>
                <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '1rem', mb: 0.5 }}>
                    {cat.category}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', fontSize: '1.6rem' }}>
                    {cat.count} {cat.count === 1 ? 'request' : 'requests'}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Card>
      )}

      {/* Tabs: Service Requests vs County Users */}
      <Tabs
        value={activeTab}
        onChange={(_e, v) => setActiveTab(v)}
        textColor="primary"
        indicatorColor="primary"
        sx={{
          borderBottom: '2px solid #e2e8f0',
          mb: 3.5,
          '& .MuiTab-root': {
            fontSize: '1.1rem',
            fontWeight: 700,
            textTransform: 'none',
            px: 3,
            py: 1.5,
          },
        }}
      >
        <Tab label="Citizen Service Requests" />
        <Tab label="County Registered Users Directory" />
      </Tabs>

      {activeTab === 0 && (
        <Box sx={{ width: '100%' }}>
          {/* Filters Bar */}
          <Card sx={{ mb: 3.5, p: 2.5, width: '100%' }}>
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

          {/* Requests Table */}
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, width: '100%', overflowX: 'auto' }}>
            {requestsLoading ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <CircularProgress size={44} color="primary" />
              </Box>
            ) : requests.length === 0 ? (
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  No service requests found matching criteria.
                </Typography>
              </Box>
            ) : (
              <Table sx={{ minWidth: 800 }}>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, fontSize: '1.08rem', py: 2.2 }}>Reference #</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '1.08rem', py: 2.2 }}>Citizen</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '1.08rem', py: 2.2 }}>Sector & Location</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '1.08rem', py: 2.2 }}>Current Status</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '1.08rem', py: 2.2 }}>Submitted Date</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '1.08rem', py: 2.2 }} align="right">
                      Triage Action
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {requests.map((row) => (
                    <TableRow key={row.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 800, color: 'primary.dark', fontSize: '1.1rem' }}>
                        {row.referenceNumber}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
                          {row.citizen?.name || 'Citizen'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.92rem' }}>
                          {row.citizen?.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '1.05rem' }}>
                          {row.category}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.92rem' }}>
                          {row.location}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="medium"
                          color={statusColorMap[row.status]}
                          label={row.status.replace('_', ' ')}
                          sx={{ fontWeight: 800, fontSize: '0.95rem', py: 2 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.95rem', color: 'text.secondary' }}>
                        {new Date(row.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          variant="contained"
                          size="medium"
                          onClick={() => handleOpenStatusDialog(row)}
                          sx={{ fontSize: '0.92rem', fontWeight: 700, py: 1, px: 2 }}
                        >
                          Update Status
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TableContainer>
        </Box>
      )}

      {activeTab === 1 && (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, width: '100%', overflowX: 'auto' }}>
          {usersLoading ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <CircularProgress size={44} color="primary" />
            </Box>
          ) : users.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                No registered users found.
              </Typography>
            </Box>
          ) : (
            <Table sx={{ minWidth: 800 }}>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, fontSize: '1.08rem', py: 2.2 }}>Full Name</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '1.08rem', py: 2.2 }}>Email Address</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '1.08rem', py: 2.2 }}>Assigned Role</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '1.08rem', py: 2.2 }}>Account State</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '1.08rem', py: 2.2 }}>Registration Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell sx={{ fontWeight: 700, fontSize: '1.05rem' }}>{u.name}</TableCell>
                    <TableCell sx={{ fontSize: '1.02rem' }}>{u.email}</TableCell>
                    <TableCell>
                      <Chip
                        size="medium"
                        color={u.role === 'ADMIN' ? 'secondary' : 'default'}
                        label={u.role}
                        sx={{ fontWeight: 800, fontSize: '0.9rem', py: 2 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="medium"
                        color={u.isActive ? 'success' : 'error'}
                        label={u.isActive ? 'Active' : 'Inactive'}
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: '0.9rem' }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.95rem', color: 'text.secondary' }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      )}

      {/* Status Update Dialog */}
      <Dialog
        open={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, p: 1 } }}
      >
        <DialogTitle sx={{ pb: 1, pt: 2.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Update Request Status & Resolution
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 0.5 }}>
            Reference: <strong>{selectedRequest?.referenceNumber}</strong>
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ py: 3 }}>
          <Stack spacing={3}>
            {updateError && (
              <Alert severity="error" sx={{ borderRadius: 2, fontSize: '1.05rem' }}>
                {updateError}
              </Alert>
            )}

            <Box sx={{ p: 2.5, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 800, mb: 0.5 }}>
                Citizen Incident Description:
              </Typography>
              <Typography variant="body1" sx={{ lineHeight: 1.6, fontSize: '1.1rem' }}>
                {selectedRequest?.description}
              </Typography>
            </Box>

            <TextField
              select
              label="New County Status"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as RequestStatus)}
              fullWidth
              size="medium"
            >
              <MenuItem value="PENDING" sx={{ py: 1.2, fontSize: '1.05rem' }}>PENDING — Waiting for department triage</MenuItem>
              <MenuItem value="IN_PROGRESS" sx={{ py: 1.2, fontSize: '1.05rem' }}>IN_PROGRESS — Field crew deployed / work ongoing</MenuItem>
              <MenuItem value="RESOLVED" sx={{ py: 1.2, fontSize: '1.05rem' }}>RESOLVED — Intervention completed</MenuItem>
            </TextField>

            <TextField
              label="County Resolution Note / Action Summary"
              multiline
              rows={4}
              fullWidth
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="e.g. Murang'a County road engineering unit inspected the site, excavated damaged culverts, and resurfaced the 1.2km stretch with tarmac."
              helperText="This official note will be immediately visible to the citizen on their tracking stepper."
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setSelectedRequest(null)} disabled={updating} size="large" sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleSaveStatus}
            disabled={updating}
            sx={{ fontWeight: 800, px: 4, py: 1.3 }}
          >
            {updating ? <CircularProgress size={24} color="inherit" /> : 'Save Status Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
