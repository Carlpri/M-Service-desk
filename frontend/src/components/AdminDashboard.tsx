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
          borderRadius: 4,
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
          border: '2px solid #fed7aa',
          borderRadius: 4,
          my: 4,
          bgcolor: '#fffbeb',
          width: '100%',
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1.5, color: '#9a3412', fontSize: { xs: '1.8rem', md: '2.2rem' } }}>
          Access Restricted: Citizen Account
        </Typography>
        <Typography variant="body1" sx={{ maxWidth: 680, mx: 'auto', color: '#b45309', fontSize: '1.15rem', lineHeight: 1.6 }}>
          Your current account has the <strong>CITIZEN</strong> role. Administrative actions (status updates, triage, county-wide listings, and analytics) are restricted to authorized administrators via backend role checks.
        </Typography>
      </Paper>
    )
  }

  // Sidebar content component (AeuxGlobal inspired dark-green navigation)
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
        borderRadius: { xs: 0, md: '20px' },
        boxShadow: '0 8px 32px rgba(0, 65, 46, 0.25)',
      }}
    >
      {/* Brand & Workspace Title */}
      <Stack spacing={1.5} sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              bgcolor: '#96BF8A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00261A',
              fontWeight: 900,
              fontSize: '1.3rem',
            }}
          >
            M
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, color: '#FFFFFF', fontSize: '1.1rem', lineHeight: 1.2 }}>
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
            p: 1.5,
            borderRadius: '10px',
            border: '1px solid rgba(150, 191, 138, 0.2)',
          }}
        >
          <Typography variant="caption" sx={{ color: '#96BF8A', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem', display: 'block', mb: 0.3 }}>
            Operational Workspace
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#FFFFFF', fontSize: '0.88rem' }}>
            County Central Operations
          </Typography>
        </Box>
      </Stack>

      {/* Navigation Links */}
      <Typography variant="caption" sx={{ color: '#96BF8A', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', px: 1, mb: 1, fontSize: '0.7rem' }}>
        Navigation
      </Typography>

      <List sx={{ p: 0, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0.6 }}>
        <ListItemButton
          selected={activeSection === 'overview'}
          onClick={() => {
            setActiveSection('overview')
            if (isMobile) setMobileDrawerOpen(false)
          }}
          sx={{
            borderRadius: '10px',
            py: 1.2,
            px: 1.5,
            color: activeSection === 'overview' ? '#00261A' : 'rgba(255,255,255,0.85)',
            bgcolor: activeSection === 'overview' ? '#96BF8A' : 'transparent',
            '&:hover': {
              bgcolor: activeSection === 'overview' ? '#96BF8A' : 'rgba(255,255,255,0.08)',
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 34, color: activeSection === 'overview' ? '#00261A' : '#96BF8A', fontSize: '1.2rem' }}>
            📊
          </ListItemIcon>
          <ListItemText primary="Dashboard Overview" primaryTypographyProps={{ fontSize: '0.92rem', fontWeight: 700 }} />
        </ListItemButton>

        <ListItemButton
          selected={activeSection === 'requests'}
          onClick={() => {
            setActiveSection('requests')
            setStatusFilter('ALL')
            if (isMobile) setMobileDrawerOpen(false)
          }}
          sx={{
            borderRadius: '10px',
            py: 1.2,
            px: 1.5,
            color: activeSection === 'requests' ? '#00261A' : 'rgba(255,255,255,0.85)',
            bgcolor: activeSection === 'requests' ? '#96BF8A' : 'transparent',
            '&:hover': {
              bgcolor: activeSection === 'requests' ? '#96BF8A' : 'rgba(255,255,255,0.08)',
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 34, color: activeSection === 'requests' ? '#00261A' : '#96BF8A', fontSize: '1.2rem' }}>
            📋
          </ListItemIcon>
          <ListItemText primary="All Service Requests" primaryTypographyProps={{ fontSize: '0.92rem', fontWeight: 700 }} />
          {analytics && (
            <Chip
              size="small"
              label={analytics.total}
              sx={{
                bgcolor: activeSection === 'requests' ? '#00412E' : 'rgba(255,255,255,0.15)',
                color: activeSection === 'requests' ? '#FFFFFF' : '#96BF8A',
                fontWeight: 800,
                fontSize: '0.75rem',
                height: 22,
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
            borderRadius: '10px',
            py: 1,
            px: 1.5,
            pl: 3.5,
            color: 'rgba(255,255,255,0.78)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
          }}
        >
          <ListItemText primary="⏳ Pending Triage" primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600 }} />
          {analytics && analytics.pending > 0 && (
            <Chip
              size="small"
              label={analytics.pending}
              sx={{ bgcolor: '#D97706', color: '#FFFFFF', fontWeight: 800, fontSize: '0.72rem', height: 20 }}
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
            borderRadius: '10px',
            py: 1,
            px: 1.5,
            pl: 3.5,
            color: 'rgba(255,255,255,0.78)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
          }}
        >
          <ListItemText primary="⚡ Active Fieldwork" primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600 }} />
          {analytics && analytics.inProgress > 0 && (
            <Chip
              size="small"
              label={analytics.inProgress}
              sx={{ bgcolor: '#96BF8A', color: '#00261A', fontWeight: 800, fontSize: '0.72rem', height: 20 }}
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
            borderRadius: '10px',
            py: 1,
            px: 1.5,
            pl: 3.5,
            color: 'rgba(255,255,255,0.78)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
          }}
        >
          <ListItemText primary="✅ Resolved Requests" primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600 }} />
        </ListItemButton>

        <ListItemButton
          selected={activeSection === 'analytics'}
          onClick={() => {
            setActiveSection('analytics')
            if (isMobile) setMobileDrawerOpen(false)
          }}
          sx={{
            borderRadius: '10px',
            py: 1.2,
            px: 1.5,
            color: activeSection === 'analytics' ? '#00261A' : 'rgba(255,255,255,0.85)',
            bgcolor: activeSection === 'analytics' ? '#96BF8A' : 'transparent',
            '&:hover': {
              bgcolor: activeSection === 'analytics' ? '#96BF8A' : 'rgba(255,255,255,0.08)',
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 34, color: activeSection === 'analytics' ? '#00261A' : '#96BF8A', fontSize: '1.2rem' }}>
            📈
          </ListItemIcon>
          <ListItemText primary="Sector Reports" primaryTypographyProps={{ fontSize: '0.92rem', fontWeight: 700 }} />
        </ListItemButton>

        <ListItemButton
          selected={activeSection === 'citizens'}
          onClick={() => {
            setActiveSection('citizens')
            if (isMobile) setMobileDrawerOpen(false)
          }}
          sx={{
            borderRadius: '10px',
            py: 1.2,
            px: 1.5,
            color: activeSection === 'citizens' ? '#00261A' : 'rgba(255,255,255,0.85)',
            bgcolor: activeSection === 'citizens' ? '#96BF8A' : 'transparent',
            '&:hover': {
              bgcolor: activeSection === 'citizens' ? '#96BF8A' : 'rgba(255,255,255,0.08)',
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 34, color: activeSection === 'citizens' ? '#00261A' : '#96BF8A', fontSize: '1.2rem' }}>
            👥
          </ListItemIcon>
          <ListItemText primary="Registered Citizens" primaryTypographyProps={{ fontSize: '0.92rem', fontWeight: 700 }} />
          {users.length > 0 && (
            <Chip
              size="small"
              label={users.length}
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#96BF8A', fontWeight: 700, fontSize: '0.72rem', height: 20 }}
            />
          )}
        </ListItemButton>
      </List>

      {/* Admin User Footer (AeuxGlobal User Account style) */}
      <Divider sx={{ my: 2, borderColor: 'rgba(150, 191, 138, 0.2)' }} />

      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
        <Avatar
          sx={{
            bgcolor: '#96BF8A',
            color: '#00261A',
            fontWeight: 800,
            width: 38,
            height: 38,
            fontSize: '0.95rem',
          }}
        >
          {user.name.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ overflow: 'hidden', flexGrow: 1 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 800, color: '#FFFFFF', fontSize: '0.88rem' }}>
            {user.name}
          </Typography>
          <Typography variant="caption" noWrap sx={{ color: '#96BF8A', fontSize: '0.75rem', display: 'block' }}>
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
    <Box sx={{ width: '100%', display: 'flex', gap: { xs: 0, md: 3 }, minHeight: 'calc(100vh - 120px)' }}>
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
      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Top Header Card */}
        <Card
          sx={{
            p: { xs: 2, sm: 2.5 },
            bgcolor: '#FFFFFF',
            borderRadius: 3.5,
            border: '1px solid rgba(0, 65, 46, 0.08)',
            boxShadow: '0 2px 10px rgba(0, 65, 46, 0.03)',
          }}
        >
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
                    borderRadius: '8px',
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
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#00412E', fontSize: { xs: '1.4rem', sm: '1.7rem' } }}>
                  {activeSection === 'overview' && 'Executive Operations Dashboard'}
                  {activeSection === 'requests' && 'Citizen Service Requests Triage'}
                  {activeSection === 'analytics' && 'County Sector Analytics & Performance'}
                  {activeSection === 'citizens' && 'Registered Citizens & Users Directory'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
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
                    borderRadius: 2,
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
            sx={{ borderRadius: 3, fontSize: '1rem', py: 1.2 }}
          >
            {dashboardError}
          </Alert>
        )}

        {successMessage && (
          <Alert
            severity="success"
            onClose={() => setSuccessMessage(null)}
            sx={{ borderRadius: 3, fontSize: '1rem', py: 1.2 }}
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
                gap: 2.5,
              }}
            >
              {/* Card 1: Air Pollution style dark hero card */}
              <Card
                sx={{
                  bgcolor: '#00412E', // Brand Primary Dark Green
                  color: '#FFFFFF',
                  p: 2.5,
                  borderRadius: 3.5,
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(0, 65, 46, 0.16)',
                }}
              >
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ color: '#96BF8A', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.75rem' }}>
                      Total Intake
                    </Typography>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#96BF8A' }} />
                  </Stack>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: '#FFFFFF', fontSize: { xs: '2.4rem', md: '2.9rem' }, lineHeight: 1 }}>
                    {analyticsLoading ? <CircularProgress size={28} sx={{ color: '#FFFFFF' }} /> : analytics?.total ?? 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.8rem' }}>
                    Public requests across all 8 sub-counties
                  </Typography>
                  {/* Mini visual indicator */}
                  <Box sx={{ pt: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={100}
                      sx={{
                        height: 6,
                        borderRadius: 3,
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
                  bgcolor: '#FFFFFF',
                  p: 2.5,
                  borderRadius: 3.5,
                  cursor: 'pointer',
                  border: '1px solid rgba(217, 119, 6, 0.2)',
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 20px rgba(217, 119, 6, 0.12)',
                  },
                }}
              >
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.75rem' }}>
                      Pending Triage
                    </Typography>
                    <Chip size="small" label="Awaiting Action" sx={{ bgcolor: '#FEF3C7', color: '#B45309', fontWeight: 800, fontSize: '0.7rem', height: 20 }} />
                  </Stack>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: '#D97706', fontSize: { xs: '2.4rem', md: '2.9rem' }, lineHeight: 1 }}>
                    {analyticsLoading ? <CircularProgress size={28} sx={{ color: '#D97706' }} /> : analytics?.pending ?? 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                    New incident submissions awaiting department dispatch
                  </Typography>
                  <Box sx={{ pt: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={analytics?.total ? ((analytics.pending / analytics.total) * 100) : 0}
                      sx={{
                        height: 6,
                        borderRadius: 3,
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
                  bgcolor: '#FFFFFF',
                  p: 2.5,
                  borderRadius: 3.5,
                  cursor: 'pointer',
                  border: '1px solid rgba(0, 65, 46, 0.18)',
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 20px rgba(0, 65, 46, 0.08)',
                  },
                }}
              >
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ color: '#00412E', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.75rem' }}>
                      Active Fieldwork
                    </Typography>
                    <Chip size="small" label="In Progress" sx={{ bgcolor: '#E6F0EB', color: '#00412E', fontWeight: 800, fontSize: '0.7rem', height: 20 }} />
                  </Stack>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: '#00412E', fontSize: { xs: '2.4rem', md: '2.9rem' }, lineHeight: 1 }}>
                    {analyticsLoading ? <CircularProgress size={28} sx={{ color: '#00412E' }} /> : analytics?.inProgress ?? 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                    County engineering and maintenance crews on-site
                  </Typography>
                  <Box sx={{ pt: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={analytics?.total ? ((analytics.inProgress / analytics.total) * 100) : 0}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: '#E6F0EB',
                        '& .MuiLinearProgress-bar': { bgcolor: '#00412E' },
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
                  bgcolor: '#F3F6F2', // Subtle sage tint
                  p: 2.5,
                  borderRadius: 3.5,
                  cursor: 'pointer',
                  border: '1px solid #96BF8A',
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 20px rgba(150, 191, 138, 0.2)',
                  },
                }}
              >
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ color: '#00412E', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.75rem' }}>
                      Resolution Rate
                    </Typography>
                    <Chip size="small" label="✓ Resolved" sx={{ bgcolor: '#DCFCE7', color: '#15803D', fontWeight: 800, fontSize: '0.7rem', height: 20 }} />
                  </Stack>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: '#15803D', fontSize: { xs: '2.4rem', md: '2.9rem' }, lineHeight: 1 }}>
                    {analyticsLoading ? <CircularProgress size={28} sx={{ color: '#15803D' }} /> : `${resolutionRate}%`}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                    {analytics?.resolved ?? 0} resolved of {analytics?.total ?? 0} total requests
                  </Typography>
                  <Box sx={{ pt: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={resolutionRate}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: 'rgba(21, 128, 61, 0.12)',
                        '& .MuiLinearProgress-bar': { bgcolor: '#15803D' },
                      }}
                    />
                  </Box>
                </Stack>
              </Card>
            </Box>

            {/* Middle Section: Sector Analytics & Pipeline Breakdown (AeuxGlobal inspired) */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' },
                gap: 2.5,
              }}
            >
              {/* Sector Breakdown Card (Like Plastic Recycling by Region in reference) */}
              <Card
                sx={{
                  p: 3,
                  bgcolor: '#FFFFFF',
                  borderRadius: 3.5,
                  boxShadow: '0 4px 18px rgba(0, 65, 46, 0.04)',
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: '#00412E', fontSize: '1.2rem' }}>
                      Public Requests by County Sector
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
                      Distribution across Murang'a County departments
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={`${analytics?.byCategory?.length || 0} Sectors Active`}
                    sx={{ bgcolor: '#E8EAE5', color: '#00412E', fontWeight: 800, fontSize: '0.75rem' }}
                  />
                </Stack>

                {analytics?.byCategory && analytics.byCategory.length > 0 ? (
                  <Stack spacing={2}>
                    {analytics.byCategory.map((cat) => {
                      const percentage = analytics.total > 0 ? Math.round((cat.count / analytics.total) * 100) : 0
                      const icon = categoryIconMap[cat.category] || '📌'

                      return (
                        <Box key={cat.category} sx={{ p: 1.5, bgcolor: '#F8FAF9', borderRadius: 2.5, border: '1px solid rgba(0, 65, 46, 0.05)' }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8 }}>
                            <Stack direction="row" alignItems="center" spacing={1.2}>
                              <Typography sx={{ fontSize: '1.25rem' }}>{icon}</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#0B1C16', fontSize: '0.92rem' }}>
                                {cat.category}
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2" sx={{ fontWeight: 900, color: '#00412E', fontSize: '0.95rem' }}>
                                {cat.count} {cat.count === 1 ? 'request' : 'requests'}
                              </Typography>
                              <Chip
                                size="small"
                                label={`${percentage}%`}
                                sx={{
                                  height: 20,
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  bgcolor: '#E6F0EB',
                                  color: '#00412E',
                                }}
                              />
                            </Stack>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={percentage}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: 'rgba(0, 65, 46, 0.08)',
                              '& .MuiLinearProgress-bar': { bgcolor: '#00412E' },
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

              {/* Status Pipeline & Triage Efficiency Widget (Like Climate Change Index / Global in reference) */}
              <Card
                sx={{
                  p: 3,
                  bgcolor: '#FFFFFF',
                  borderRadius: 3.5,
                  boxShadow: '0 4px 18px rgba(0, 65, 46, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: '#00412E', fontSize: '1.2rem', mb: 0.5 }}>
                    Triage & Resolution Pipeline
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.82rem', display: 'block', mb: 2.5 }}>
                    Real-time ratio between open backlog and completed interventions
                  </Typography>

                  <Stack spacing={2.5}>
                    {/* Pipeline bar */}
                    <Box>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.8 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                          Workflow Pipeline Breakdown
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#00412E' }}>
                          {analytics?.total || 0} Total
                        </Typography>
                      </Stack>
                      <Box sx={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', bgcolor: '#E8EAE5' }}>
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
                            bgcolor: '#00412E',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </Box>
                    </Box>

                    {/* Legend */}
                    <Stack spacing={1.2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#D97706' }} />
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.88rem' }}>
                            Pending Department Triage
                          </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#D97706' }}>
                          {analytics?.pending ?? 0}
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#96BF8A' }} />
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.88rem' }}>
                            Active Fieldwork & Repairs
                          </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#00412E' }}>
                          {analytics?.inProgress ?? 0}
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#00412E' }} />
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.88rem' }}>
                            Officially Resolved
                          </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#15803D' }}>
                          {analytics?.resolved ?? 0}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Stack>
                </Box>

                {/* Efficiency callout banner */}
                <Box
                  sx={{
                    mt: 3,
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: '#E6F0EB',
                    border: '1px solid rgba(0, 65, 46, 0.12)',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#00412E', fontSize: '0.92rem', mb: 0.3 }}>
                    ⚡ Service Delivery SLA Status
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#0B1C16', fontSize: '0.82rem', lineHeight: 1.4, display: 'block' }}>
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
            <Card sx={{ p: 2, mb: 2.5, borderRadius: 3.5, boxShadow: '0 2px 10px rgba(0, 65, 46, 0.03)' }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
                {/* Status Chips */}
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.8}>
                  {['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED'].map((filter) => (
                    <Chip
                      key={filter}
                      label={filter === 'ALL' ? 'All Requests' : filter.replace('_', ' ')}
                      clickable
                      color={statusFilter === filter ? 'primary' : 'default'}
                      variant={statusFilter === filter ? 'filled' : 'outlined'}
                      onClick={() => setStatusFilter(filter)}
                      sx={{ fontWeight: 700, fontSize: '0.88rem', py: 1.8 }}
                    />
                  ))}
                </Stack>

                {/* Search & Category Filter */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', md: 'auto' } }}>
                  <TextField
                    select
                    size="small"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    sx={{ minWidth: 180 }}
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
                    sx={{ minWidth: 220, flexGrow: 1 }}
                  />
                  <Button variant="contained" size="small" onClick={fetchRequests} sx={{ px: 2.5, fontWeight: 700 }}>
                    Filter
                  </Button>
                </Stack>
              </Stack>
            </Card>

            {/* Requests Content */}
            {requestsLoading ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <CircularProgress size={40} color="primary" />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Loading service requests...
                </Typography>
              </Box>
            ) : requests.length === 0 ? (
              <Paper elevation={0} sx={{ p: 5, textAlign: 'center', border: '1px solid rgba(0, 65, 46, 0.1)', borderRadius: 3.5, bgcolor: '#FFFFFF' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1 }}>
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
              <Stack spacing={2}>
                {requests.map((row) => (
                  <Card
                    key={row.id}
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      border: '1px solid rgba(0, 65, 46, 0.08)',
                      bgcolor: '#FFFFFF',
                    }}
                  >
                    <Stack spacing={1.5}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box
                          sx={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: '0.95rem',
                            color: '#00412E',
                            bgcolor: '#E8EAE5',
                            px: 1.2,
                            py: 0.4,
                            borderRadius: 1.5,
                          }}
                        >
                          {row.referenceNumber}
                        </Box>
                        <Chip
                          size="small"
                          color={statusColorMap[row.status]}
                          label={statusLabelMap[row.status]}
                          sx={{ fontWeight: 800, fontSize: '0.78rem' }}
                        />
                      </Stack>

                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0B1C16' }}>
                          {row.category}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          📍 {row.location} • Submitted by {row.citizen?.name || 'Citizen'}
                        </Typography>
                      </Box>

                      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.88rem', lineHeight: 1.4 }}>
                        {row.description.length > 100 ? `${row.description.substring(0, 100)}...` : row.description}
                      </Typography>

                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleOpenStatusDialog(row)}
                        sx={{ fontWeight: 700, alignSelf: 'flex-start', mt: 0.5 }}
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
                  border: '1px solid rgba(0, 65, 46, 0.08)',
                  borderRadius: 3.5,
                  overflow: 'hidden',
                  bgcolor: '#FFFFFF',
                }}
              >
                <Table sx={{ minWidth: 800 }}>
                  <TableHead sx={{ bgcolor: '#F8FAF9' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.95rem', py: 1.8 }}>Reference #</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.95rem', py: 1.8 }}>Citizen</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.95rem', py: 1.8 }}>Sector & Location</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.95rem', py: 1.8 }}>Current Status</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.95rem', py: 1.8 }}>Submission Date</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.95rem', py: 1.8 }} align="right">
                        Triage Action
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requests.map((row) => (
                      <TableRow key={row.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 800, color: '#00412E', fontSize: '0.95rem' }}>
                          {row.referenceNumber}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.92rem' }}>
                            {row.citizen?.name || 'Citizen'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.78rem' }}>
                            {row.citizen?.email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.92rem' }}>
                            {row.category}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.78rem' }}>
                            📍 {row.location}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={statusColorMap[row.status]}
                            label={statusLabelMap[row.status]}
                            sx={{ fontWeight: 800, fontSize: '0.82rem', py: 1.8 }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                          {new Date(row.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleOpenStatusDialog(row)}
                            sx={{ fontSize: '0.85rem', fontWeight: 700, py: 0.8, px: 2 }}
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
              border: '1px solid rgba(0, 65, 46, 0.08)',
              borderRadius: 3.5,
              overflow: 'hidden',
              bgcolor: '#FFFFFF',
            }}
          >
            {usersLoading ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <CircularProgress size={40} color="primary" />
              </Box>
            ) : users.length === 0 ? (
              <Box sx={{ p: 5, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  No registered users found.
                </Typography>
              </Box>
            ) : (
              <Table sx={{ minWidth: 700 }}>
                <TableHead sx={{ bgcolor: '#F8FAF9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.95rem', py: 1.8 }}>Full Name</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.95rem', py: 1.8 }}>Email Address</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.95rem', py: 1.8 }}>Assigned Role</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.95rem', py: 1.8 }}>Account Status</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.95rem', py: 1.8 }}>Registration Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} hover>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.92rem' }}>{u.name}</TableCell>
                      <TableCell sx={{ fontSize: '0.88rem' }}>{u.email}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={u.role === 'ADMIN' ? 'secondary' : 'default'}
                          label={u.role}
                          sx={{ fontWeight: 800, fontSize: '0.78rem' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={u.isActive ? 'success' : 'error'}
                          label={u.isActive ? 'Active' : 'Inactive'}
                          variant="outlined"
                          sx={{ fontWeight: 700, fontSize: '0.78rem' }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
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
        PaperProps={{ sx: { borderRadius: 4, p: 1 } }}
      >
        <DialogTitle sx={{ pb: 1, pt: 2.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#00412E' }}>
            Update Request Status & Resolution
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 0.5 }}>
            Reference: <strong>{selectedRequest?.referenceNumber}</strong> • {selectedRequest?.category}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ py: 3 }}>
          <Stack spacing={2.5}>
            {updateError && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {updateError}
              </Alert>
            )}

            <Box sx={{ p: 2, bgcolor: '#F8FAF9', borderRadius: 2.5, border: '1px solid rgba(0, 65, 46, 0.08)' }}>
              <Typography variant="caption" sx={{ color: '#00412E', fontWeight: 800, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                Citizen Description & Location
              </Typography>
              <Typography variant="body1" sx={{ lineHeight: 1.6, fontSize: '1rem', mb: 1 }}>
                {selectedRequest?.description}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                📍 Location: <strong>{selectedRequest?.location}</strong>
              </Typography>
            </Box>

            {selectedRequest?.imageUrl && (
              <Box sx={{ mt: 1 }}>
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
                  sx={{ maxHeight: 200, borderRadius: 2, border: '1px solid #e2e8f0', objectFit: 'cover' }}
                />
              </Box>
            )}

            <TextField
              select
              label="County Action Status"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as RequestStatus)}
              fullWidth
              size="medium"
            >
              <MenuItem value="PENDING" sx={{ py: 1.2 }}>PENDING — Waiting for department triage</MenuItem>
              <MenuItem value="IN_PROGRESS" sx={{ py: 1.2 }}>IN_PROGRESS — Field crew deployed / work ongoing</MenuItem>
              <MenuItem value="RESOLVED" sx={{ py: 1.2 }}>RESOLVED — Intervention completed</MenuItem>
            </TextField>

            <TextField
              label="Official County Resolution Note / Action Summary"
              multiline
              rows={4}
              fullWidth
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="e.g. Murang'a County road engineering unit inspected the site, excavated damaged culverts, and resurfaced the 1.2km stretch with tarmac."
              helperText="This official note is immediately visible to the citizen on their tracking stepper."
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setSelectedRequest(null)} disabled={updating} sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleSaveStatus}
            disabled={updating}
            sx={{ fontWeight: 800, px: 3.5, py: 1.2 }}
          >
            {updating ? <CircularProgress size={22} color="inherit" /> : 'Save Status Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
