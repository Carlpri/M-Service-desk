import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  LinearProgress,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
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

const statusLabelMap: Record<RequestStatus, string> = {
  PENDING: 'Pending Triage',
  IN_PROGRESS: 'Active Fieldwork',
  RESOLVED: 'Resolved',
}

// Sector icons map
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

export default function AdminDashboard({ token, user, onOpenAuth }: AdminDashboardProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  // Current view in the admin workspace: 'overview' | 'requests' | 'analytics' | 'citizens'
  const [activeSection, setActiveSection] = useState<'overview' | 'requests' | 'analytics' | 'citizens'>('overview')

  // Analytics State
  const [analytics, setAnalytics] = useState<ServiceRequestAnalytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  // Requests Table State
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
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
        category: categoryFilter === 'ALL' ? undefined : categoryFilter,
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
  }, [token, user, statusFilter, categoryFilter])

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

  // Derive resolution rate
  const resolutionRate = useMemo(() => {
    if (!analytics || analytics.total === 0) return 0
    return Math.round((analytics.resolved / analytics.total) * 100)
  }, [analytics])

  // Extract distinct categories from analytics or requests
  const availableCategories = useMemo(() => {
    if (analytics?.byCategory && analytics.byCategory.length > 0) {
      return analytics.byCategory.map((c) => c.category)
    }
    return [
      'Roads & Infrastructure',
      'Water & Sanitation',
      'Waste Management',
      'Public Health',
      'Street Lighting & Energy',
      'Agriculture & Livestock',
    ]
  }, [analytics])

  if (!token || !user) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: { xs: 4, md: 6 },
          textAlign: 'center',
          border: '1px solid',
          borderColor: 'divider',
          my: 4,
          bgcolor: 'background.paper',
          width: '100%',
        }}
      >
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
      <Paper
        elevation={0}
        sx={{
          p: { xs: 4, md: 6 },
          textAlign: 'center',
          border: '1px solid',
          borderColor: (t) => (t.palette.mode === 'dark' ? 'rgba(217, 119, 6, 0.3)' : '#fed7aa'),
          my: 4,
          bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(217, 119, 6, 0.12)' : '#fffbeb'),
          width: '100%',
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1.5, color: (t) => (t.palette.mode === 'dark' ? '#FBBF24' : '#9a3412'), fontSize: { xs: '1.8rem', md: '2.2rem' } }}>
          Access Restricted: Citizen Account
        </Typography>
        <Typography variant="body1" sx={{ maxWidth: 680, mx: 'auto', color: (t) => (t.palette.mode === 'dark' ? '#FDE68A' : '#b45309'), fontSize: '1.15rem', lineHeight: 1.6 }}>
          Your current account has the <strong>CITIZEN</strong> role. Administrative actions (status updates, triage, county-wide listings, and analytics) are restricted to authorized administrators via backend role checks.
        </Typography>
      </Paper>
    )
  }

  // Sidebar content component (AeuxGlobal inspired dark-green navigation with 8px radius)
  const sidebarContent = (
    <Box
      sx={{
        width: { xs: '280px', md: '260px', lg: '280px' },
        height: '100%',
        bgcolor: '#00412E', // Brand Primary Dark Green
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        p: 2.5,
        borderRadius: { xs: 0, md: '4px' },
        boxShadow: '0 4px 20px rgba(0, 65, 46, 0.2)',
      }}
    >
      {/* Brand & Workspace Title */}
      <Stack spacing={1.5} sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '4px',
              bgcolor: '#96BF8A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00261A',
              fontWeight: 900,
              fontSize: '1.25rem',
            }}
          >
            M
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, color: '#FFFFFF', fontSize: '1.08rem', lineHeight: 1.2 }}>
              M-Service Desk
            </Typography>
            <Typography variant="caption" sx={{ color: '#96BF8A', fontWeight: 600, fontSize: '0.75rem' }}>
              Murang'a County Admin
            </Typography>
          </Box>
        </Stack>

        <Box
          sx={{
            bgcolor: 'rgba(255, 255, 255, 0.08)',
            p: 1.2,
            borderRadius: '4px',
            border: '1px solid rgba(150, 191, 138, 0.2)',
          }}
        >
          <Typography variant="caption" sx={{ color: '#96BF8A', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem', display: 'block', mb: 0.2 }}>
            Operational Workspace
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#FFFFFF', fontSize: '0.85rem' }}>
            County Central Operations
          </Typography>
        </Box>
      </Stack>

      {/* Navigation Links */}
      <Typography variant="caption" sx={{ color: '#96BF8A', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', px: 1, mb: 1, fontSize: '0.7rem' }}>
        Navigation
      </Typography>

      <List sx={{ p: 0, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <ListItemButton
          selected={activeSection === 'overview'}
          onClick={() => {
            setActiveSection('overview')
            if (isMobile) setMobileDrawerOpen(false)
          }}
          sx={{
            borderRadius: '4px',
            py: 1.1,
            px: 1.4,
            color: activeSection === 'overview' ? '#00261A' : 'rgba(255,255,255,0.85)',
            bgcolor: activeSection === 'overview' ? '#96BF8A' : 'transparent',
            '&:hover': {
              bgcolor: activeSection === 'overview' ? '#96BF8A' : 'rgba(255,255,255,0.08)',
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 32, color: activeSection === 'overview' ? '#00261A' : '#96BF8A', fontSize: '1.15rem' }}>
            📊
          </ListItemIcon>
          <ListItemText primary="Dashboard Overview" primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 700 }} />
        </ListItemButton>

        <ListItemButton
          selected={activeSection === 'requests'}
          onClick={() => {
            setActiveSection('requests')
            setStatusFilter('ALL')
            if (isMobile) setMobileDrawerOpen(false)
          }}
          sx={{
            borderRadius: '4px',
            py: 1.1,
            px: 1.4,
            color: activeSection === 'requests' ? '#00261A' : 'rgba(255,255,255,0.85)',
            bgcolor: activeSection === 'requests' ? '#96BF8A' : 'transparent',
            '&:hover': {
              bgcolor: activeSection === 'requests' ? '#96BF8A' : 'rgba(255,255,255,0.08)',
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 32, color: activeSection === 'requests' ? '#00261A' : '#96BF8A', fontSize: '1.15rem' }}>
            📋
          </ListItemIcon>
          <ListItemText primary="All Service Requests" primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 700 }} />
          {analytics && (
            <Chip
              size="small"
              label={analytics.total}
              sx={{
                bgcolor: activeSection === 'requests' ? '#00412E' : 'rgba(255,255,255,0.15)',
                color: activeSection === 'requests' ? '#FFFFFF' : '#96BF8A',
                fontWeight: 800,
                fontSize: '0.72rem',
                height: 20,
              }}
            />
          )}
        </ListItemButton>

        <ListItemButton
          onClick={() => {
            setActiveSection('requests')
            setStatusFilter('PENDING')
            if (isMobile) setMobileDrawerOpen(false)
          }}
          sx={{
            borderRadius: '4px',
            py: 0.9,
            px: 1.4,
            pl: 3.2,
            color: 'rgba(255,255,255,0.78)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
          }}
        >
          <ListItemText primary="⏳ Pending Triage" primaryTypographyProps={{ fontSize: '0.84rem', fontWeight: 600 }} />
          {analytics && analytics.pending > 0 && (
            <Chip
              size="small"
              label={analytics.pending}
              sx={{ bgcolor: '#D97706', color: '#FFFFFF', fontWeight: 800, fontSize: '0.7rem', height: 18 }}
            />
          )}
        </ListItemButton>

        <ListItemButton
          onClick={() => {
            setActiveSection('requests')
            setStatusFilter('IN_PROGRESS')
            if (isMobile) setMobileDrawerOpen(false)
          }}
          sx={{
            borderRadius: '4px',
            py: 0.9,
            px: 1.4,
            pl: 3.2,
            color: 'rgba(255,255,255,0.78)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
          }}
        >
          <ListItemText primary="⚡ Active Fieldwork" primaryTypographyProps={{ fontSize: '0.84rem', fontWeight: 600 }} />
          {analytics && analytics.inProgress > 0 && (
            <Chip
              size="small"
              label={analytics.inProgress}
              sx={{ bgcolor: '#96BF8A', color: '#00261A', fontWeight: 800, fontSize: '0.7rem', height: 18 }}
            />
          )}
        </ListItemButton>

        <ListItemButton
          onClick={() => {
            setActiveSection('requests')
            setStatusFilter('RESOLVED')
            if (isMobile) setMobileDrawerOpen(false)
          }}
          sx={{
            borderRadius: '4px',
            py: 0.9,
            px: 1.4,
            pl: 3.2,
            color: 'rgba(255,255,255,0.78)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
          }}
        >
          <ListItemText primary="✅ Resolved Requests" primaryTypographyProps={{ fontSize: '0.84rem', fontWeight: 600 }} />
        </ListItemButton>

        <ListItemButton
          selected={activeSection === 'analytics'}
          onClick={() => {
            setActiveSection('analytics')
            if (isMobile) setMobileDrawerOpen(false)
          }}
          sx={{
            borderRadius: '4px',
            py: 1.1,
            px: 1.4,
            color: activeSection === 'analytics' ? '#00261A' : 'rgba(255,255,255,0.85)',
            bgcolor: activeSection === 'analytics' ? '#96BF8A' : 'transparent',
            '&:hover': {
              bgcolor: activeSection === 'analytics' ? '#96BF8A' : 'rgba(255,255,255,0.08)',
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 32, color: activeSection === 'analytics' ? '#00261A' : '#96BF8A', fontSize: '1.15rem' }}>
            📈
          </ListItemIcon>
          <ListItemText primary="Sector Reports" primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 700 }} />
        </ListItemButton>

        <ListItemButton
          selected={activeSection === 'citizens'}
          onClick={() => {
            setActiveSection('citizens')
            if (isMobile) setMobileDrawerOpen(false)
          }}
          sx={{
            borderRadius: '4px',
            py: 1.1,
            px: 1.4,
            color: activeSection === 'citizens' ? '#00261A' : 'rgba(255,255,255,0.85)',
            bgcolor: activeSection === 'citizens' ? '#96BF8A' : 'transparent',
            '&:hover': {
              bgcolor: activeSection === 'citizens' ? '#96BF8A' : 'rgba(255,255,255,0.08)',
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 32, color: activeSection === 'citizens' ? '#00261A' : '#96BF8A', fontSize: '1.15rem' }}>
            👥
          </ListItemIcon>
          <ListItemText primary="Registered Citizens" primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 700 }} />
          {users.length > 0 && (
            <Chip
              size="small"
              label={users.length}
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#96BF8A', fontWeight: 700, fontSize: '0.7rem', height: 18 }}
            />
          )}
        </ListItemButton>
      </List>

      {/* Admin User Footer (AeuxGlobal User Account style) */}
      <Divider sx={{ my: 1.8, borderColor: 'rgba(150, 191, 138, 0.2)' }} />

      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
        <Avatar
          sx={{
            bgcolor: '#96BF8A',
            color: '#00261A',
            fontWeight: 800,
            width: 36,
            height: 36,
            fontSize: '0.9rem',
          }}
        >
          {user.name.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ overflow: 'hidden', flexGrow: 1 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 800, color: '#FFFFFF', fontSize: '0.85rem' }}>
            {user.name}
          </Typography>
          <Typography variant="caption" noWrap sx={{ color: '#96BF8A', fontSize: '0.72rem', display: 'block' }}>
            {user.email}
          </Typography>
        </Box>
        <Chip
          size="small"
          label="ADMIN"
          sx={{
            bgcolor: '#96BF8A',
            color: '#00261A',
            fontWeight: 900,
            fontSize: '0.65rem',
            height: 18,
          }}
        />
      </Stack>
    </Box>
  )

  return (
    <Box sx={{ width: '100%', display: 'flex', gap: { xs: 0, md: 2.5 }, minHeight: 'calc(100vh - 120px)' }}>
      {/* Desktop Left Sidebar */}
      {!isMobile && (
        <Box sx={{ flexShrink: 0 }}>
          {sidebarContent}
        </Box>
      )}

      {/* Mobile Sidebar Drawer */}
      {isMobile && (
        <Drawer
          anchor="left"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          PaperProps={{ sx: { bgcolor: '#00412E', p: 0, width: 280 } }}
        >
          {sidebarContent}
        </Drawer>
      )}

      {/* Main Administrative Content Area */}
      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Top Header Card */}
        <Card sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ sm: 'center' }}
            spacing={2}
          >
            <Stack direction="row" alignItems="center" spacing={1.5}>
              {isMobile && (
                <IconButton
                  onClick={() => setMobileDrawerOpen(true)}
                  aria-label="Open navigation sidebar"
                  sx={{
                    bgcolor: '#00412E',
                    color: '#FFFFFF',
                    borderRadius: '4px',
                    '&:hover': { bgcolor: '#002C1F' },
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </IconButton>
              )}
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#00412E', fontSize: { xs: '1.35rem', sm: '1.65rem' } }}>
                  {activeSection === 'overview' && 'Executive Operations Dashboard'}
                  {activeSection === 'requests' && 'Citizen Service Requests Triage'}
                  {activeSection === 'analytics' && 'County Sector Analytics & Performance'}
                  {activeSection === 'citizens' && 'Registered Citizens & Users Directory'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.88rem' }}>
                  Murang'a County Public Service Request & Administration Portal
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <Tooltip title="Refresh real-time data from server">
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    void fetchAnalytics()
                    void fetchRequests()
                    void fetchUsers()
                  }}
                  disabled={analyticsLoading || requestsLoading}
                  sx={{
                    fontWeight: 700,
                    borderColor: 'rgba(0, 65, 46, 0.25)',
                    color: '#00412E',
                    px: 2,
                    py: 0.8,
                  }}
                >
                  {analyticsLoading || requestsLoading ? <CircularProgress size={16} sx={{ mr: 1 }} /> : '🔄 '}
                  Sync Data
                </Button>
              </Tooltip>
            </Stack>
          </Stack>
        </Card>

        {dashboardError && (
          <Alert
            severity="error"
            onClose={() => setDashboardError(null)}
            sx={{ fontSize: '0.95rem', py: 1 }}
          >
            {dashboardError}
          </Alert>
        )}

        {successMessage && (
          <Alert
            severity="success"
            onClose={() => setSuccessMessage(null)}
            sx={{ fontSize: '0.95rem', py: 1 }}
          >
            {successMessage}
          </Alert>
        )}

        {/* ============================================================== */}
        {/* SECTION 1: OVERVIEW & ANALYTICS TOP KPI CARDS (AeuxGlobal inspired) */}
        {/* ============================================================== */}
        {(activeSection === 'overview' || activeSection === 'analytics') && (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  lg: 'repeat(4, 1fr)',
                },
                gap: 2,
              }}
            >
              {/* Card 1: Air Pollution style dark hero card */}
              <Card
                sx={{
                  bgcolor: '#00412E', // Brand Primary Dark Green
                  color: '#FFFFFF',
                  p: 2.2,
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 4px 16px rgba(0, 65, 46, 0.16)',
                }}
              >
                <Stack spacing={0.8}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ color: '#96BF8A', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.72rem' }}>
                      Total Intake
                    </Typography>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#96BF8A' }} />
                  </Stack>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: '#FFFFFF', fontSize: { xs: '2.2rem', md: '2.7rem' }, lineHeight: 1 }}>
                    {analyticsLoading ? <CircularProgress size={26} sx={{ color: '#FFFFFF' }} /> : analytics?.total ?? 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.78rem' }}>
                    Public requests across all 8 sub-counties
                  </Typography>
                  <Box sx={{ pt: 0.8 }}>
                    <LinearProgress
                      variant="determinate"
                      value={100}
                      sx={{
                        height: 5,
                        borderRadius: 1,
                        bgcolor: 'rgba(255, 255, 255, 0.15)',
                        '& .MuiLinearProgress-bar': { bgcolor: '#96BF8A' },
                      }}
                    />
                  </Box>
                </Stack>
              </Card>

              {/* Card 2: Environmental Quality style - Pending Triage */}
              <Card
                onClick={() => {
                  setActiveSection('requests')
                  setStatusFilter('PENDING')
                }}
                sx={{
                  p: 2.2,
                  cursor: 'pointer',
                  border: '1px solid rgba(217, 119, 6, 0.25)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 16px rgba(217, 119, 6, 0.12)',
                  },
                }}
              >
                <Stack spacing={0.8}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.72rem' }}>
                      Pending Triage
                    </Typography>
                    <Chip size="small" label="Awaiting Action" sx={{ bgcolor: '#FEF3C7', color: '#B45309', fontWeight: 800, fontSize: '0.68rem', height: 18 }} />
                  </Stack>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: '#D97706', fontSize: { xs: '2.2rem', md: '2.7rem' }, lineHeight: 1 }}>
                    {analyticsLoading ? <CircularProgress size={26} sx={{ color: '#D97706' }} /> : analytics?.pending ?? 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>
                    New incident submissions awaiting department dispatch
                  </Typography>
                  <Box sx={{ pt: 0.8 }}>
                    <LinearProgress
                      variant="determinate"
                      value={analytics?.total ? ((analytics.pending / analytics.total) * 100) : 0}
                      sx={{
                        height: 5,
                        borderRadius: 1,
                        bgcolor: '#FEF3C7',
                        '& .MuiLinearProgress-bar': { bgcolor: '#D97706' },
                      }}
                    />
                  </Box>
                </Stack>
              </Card>

              {/* Card 3: Investments in Clean Tech style - Active Fieldwork */}
              <Card
                onClick={() => {
                  setActiveSection('requests')
                  setStatusFilter('IN_PROGRESS')
                }}
                sx={{
                  p: 2.2,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: (t) => (t.palette.mode === 'dark' ? 'rgba(150, 191, 138, 0.25)' : 'rgba(0, 65, 46, 0.2)'),
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 16px rgba(0, 65, 46, 0.08)',
                  },
                }}
              >
                <Stack spacing={0.8}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ color: (t) => (t.palette.mode === 'dark' ? '#96BF8A' : '#00412E'), fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.72rem' }}>
                      Active Fieldwork
                    </Typography>
                    <Chip size="small" label="In Progress" sx={{ bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(150, 191, 138, 0.2)' : '#E6F0EB'), color: (t) => (t.palette.mode === 'dark' ? '#96BF8A' : '#00412E'), fontWeight: 800, fontSize: '0.68rem', height: 18 }} />
                  </Stack>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: (t) => (t.palette.mode === 'dark' ? '#96BF8A' : '#00412E'), fontSize: { xs: '2.2rem', md: '2.7rem' }, lineHeight: 1 }}>
                    {analyticsLoading ? <CircularProgress size={26} sx={{ color: 'primary.main' }} /> : analytics?.inProgress ?? 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>
                    County engineering and maintenance crews on-site
                  </Typography>
                  <Box sx={{ pt: 0.8 }}>
                    <LinearProgress
                      variant="determinate"
                      value={analytics?.total ? ((analytics.inProgress / analytics.total) * 100) : 0}
                      sx={{
                        height: 5,
                        borderRadius: 1,
                        bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(150, 191, 138, 0.15)' : '#E6F0EB'),
                        '& .MuiLinearProgress-bar': { bgcolor: (t) => (t.palette.mode === 'dark' ? '#96BF8A' : '#00412E') },
                      }}
                    />
                  </Box>
                </Stack>
              </Card>

              {/* Card 4: 99,681m tons style - Resolution Performance */}
              <Card
                onClick={() => {
                  setActiveSection('requests')
                  setStatusFilter('RESOLVED')
                }}
                sx={{
                  bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(21, 128, 61, 0.15)' : '#F3F6F2'),
                  p: 2.2,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: (t) => (t.palette.mode === 'dark' ? 'rgba(74, 222, 128, 0.3)' : '#96BF8A'),
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 16px rgba(150, 191, 138, 0.2)',
                  },
                }}
              >
                <Stack spacing={0.8}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ color: (t) => (t.palette.mode === 'dark' ? '#4ADE80' : '#00412E'), fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.72rem' }}>
                      Resolution Rate
                    </Typography>
                    <Chip size="small" label="✓ Resolved" sx={{ bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(74, 222, 128, 0.2)' : '#DCFCE7'), color: (t) => (t.palette.mode === 'dark' ? '#4ADE80' : '#15803D'), fontWeight: 800, fontSize: '0.68rem', height: 18 }} />
                  </Stack>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: (t) => (t.palette.mode === 'dark' ? '#4ADE80' : '#15803D'), fontSize: { xs: '2.2rem', md: '2.7rem' }, lineHeight: 1 }}>
                    {analyticsLoading ? <CircularProgress size={26} sx={{ color: '#15803D' }} /> : `${resolutionRate}%`}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>
                    {analytics?.resolved ?? 0} resolved of {analytics?.total ?? 0} total requests
                  </Typography>
                  <Box sx={{ pt: 0.8 }}>
                    <LinearProgress
                      variant="determinate"
                      value={resolutionRate}
                      sx={{
                        height: 5,
                        borderRadius: 1,
                        bgcolor: 'rgba(21, 128, 61, 0.12)',
                        '& .MuiLinearProgress-bar': { bgcolor: (t) => (t.palette.mode === 'dark' ? '#4ADE80' : '#15803D') },
                      }}
                    />
                  </Box>
                </Stack>
              </Card>
            </Box>

            {/* Middle Section: Sector Analytics & Pipeline Breakdown */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' },
                gap: 2,
              }}
            >
              {/* Sector Breakdown Card */}
              <Card sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'text.primary', fontSize: '1.15rem' }}>
                      Public Requests by County Sector
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      Distribution across Murang'a County departments
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={`${analytics?.byCategory?.length || 0} Sectors Active`}
                    sx={{
                      bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(150, 191, 138, 0.15)' : '#E8EAE5'),
                      color: (t) => (t.palette.mode === 'dark' ? '#96BF8A' : '#00412E'),
                      fontWeight: 800,
                      fontSize: '0.72rem',
                    }}
                  />
                </Stack>

                {analytics?.byCategory && analytics.byCategory.length > 0 ? (
                  <Stack spacing={1.5}>
                    {analytics.byCategory.map((cat) => {
                      const percentage = analytics.total > 0 ? Math.round((cat.count / analytics.total) * 100) : 0
                      const icon = categoryIconMap[cat.category] || '📌'

                      return (
                        <Box
                          key={cat.category}
                          sx={{
                            p: 1.2,
                            bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#F8FAF9'),
                            borderRadius: '4px',
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.6 }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography sx={{ fontSize: '1.15rem' }}>{icon}</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.88rem' }}>
                                {cat.category}
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2" sx={{ fontWeight: 900, color: (t) => (t.palette.mode === 'dark' ? '#96BF8A' : '#00412E'), fontSize: '0.9rem' }}>
                                {cat.count} {cat.count === 1 ? 'request' : 'requests'}
                              </Typography>
                              <Chip
                                size="small"
                                label={`${percentage}%`}
                                sx={{
                                  height: 18,
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(150, 191, 138, 0.15)' : '#E6F0EB'),
                                  color: (t) => (t.palette.mode === 'dark' ? '#96BF8A' : '#00412E'),
                                }}
                              />
                            </Stack>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={percentage}
                            sx={{
                              height: 5,
                              borderRadius: 1,
                              bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(150, 191, 138, 0.12)' : 'rgba(0, 65, 46, 0.08)'),
                              '& .MuiLinearProgress-bar': { bgcolor: (t) => (t.palette.mode === 'dark' ? '#96BF8A' : '#00412E') },
                            }}
                          />
                        </Box>
                      )
                    })}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                    No categorized requests recorded yet.
                  </Typography>
                )}
              </Card>

              {/* Status Pipeline & Triage Efficiency Widget */}
              <Card
                sx={{
                  p: 2.5,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: 'text.primary', fontSize: '1.15rem', mb: 0.3 }}>
                    Triage & Resolution Pipeline
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem', display: 'block', mb: 2 }}>
                    Real-time ratio between open backlog and completed interventions
                  </Typography>

                  <Stack spacing={2}>
                    <Box>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.6 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                          Workflow Pipeline Breakdown
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: (t) => (t.palette.mode === 'dark' ? '#96BF8A' : '#00412E') }}>
                          {analytics?.total || 0} Total
                        </Typography>
                      </Stack>
                      <Box sx={{ display: 'flex', height: 10, borderRadius: '4px', overflow: 'hidden', bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#E8EAE5') }}>
                        <Box
                          sx={{
                            width: `${analytics?.total ? ((analytics.pending / analytics.total) * 100) : 0}%`,
                            bgcolor: '#D97706',
                            transition: 'width 0.4s ease',
                          }}
                        />
                        <Box
                          sx={{
                            width: `${analytics?.total ? ((analytics.inProgress / analytics.total) * 100) : 0}%`,
                            bgcolor: '#96BF8A',
                            transition: 'width 0.4s ease',
                          }}
                        />
                        <Box
                          sx={{
                            width: `${analytics?.total ? ((analytics.resolved / analytics.total) * 100) : 0}%`,
                            bgcolor: (t) => (t.palette.mode === 'dark' ? '#4ADE80' : '#00412E'),
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </Box>
                    </Box>

                    {/* Legend */}
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#D97706' }} />
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.84rem' }}>
                            Pending Department Triage
                          </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#D97706', fontSize: '0.88rem' }}>
                          {analytics?.pending ?? 0}
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#96BF8A' }} />
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.84rem' }}>
                            Active Fieldwork & Repairs
                          </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: (t) => (t.palette.mode === 'dark' ? '#96BF8A' : '#00412E'), fontSize: '0.88rem' }}>
                          {analytics?.inProgress ?? 0}
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: (t) => (t.palette.mode === 'dark' ? '#4ADE80' : '#00412E') }} />
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.84rem' }}>
                            Officially Resolved
                          </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: (t) => (t.palette.mode === 'dark' ? '#4ADE80' : '#15803D'), fontSize: '0.88rem' }}>
                          {analytics?.resolved ?? 0}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Stack>
                </Box>

                {/* Efficiency callout banner */}
                <Box
                  sx={{
                    mt: 2.5,
                    p: 1.5,
                    borderRadius: '4px',
                    bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(150, 191, 138, 0.1)' : '#E6F0EB'),
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: (t) => (t.palette.mode === 'dark' ? '#96BF8A' : '#00412E'), fontSize: '0.88rem', mb: 0.2 }}>
                    ⚡ Service Delivery SLA Status
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.78rem', lineHeight: 1.35, display: 'block' }}>
                    {resolutionRate >= 50
                      ? 'County response rate is performing well. Over half of logged requests have reached verified resolution.'
                      : 'Pending workload requires active field crew assignment across road and water sectors.'}
                  </Typography>
                </Box>
              </Card>
            </Box>
          </>
        )}

        {/* ============================================================== */}
        {/* SECTION 2: REQUESTS TABLE & MOBILE CARDS                        */}
        {/* ============================================================== */}
        {(activeSection === 'overview' || activeSection === 'requests') && (
          <Box sx={{ width: '100%' }}>
            {/* Filter and Search Bar */}
            <Card sx={{ p: 2, mb: 2 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }} justifyContent="space-between">
                {/* Status Chips */}
                <Stack direction="row" spacing={0.8} flexWrap="wrap" gap={0.6}>
                  {['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED'].map((filter) => (
                    <Chip
                      key={filter}
                      label={filter === 'ALL' ? 'All Requests' : filter.replace('_', ' ')}
                      clickable
                      color={statusFilter === filter ? 'primary' : 'default'}
                      variant={statusFilter === filter ? 'filled' : 'outlined'}
                      onClick={() => setStatusFilter(filter)}
                      sx={{ fontWeight: 700, fontSize: '0.82rem', height: 28 }}
                    />
                  ))}
                </Stack>

                {/* Search & Category Filter */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', md: 'auto' } }}>
                  <TextField
                    select
                    size="small"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    sx={{ minWidth: 170 }}
                  >
                    <MenuItem value="ALL">All Categories</MenuItem>
                    {availableCategories.map((c) => (
                      <MenuItem key={c} value={c}>{c}</MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    size="small"
                    placeholder="Search reference # or location..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void fetchRequests()
                    }}
                    sx={{ minWidth: 200, flexGrow: 1 }}
                  />
                  <Button variant="contained" size="small" onClick={fetchRequests} sx={{ px: 2, fontWeight: 700 }}>
                    Filter
                  </Button>
                </Stack>
              </Stack>
            </Card>

            {/* Requests Content */}
            {requestsLoading ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <CircularProgress size={38} color="primary" />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                  Loading service requests...
                </Typography>
              </Box>
            ) : requests.length === 0 ? (
              <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>
                  No Service Requests Found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {statusFilter !== 'ALL' || search || categoryFilter !== 'ALL'
                    ? 'No requests match your current filters or search query.'
                    : 'No public service requests have been submitted yet.'}
                </Typography>
              </Paper>
            ) : isMobile ? (
              /* Mobile Card View (Zero horizontal scroll!) */
              <Stack spacing={1.5}>
                {requests.map((row) => (
                  <Card key={row.id} sx={{ p: 1.8 }}>
                    <Stack spacing={1.2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box
                          sx={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            color: (t) => (t.palette.mode === 'dark' ? '#96BF8A' : '#00412E'),
                            bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(150, 191, 138, 0.15)' : '#E8EAE5'),
                            px: 1,
                            py: 0.3,
                            borderRadius: '4px',
                          }}
                        >
                          {row.referenceNumber}
                        </Box>
                        <Chip
                          size="small"
                          color={statusColorMap[row.status]}
                          label={statusLabelMap[row.status]}
                          sx={{ fontWeight: 800, fontSize: '0.75rem', height: 22 }}
                        />
                      </Stack>

                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.92rem' }}>
                          {row.category}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          📍 {row.location} • Submitted by {row.citizen?.name || 'Citizen'}
                        </Typography>
                      </Box>

                      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.84rem', lineHeight: 1.4 }}>
                        {row.description.length > 100 ? `${row.description.substring(0, 100)}...` : row.description}
                      </Typography>

                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleOpenStatusDialog(row)}
                        sx={{ fontWeight: 700, alignSelf: 'flex-start', mt: 0.5, py: 0.6 }}
                      >
                        Review & Update Status
                      </Button>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            ) : (
              /* Desktop Data Table */
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  overflow: 'hidden',
                }}
              >
                <Table sx={{ minWidth: 800 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem', py: 1.5 }}>Reference #</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem', py: 1.5 }}>Citizen</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem', py: 1.5 }}>Sector & Location</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem', py: 1.5 }}>Current Status</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem', py: 1.5 }}>Submission Date</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem', py: 1.5 }} align="right">
                        Triage Action
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requests.map((row) => (
                      <TableRow key={row.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 800, color: (t) => (t.palette.mode === 'dark' ? '#96BF8A' : '#00412E'), fontSize: '0.9rem' }}>
                          {row.referenceNumber}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.88rem' }}>
                            {row.citizen?.name || 'Citizen'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            {row.citizen?.email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.88rem' }}>
                            {row.category}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            📍 {row.location}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={statusColorMap[row.status]}
                            label={statusLabelMap[row.status]}
                            sx={{ fontWeight: 800, fontSize: '0.78rem', height: 22 }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
                          {new Date(row.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleOpenStatusDialog(row)}
                            sx={{ fontSize: '0.82rem', fontWeight: 700, py: 0.6, px: 1.8 }}
                          >
                            Review & Update
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* ============================================================== */}
        {/* SECTION 3: CITIZENS DIRECTORY                                   */}
        {/* ============================================================== */}
        {activeSection === 'citizens' && (
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
            }}
          >
            {usersLoading ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <CircularProgress size={38} color="primary" />
              </Box>
            ) : users.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  No registered users found.
                </Typography>
              </Box>
            ) : (
              <Table sx={{ minWidth: 700 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem', py: 1.5 }}>Full Name</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem', py: 1.5 }}>Email Address</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem', py: 1.5 }}>Assigned Role</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem', py: 1.5 }}>Account Status</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem', py: 1.5 }}>Registration Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} hover>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.88rem' }}>{u.name}</TableCell>
                      <TableCell sx={{ fontSize: '0.84rem' }}>{u.email}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={u.role === 'ADMIN' ? 'secondary' : 'default'}
                          label={u.role}
                          sx={{ fontWeight: 800, fontSize: '0.75rem', height: 22 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={u.isActive ? 'success' : 'error'}
                          label={u.isActive ? 'Active' : 'Inactive'}
                          variant="outlined"
                          sx={{ fontWeight: 700, fontSize: '0.75rem', height: 22 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TableContainer>
        )}
      </Box>

      {/* Status Update Dialog */}
      <Dialog
        open={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1, pt: 2.2 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '1.25rem' }}>
            Update Request Status & Resolution
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 0.3, fontSize: '0.85rem' }}>
            Reference: <strong>{selectedRequest?.referenceNumber}</strong> • {selectedRequest?.category}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ py: 2.5 }}>
          <Stack spacing={2}>
            {updateError && (
              <Alert severity="error" sx={{ py: 0.8 }}>
                {updateError}
              </Alert>
            )}

            <Box sx={{ p: 1.8, bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#F8FAF9'), borderRadius: '4px', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" sx={{ color: (t) => (t.palette.mode === 'dark' ? '#96BF8A' : '#00412E'), fontWeight: 800, textTransform: 'uppercase', display: 'block', mb: 0.3 }}>
                Citizen Description & Location
              </Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.6, fontSize: '0.92rem', mb: 0.8 }}>
                {selectedRequest?.description}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                📍 Location: <strong>{selectedRequest?.location}</strong>
              </Typography>
            </Box>

            {selectedRequest?.imageUrl && (
              <Box sx={{ mt: 0.5 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.3 }}>
                  Incident Photo Attachment:
                </Typography>
                <Box
                  component="img"
                  src={selectedRequest.imageUrl}
                  alt="Incident photo"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                  sx={{ maxHeight: 180, borderRadius: '4px', border: '1px solid #e2e8f0', objectFit: 'cover' }}
                />
              </Box>
            )}

            <TextField
              select
              label="County Action Status"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as RequestStatus)}
              fullWidth
              size="small"
            >
              <MenuItem value="PENDING" sx={{ py: 1 }}>PENDING — Waiting for department triage</MenuItem>
              <MenuItem value="IN_PROGRESS" sx={{ py: 1 }}>IN_PROGRESS — Field crew deployed / work ongoing</MenuItem>
              <MenuItem value="RESOLVED" sx={{ py: 1 }}>RESOLVED — Intervention completed</MenuItem>
            </TextField>

            <TextField
              label="Official County Resolution Note / Action Summary"
              multiline
              rows={3}
              fullWidth
              size="small"
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="e.g. Murang'a County road engineering unit inspected the site, excavated damaged culverts, and resurfaced the 1.2km stretch with tarmac."
              helperText="This official note is immediately visible to the citizen on their tracking stepper."
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setSelectedRequest(null)} disabled={updating} sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveStatus}
            disabled={updating}
            sx={{ fontWeight: 800, px: 3, py: 0.9 }}
          >
            {updating ? <CircularProgress size={20} color="inherit" /> : 'Save Status Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
