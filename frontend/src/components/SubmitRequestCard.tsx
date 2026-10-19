import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { createServiceRequest } from '../services/api'
import type { ServiceRequest, UserProfile } from '../types/api'

type SubmitRequestCardProps = {
  token: string | null
  user: UserProfile | null
  onOpenAuth: () => void
  onSuccess: (newRequest: ServiceRequest) => void
}

const categories = [
  'Roads & Infrastructure',
  'Water & Sanitation',
  'Waste Management',
  'Public Health',
  'Street Lighting & Energy',
  'Education & Youth Services',
  'Agriculture & Livestock',
  'Environment & Natural Resources',
  'Other Public Services',
]

const subCountiesAndWards = [
  'Kiharu - Murang\'a Town',
  'Kiharu - Mbiri Ward',
  'Kiharu - Mugoiri Ward',
  'Kangema - Muguru Ward',
  'Kangema - Kanyenyaini Ward',
  'Mathioya - Kiru Ward',
  'Mathioya - Kamacharia Ward',
  'Maragua - Ichagaki Ward',
  'Maragua - Kambiti Ward',
  'Kigumo - Kangari Ward',
  'Kandara - Muruka Ward',
  'Gatanga - Kariara Ward',
]

export default function SubmitRequestCard({
  token,
  user,
  onOpenAuth,
  onSuccess,
}: SubmitRequestCardProps) {
  const [category, setCategory] = useState(categories[0])
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdRequest, setCreatedRequest] = useState<ServiceRequest | null>(null)
  const [copied, setCopied] = useState(false)

  if (!token || !user) {
    return (
      <Paper elevation={0} sx={{ p: { xs: 4, md: 6 }, textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 4, my: 4, width: '100%' }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1.5, color: 'primary.main', fontSize: { xs: '1.8rem', md: '2.2rem' } }}>
          Sign In to Submit a Service Request
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 650, mx: 'auto', mb: 4, fontSize: '1.15rem' }}>
          To ensure transparency and allow you to track interventions directly, service requests are securely linked to verified citizen accounts.
        </Typography>
        <Button variant="contained" color="primary" size="large" onClick={onOpenAuth} sx={{ px: 5, py: 1.6, fontWeight: 700, fontSize: '1.1rem' }}>
          Sign In or Register
        </Button>
      </Paper>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (description.trim().length < 10) {
      setError('Description must be at least 10 characters long.')
      return
    }

    if (!location.trim()) {
      setError('Location / Ward is required.')
      return
    }

    setSubmitting(true)

    try {
      const response = await createServiceRequest(token, {
        category,
        location: location.trim(),
        description: description.trim(),
        imageUrl: imageUrl.trim() || undefined,
      })

      setCreatedRequest(response.request)
      onSuccess(response.request)
      // Reset form fields
      setLocation('')
      setDescription('')
      setImageUrl('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit service request'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyRef = () => {
    if (createdRequest?.referenceNumber) {
      navigator.clipboard.writeText(createdRequest.referenceNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <Box sx={{ width: '100%', py: 3 }}>
      {createdRequest && (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mb: 4,
            borderRadius: 3,
            bgcolor: '#ecfdf5',
            border: '2px solid #6ee7b7',
          }}
        >
          <Stack spacing={2}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#065f46' }}>
              ✓ Service Request Successfully Submitted!
            </Typography>
            <Typography variant="body1" sx={{ color: '#047857', fontSize: '1.15rem' }}>
              Your report has been registered on the County Service Desk. Keep this reference number to monitor field actions:
            </Typography>

            <Stack direction="row" alignItems="center" spacing={2} sx={{ pt: 1 }}>
              <Box
                sx={{
                  bgcolor: '#ffffff',
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  border: '2px solid #059669',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  fontSize: '1.35rem',
                  color: '#065f46',
                }}
              >
                {createdRequest.referenceNumber}
              </Box>
              <Button
                variant="contained"
                size="large"
                onClick={handleCopyRef}
                sx={{ bgcolor: '#059669', color: '#ffffff', px: 3, py: 1.4, fontWeight: 700, '&:hover': { bgcolor: '#047857' } }}
              >
                {copied ? 'Copied to Clipboard!' : 'Copy Reference'}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      <Card sx={{ width: '100%', borderRadius: 4, p: { xs: 2, sm: 3, md: 5 } }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ mb: 3.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 1, fontSize: { xs: '1.8rem', md: '2.3rem' } }}>
              Submit a Public Service Request
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.15rem' }}>
              Report an infrastructure breakdown, water shortage, health issue, or public sanitation concern directly to Murang'a County.
            </Typography>
          </Box>

          <Divider sx={{ mb: 4 }} />

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={4}>
              {error && (
                <Alert severity="error" sx={{ borderRadius: 2, fontSize: '1.05rem', py: 1.5 }}>
                  {error}
                </Alert>
              )}

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    label="County Service Sector"
                    required
                    fullWidth
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    helperText="Select the sector responsible for this report"
                  >
                    {categories.map((cat) => (
                      <MenuItem key={cat} value={cat} sx={{ fontSize: '1.05rem', py: 1.2 }}>
                        {cat}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Specific Location / Ward / Landmark"
                    required
                    fullWidth
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Kiharu Ward, near Murang'a General Hospital bypass"
                    helperText="Provide specific landmarks so county engineers or inspectors can locate the site"
                  />
                </Grid>
              </Grid>

              {/* Quick location tag suggestions */}
              <Box sx={{ bgcolor: '#f8fafc', p: 2.5, borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700, mb: 1.2, fontSize: '0.95rem' }}>
                  Quick Fill: Sub-Counties & Wards (Click to insert):
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {subCountiesAndWards.map((loc) => (
                    <Box
                      key={loc}
                      component="span"
                      onClick={() => setLocation(loc)}
                      sx={{
                        fontSize: '0.9rem',
                        bgcolor: '#ffffff',
                        px: 1.5,
                        py: 0.6,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        color: 'primary.dark',
                        fontWeight: 600,
                        border: '1px solid #cbd5e1',
                        transition: 'all 0.15s ease',
                        '&:hover': { bgcolor: 'primary.main', color: '#ffffff', borderColor: 'primary.main' },
                      }}
                    >
                      + {loc}
                    </Box>
                  ))}
                </Stack>
              </Box>

              <TextField
                label="Detailed Incident Description"
                required
                multiline
                rows={5}
                fullWidth
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue in detail: what happened, when it started, and how it impacts the community..."
                helperText={`${description.trim().length} / 2000 characters (minimum 10 characters required)`}
                error={description.length > 0 && description.trim().length < 10}
              />

              <TextField
                label="Optional Photo Evidence URL"
                fullWidth
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/photos/road-damage.jpg"
                helperText="Provide an image link documenting the issue (e.g. damaged culvert, leaking pipe)"
              />

              {imageUrl && (
                <Box
                  sx={{
                    p: 2,
                    border: '2px dashed #cbd5e1',
                    borderRadius: 3,
                    textAlign: 'center',
                    bgcolor: '#f8fafc',
                  }}
                >
                  <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'block', mb: 1.5, fontWeight: 700 }}>
                    Image Preview:
                  </Typography>
                  <Box
                    component="img"
                    src={imageUrl}
                    alt="Preview"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                    sx={{ maxHeight: 250, maxWidth: '100%', borderRadius: 2, objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  />
                </Box>
              )}

              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={submitting}
                sx={{ py: 1.8, fontWeight: 800, fontSize: '1.18rem', borderRadius: 2.5 }}
              >
                {submitting ? <CircularProgress size={26} color="inherit" /> : 'Submit Request to County Desk'}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
