import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Typography,
} from '@mui/material'
import type { ApiHealthResponse, UserProfile } from '../types/api'

type NavbarProps = {
  currentTab: number
  onTabChange: (newTab: number) => void
  user: UserProfile | null
  health: ApiHealthResponse | null
  onOpenAuth: () => void
  onLogout: () => void
}

export default function Navbar({
  currentTab,
  onTabChange,
  user,
  health,
  onOpenAuth,
  onLogout,
}: NavbarProps) {
  const isDbConnected = health?.database === 'connected'

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        color: 'text.primary',
      }}
    >
      <Container maxWidth={false} sx={{ px: { xs: 2, sm: 4, md: 6, lg: 8, xl: 10 } }}>
        <Toolbar disableGutters sx={{ minHeight: 76, py: 1 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            sx={{ cursor: 'pointer', mr: 3 }}
            onClick={() => onTabChange(0)}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '1.4rem',
                boxShadow: '0 3px 10px rgba(23, 107, 87, 0.35)',
              }}
            >
              M
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  fontSize: '1.35rem',
                  lineHeight: 1.15,
                  color: 'primary.main',
                  letterSpacing: '-0.02em',
                }}
              >
                M-Service Desk
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.9rem' }}>
                County Government of Murang'a
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', md: 'flex' }, mr: 'auto' }}>
            <Chip
              size="medium"
              variant="outlined"
              color={isDbConnected ? 'success' : 'warning'}
              label={isDbConnected ? 'API & Database Active' : 'Database Offline'}
              sx={{ fontWeight: 700, fontSize: '0.85rem', px: 1 }}
            />
          </Stack>

          <Stack direction="row" alignItems="center" spacing={2}>
            {user ? (
              <Stack direction="row" alignItems="center" spacing={2}>
                <Chip
                  avatar={
                    <Avatar sx={{ bgcolor: user.role === 'ADMIN' ? 'secondary.main' : 'primary.main', width: 34, height: 34 }}>
                      {user.name.charAt(0).toUpperCase()}
                    </Avatar>
                  }
                  label={
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <strong style={{ fontSize: '0.95rem' }}>{user.name}</strong>
                      <Box
                        component="span"
                        sx={{
                          fontSize: '0.75rem',
                          bgcolor: user.role === 'ADMIN' ? 'secondary.main' : 'primary.main',
                          color: '#ffffff',
                          px: 1,
                          py: 0.3,
                          borderRadius: '6px',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                        }}
                      >
                        {user.role}
                      </Box>
                    </Box>
                  }
                  variant="outlined"
                  sx={{ borderColor: '#cbd5e1', py: 2.2, px: 0.5 }}
                />
                <Button variant="outlined" color="inherit" size="medium" onClick={onLogout} sx={{ fontWeight: 600, px: 2.5 }}>
                  Sign Out
                </Button>
              </Stack>
            ) : (
              <Button
                variant="contained"
                color="primary"
                size="medium"
                onClick={onOpenAuth}
                sx={{ px: 3, py: 1, fontWeight: 700, fontSize: '1.02rem' }}
              >
                Sign In / Register
              </Button>
            )}
          </Stack>
        </Toolbar>

        <Tabs
          value={currentTab}
          onChange={(_e, v) => onTabChange(v)}
          textColor="primary"
          indicatorColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 52,
            '& .MuiTab-root': {
              minHeight: 52,
              fontSize: '1.05rem',
              fontWeight: 700,
              textTransform: 'none',
              px: 3,
            },
          }}
        >
          <Tab label="County Portal" />
          <Tab label="Submit Request" />
          <Tab label="Track My Requests" />
          {user?.role === 'ADMIN' && <Tab label="Admin Desk & Analytics" />}
        </Tabs>
      </Container>
    </AppBar>
  )
}
