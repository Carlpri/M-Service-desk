import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { loginUser, registerUser } from '../services/api'
import type { UserProfile } from '../types/api'

type AuthDialogProps = {
  open: boolean
  onClose: () => void
  onSuccess: (token: string, user: UserProfile) => void
}

export default function AuthDialog({ open, onClose, onSuccess }: AuthDialogProps) {
  const [tabIndex, setTabIndex] = useState(0)

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  // Registration form state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState<string | null>(null)
  const [regSuccess, setRegSuccess] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(null)
    setLoginLoading(true)

    try {
      const response = await loginUser({
        email: loginEmail.trim(),
        password: loginPassword,
      })
      onSuccess(response.token, response.user)
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please check your credentials.'
      setLoginError(message)
    } finally {
      setLoginLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegError(null)
    setRegSuccess(null)
    setRegLoading(true)

    try {
      const response = await registerUser({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
      })
      setRegSuccess(response.message || 'Registration successful! Your citizen account has been created.')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      setRegError(message)
    } finally {
      setRegLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4, p: 1 } }}>
      <DialogTitle sx={{ pb: 1, pt: 2.5, px: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', fontSize: { xs: '1.6rem', md: '2rem' } }}>
          M-Service Desk Authentication
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5, fontSize: '1.05rem' }}>
          Murang'a County Public Service Request & Administration Portal
        </Typography>
      </DialogTitle>

      <Tabs
        value={tabIndex}
        onChange={(_e, v) => {
          setTabIndex(v)
          setLoginError(null)
          setRegError(null)
          setRegSuccess(null)
        }}
        textColor="primary"
        indicatorColor="primary"
        sx={{
          px: 3,
          borderBottom: '2px solid #e2e8f0',
          '& .MuiTab-root': {
            fontSize: '1.05rem',
            fontWeight: 700,
            textTransform: 'none',
            py: 1.5,
          },
        }}
      >
        <Tab label="Citizen / Staff Login" />
        <Tab label="Register Citizen" />
        <Tab label="Assessment Architecture Notes" />
      </Tabs>

      <DialogContent sx={{ py: 3.5, px: 3 }}>
        {tabIndex === 0 && (
          <Box component="form" onSubmit={handleLogin} sx={{ mt: 1 }}>
            <Stack spacing={3}>
              {loginError && (
                <Alert severity="error" sx={{ borderRadius: 2.5, fontSize: '1.05rem', py: 1.5 }}>
                  {loginError}
                </Alert>
              )}

              <TextField
                label="Email Address"
                type="email"
                required
                fullWidth
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="e.g. amina@example.com"
                size="medium"
              />

              <TextField
                label="Password"
                type="password"
                required
                fullWidth
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter account password (minimum 12 characters)"
                size="medium"
              />

              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={loginLoading}
                sx={{ py: 1.6, fontWeight: 800, fontSize: '1.15rem' }}
              >
                {loginLoading ? <CircularProgress size={26} color="inherit" /> : 'Sign In to M-Service Desk'}
              </Button>
            </Stack>
          </Box>
        )}

        {tabIndex === 1 && (
          <Box component="form" onSubmit={handleRegister} sx={{ mt: 1 }}>
            <Stack spacing={3}>
              {regError && (
                <Alert severity="error" sx={{ borderRadius: 2.5, fontSize: '1.05rem', py: 1.5 }}>
                  {regError}
                </Alert>
              )}
              {regSuccess && (
                <Alert severity="success" sx={{ borderRadius: 2.5, fontSize: '1.05rem', py: 1.5 }}>
                  {regSuccess}
                </Alert>
              )}

              <TextField
                label="Full Name"
                required
                fullWidth
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="e.g. Amina Citizen"
                size="medium"
              />

              <TextField
                label="Email Address"
                type="email"
                required
                fullWidth
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="e.g. amina@example.com"
                size="medium"
              />

              <TextField
                label="Password (min 12 characters)"
                type="password"
                required
                fullWidth
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                helperText="Phase 2 policy: Argon2id hashed; must be 12 to 128 characters"
                size="medium"
              />

              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={regLoading}
                sx={{ py: 1.6, fontWeight: 800, fontSize: '1.15rem' }}
              >
                {regLoading ? <CircularProgress size={26} color="inherit" /> : 'Create Citizen Account'}
              </Button>

              <Alert severity="info" sx={{ fontSize: '0.92rem', borderRadius: 2 }}>
                Note: Public registration automatically assigns the <strong>CITIZEN</strong> role. Privileged administrator accounts are provisioned via separate operational access.
              </Alert>
            </Stack>
          </Box>
        )}

        {tabIndex === 2 && (
          <Box sx={{ py: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, color: 'primary.main', fontSize: '1.25rem' }}>
              Phase 2 Security & Authentication Architecture
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph sx={{ fontSize: '1.05rem' }}>
              The system demonstrates complete role-based access control (RBAC), opaque bearer credentials, and Argon2id password hashing:
            </Typography>

            <Stack spacing={2}>
              <Box sx={{ p: 2, bgcolor: '#f1f5f9', borderRadius: 2.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'block', color: 'primary.dark', fontSize: '1.05rem' }}>
                  1. Opaque Session Tokens
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.95rem', mt: 0.5 }}>
                  Random 32-byte bearer tokens are generated. The database only stores their SHA-256 hashes, ensuring session tokens cannot be recovered from a database leak.
                </Typography>
              </Box>

              <Box sx={{ p: 2, bgcolor: '#f1f5f9', borderRadius: 2.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'block', color: 'primary.dark', fontSize: '1.05rem' }}>
                  2. Role Enforcement
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.95rem', mt: 0.5 }}>
                  Roles are enforced on the backend via <code>requireRole(UserRole.ADMIN)</code>. Client registration input cannot escalate permissions.
                </Typography>
              </Box>

              <Box sx={{ p: 2, bgcolor: '#f1f5f9', borderRadius: 2.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'block', color: 'primary.dark', fontSize: '1.05rem' }}>
                  3. Session Invalidation
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.95rem', mt: 0.5 }}>
                  Changing a password revokes all active sessions immediately and invalidates unconsumed reset tokens in a single atomic database transaction.
                </Typography>
              </Box>
            </Stack>

            <Divider sx={{ my: 3 }} />
            <Button fullWidth variant="outlined" size="large" onClick={onClose} sx={{ fontWeight: 700 }}>
              Close
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}
