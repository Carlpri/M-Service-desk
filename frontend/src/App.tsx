import { lazy, Suspense, useEffect, useState } from 'react'
import { Box, CircularProgress, Container, Stack, Typography } from '@mui/material'
import Navbar from './components/Navbar'
import AuthDialog from './components/AuthDialog'
import PortalOverview from './components/PortalOverview'
import { getApiHealth, getMe, logoutUser } from './services/api'
import type { ApiHealthResponse, UserProfile } from './types/api'

const SubmitRequestCard = lazy(() => import('./components/SubmitRequestCard'))
const CitizenRequestsList = lazy(() => import('./components/CitizenRequestsList'))
const AdminDashboard = lazy(() => import('./components/AdminDashboard'))

type AppProps = {
  darkMode?: boolean
  onToggleTheme?: () => void
}

export default function App({ darkMode = false, onToggleTheme }: AppProps) {
  const [currentTab, setCurrentTab] = useState(0)
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('m_service_token'))
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('m_service_user')
    return saved ? (JSON.parse(saved) as UserProfile) : null
  })
  const [health, setHealth] = useState<ApiHealthResponse | null>(null)

  // Verify health on load
  useEffect(() => {
    getApiHealth()
      .then(setHealth)
      .catch((err) => {
        console.error('Health check failed:', err)
        setHealth({
          application: 'M-Service Desk',
          status: 'error',
          timestamp: new Date().toISOString(),
          database: 'disconnected',
        })
      })
  }, [])

  // Verify token on load
  useEffect(() => {
    if (token) {
      getMe(token)
        .then((res) => {
          setUser(res.user)
          localStorage.setItem('m_service_user', JSON.stringify(res.user))
        })
        .catch(() => {
          // Token expired or invalid
          setToken(null)
          setUser(null)
          localStorage.removeItem('m_service_token')
          localStorage.removeItem('m_service_user')
        })
    }
  }, [token])

  const handleAuthSuccess = (newToken: string, newUser: UserProfile) => {
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem('m_service_token', newToken)
    localStorage.setItem('m_service_user', JSON.stringify(newUser))
    if (newUser.role === 'ADMIN') {
      setCurrentTab(3)
    } else {
      setCurrentTab(1)
    }
  }

  const handleLogout = async () => {
    if (token) {
      try {
        await logoutUser(token)
      } catch (err) {
        console.error('Logout error:', err)
      }
    }
    setToken(null)
    setUser(null)
    localStorage.removeItem('m_service_token')
    localStorage.removeItem('m_service_user')
    setCurrentTab(0)
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Navbar
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        user={user}
        health={health}
        onOpenAuth={() => setAuthDialogOpen(true)}
        onLogout={handleLogout}
        darkMode={darkMode}
        onToggleTheme={onToggleTheme}
      />

      <Container
        maxWidth={false}
        component="main"
        sx={{
          flexGrow: 1,
          py: 3,
          pb: { xs: 10, md: 4 },
          px: { xs: 1.5, sm: 3, md: 5, lg: 7, xl: 9 },
        }}
      >
        <Suspense
          fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 12 }}>
              <CircularProgress color="primary" />
            </Box>
          }
        >
          {currentTab === 0 && (
            <PortalOverview
              onNavigateToSubmit={() => setCurrentTab(1)}
              onNavigateToTrack={() => setCurrentTab(2)}
              onOpenAuth={() => setAuthDialogOpen(true)}
              isAuthenticated={Boolean(user)}
            />
          )}

          {currentTab === 1 && (
            <SubmitRequestCard
              token={token}
              user={user}
              onOpenAuth={() => setAuthDialogOpen(true)}
              onSuccess={() => {
                // Switch to citizen tracking tab
                setTimeout(() => setCurrentTab(2), 2000)
              }}
            />
          )}

          {currentTab === 2 && (
            <CitizenRequestsList
              token={token}
              user={user}
              onOpenAuth={() => setAuthDialogOpen(true)}
              onNavigateToSubmit={() => setCurrentTab(1)}
            />
          )}

          {currentTab === 3 && (
            <AdminDashboard
              token={token}
              user={user}
              onOpenAuth={() => setAuthDialogOpen(true)}
            />
          )}
        </Suspense>
      </Container>

      <AuthDialog
        open={authDialogOpen}
        onClose={() => setAuthDialogOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Desktop / Tablet Footer */}
      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          mt: 'auto',
          mb: { xs: 7, md: 0 },
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          textAlign: 'center',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          <strong>M-Service Desk</strong> • County Government of Murang'a Public Service Board Assessment System
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Mini eCitizen-style architecture demonstrating clean RBAC, opaque bearer sessions, and live public request tracking.
        </Typography>
      </Box>

      {/* Mobile Bottom Navigation Bar (Android-friendly thumb bar) */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: { xs: 'block', md: 'none' },
          zIndex: 1100,
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 -4px 18px rgba(0, 65, 46, 0.08)',
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-around"
          alignItems="center"
          sx={{ height: 58, px: 1 }}
        >
          <Box
            onClick={() => setCurrentTab(0)}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              color: currentTab === 0 ? 'primary.main' : 'text.secondary',
              fontWeight: 700,
              fontSize: '0.72rem',
              py: 0.5,
              flexGrow: 1,
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>🏛️</span>
            <span>Portal</span>
          </Box>

          <Box
            onClick={() => setCurrentTab(1)}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              color: currentTab === 1 ? 'primary.main' : 'text.secondary',
              fontWeight: 700,
              fontSize: '0.72rem',
              py: 0.5,
              flexGrow: 1,
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>📝</span>
            <span>Submit</span>
          </Box>

          <Box
            onClick={() => setCurrentTab(2)}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              color: currentTab === 2 ? 'primary.main' : 'text.secondary',
              fontWeight: 700,
              fontSize: '0.72rem',
              py: 0.5,
              flexGrow: 1,
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>📋</span>
            <span>My Requests</span>
          </Box>

          {user?.role === 'ADMIN' && (
            <Box
              onClick={() => setCurrentTab(3)}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                color: currentTab === 3 ? 'primary.main' : 'text.secondary',
                fontWeight: 700,
                fontSize: '0.72rem',
                py: 0.5,
                flexGrow: 1,
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>⚙️</span>
              <span>Admin</span>
            </Box>
          )}
        </Stack>
      </Box>
    </Box>
  )
}
