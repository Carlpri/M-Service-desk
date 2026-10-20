import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Tooltip,
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
  darkMode?: boolean
  onToggleTheme?: () => void
}

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)

const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)

export default function Navbar({
  currentTab,
  onTabChange,
  user,
  health,
  onOpenAuth,
  onLogout,
  darkMode = false,
  onToggleTheme,
}: NavbarProps) {
  const isDbConnected = health?.database === 'connected'

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        color: 'text.primary',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
      }}
    >
      <Container maxWidth={false} sx={{ px: { xs: 1.5, sm: 3, md: 6, lg: 8 } }}>
        <Toolbar
          disableGutters
          sx={{
            minHeight: { xs: 54, sm: 68 },
            py: { xs: 0.5, sm: 1 },
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Brand Left */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={{ xs: 1, sm: 1.5 }}
            sx={{ cursor: 'pointer', userSelect: 'none' }}
            onClick={() => onTabChange(0)}
          >
            <Box
              sx={{
                width: { xs: 34, sm: 44 },
                height: { xs: 34, sm: 44 },
                borderRadius: '4px',
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'primary.contrastText',
                fontWeight: 800,
                fontSize: { xs: '1.1rem', sm: '1.35rem' },
                boxShadow: (t) =>
                  t.palette.mode === 'dark'
                    ? '0 2px 10px rgba(45, 212, 191, 0.3)'
                    : '0 3px 10px rgba(23, 107, 87, 0.3)',
              }}
            >
              M
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '1.02rem', sm: '1.28rem' },
                  lineHeight: 1.15,
                  color: 'primary.main',
                  letterSpacing: '-0.02em',
                }}
              >
                M-Service Desk
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 600,
                  fontSize: { xs: '0.72rem', sm: '0.85rem' },
                  display: { xs: 'none', sm: 'block' },
                }}
              >
                County Government of Murang'a
              </Typography>
            </Box>
          </Stack>

          {/* Desktop Status Badge */}
          <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', md: 'flex' } }}>
            <Chip
              size="small"
              variant="outlined"
              color={isDbConnected ? 'success' : 'warning'}
              label={isDbConnected ? 'API & Database Online' : 'Database Offline'}
              sx={{ fontWeight: 700, fontSize: '0.8rem', px: 0.5 }}
            />
          </Stack>

          {/* Right Action Buttons */}
          <Stack direction="row" alignItems="center" spacing={{ xs: 0.8, sm: 1.5 }}>
            {/* Theme Toggle Button */}
            {onToggleTheme && (
              <Tooltip title={darkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}>
                <IconButton
                  size="small"
                  onClick={onToggleTheme}
                  aria-label="Toggle color theme"
                  sx={{
                    width: { xs: 32, sm: 36 },
                    height: { xs: 32, sm: 36 },
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: 'divider',
                    color: 'text.primary',
                    bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'),
                    '&:hover': {
                      bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'),
                    },
                  }}
                >
                  {darkMode ? <SunIcon /> : <MoonIcon />}
                </IconButton>
              </Tooltip>
            )}

            {/* Profile / Auth Button */}
            {user ? (
              <Stack direction="row" alignItems="center" spacing={{ xs: 0.8, sm: 1.5 }}>
                {/* Desktop User Info Chip */}
                <Chip
                  avatar={
                    <Avatar
                      sx={{
                        bgcolor: user.role === 'ADMIN' ? 'secondary.main' : 'primary.main',
                        width: { xs: 26, sm: 32 },
                        height: { xs: 26, sm: 32 },
                        fontSize: { xs: '0.75rem', sm: '0.88rem' },
                        color: user.role === 'ADMIN' ? 'secondary.contrastText' : 'primary.contrastText',
                      }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </Avatar>
                  }
                  label={
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <strong style={{ fontSize: '0.88rem' }}>{user.name.split(' ')[0]}</strong>
                      <Box
                        component="span"
                        sx={{
                          fontSize: '0.68rem',
                          bgcolor: user.role === 'ADMIN' ? 'secondary.main' : 'primary.main',
                          color: user.role === 'ADMIN' ? 'secondary.contrastText' : 'primary.contrastText',
                          px: 0.6,
                          py: 0.2,
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                        }}
                      >
                        {user.role}
                      </Box>
                    </Box>
                  }
                  variant="outlined"
                  size="small"
                  sx={{
                    borderColor: 'divider',
                    py: 1.8,
                    px: 0.3,
                    display: { xs: 'none', sm: 'inline-flex' },
                  }}
                />

                {/* Mobile User Avatar Indicator */}
                <Tooltip title={`${user.name} (${user.role})`}>
                  <Avatar
                    sx={{
                      display: { xs: 'flex', sm: 'none' },
                      bgcolor: user.role === 'ADMIN' ? 'secondary.main' : 'primary.main',
                      color: user.role === 'ADMIN' ? 'secondary.contrastText' : 'primary.contrastText',
                      width: 30,
                      height: 30,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      border: '1.5px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </Avatar>
                </Tooltip>

                {/* Sign Out Button */}
                <Button
                  variant="outlined"
                  color="inherit"
                  size="small"
                  onClick={onLogout}
                  sx={{
                    fontWeight: 600,
                    px: { xs: 1.2, sm: 2 },
                    py: { xs: 0.3, sm: 0.6 },
                    fontSize: { xs: '0.78rem', sm: '0.9rem' },
                    borderColor: 'divider',
                    minWidth: 0,
                  }}
                >
                  Sign Out
                </Button>
              </Stack>
            ) : (
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={onOpenAuth}
                sx={{
                  px: { xs: 1.5, sm: 2.6 },
                  py: { xs: 0.5, sm: 0.8 },
                  fontWeight: 700,
                  fontSize: { xs: '0.82rem', sm: '0.95rem' },
                  whiteSpace: 'nowrap',
                }}
              >
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                  Sign In
                </Box>
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  Sign In / Register
                </Box>
              </Button>
            )}
          </Stack>
        </Toolbar>

        {/* Navigation Tabs - visible without scrolling on mobile */}
        <Tabs
          value={currentTab}
          onChange={(_e, v) => onTabChange(v)}
          textColor="primary"
          indicatorColor="primary"
          variant="fullWidth"
          sx={{
            minHeight: { xs: 42, sm: 48 },
            '& .MuiTabs-flexContainer': {
              justifyContent: { xs: 'space-between', md: 'flex-start' },
            },
            '& .MuiTab-root': {
              minHeight: { xs: 42, sm: 48 },
              fontSize: { xs: '0.78rem', sm: '0.92rem', md: '1rem' },
              fontWeight: 700,
              textTransform: 'none',
              px: { xs: 0.4, sm: 2, md: 3 },
              minWidth: 0,
              letterSpacing: { xs: '-0.02em', sm: 'normal' },
              whiteSpace: 'nowrap',
            },
          }}
        >
          <Tab
            label={
              <>
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                  Portal
                </Box>
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  County Portal
                </Box>
              </>
            }
          />
          <Tab
            label={
              <>
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                  Submit
                </Box>
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  Submit Request
                </Box>
              </>
            }
          />
          <Tab
            label={
              <>
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                  Track Requests
                </Box>
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  Track My Requests
                </Box>
              </>
            }
          />
          {user?.role === 'ADMIN' && (
            <Tab
              label={
                <>
                  <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                    Admin
                  </Box>
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                    Admin Desk
                  </Box>
                </>
              }
            />
          )}
        </Tabs>
      </Container>
    </AppBar>
  )
}
