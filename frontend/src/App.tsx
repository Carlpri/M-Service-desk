import { lazy, Suspense, useEffect, useState } from 'react'
import { Box, CircularProgress, Container, Typography } from '@mui/material'
import Navbar from './components/Navbar'
import AuthDialog from './components/AuthDialog'
import PortalOverview from './components/PortalOverview'
import { getApiHealth, getMe, logoutUser } from './services/api'
import type { ApiHealthResponse, UserProfile } from './types/api'

const SubmitRequestCard = lazy(() => import('./components/SubmitRequestCard'))
const CitizenRequestsList = lazy(() => import('./components/CitizenRequestsList'))
const AdminDashboard = lazy(() => import('./components/AdminDashboard'))

export default function App() {
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
      />

      <Container maxWidth={false} component="main" sx={{ flexGrow: 1, py: 3, px: { xs: 2, sm: 4, md: 6, lg: 8, xl: 10 } }}>
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
                // Option to switch to tracking tab
                setTimeout(() => setCurrentTab(2), 2200)
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

      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          mt: 'auto',
          borderTop: '1px solid #e2e8f0',
          bgcolor: '#ffffff',
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
    </Box>
  )
}
