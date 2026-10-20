import { useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { createServiceRequest, uploadIncidentImage } from '../services/api'
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
  const [uploadMode, setUploadMode] = useState<'upload' | 'url'>('upload')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ location?: string; description?: string; imageUrl?: string }>({})
  const [createdRequest, setCreatedRequest] = useState<ServiceRequest | null>(null)
  const [copied, setCopied] = useState(false)

  const handleFileProcess = async (file: File) => {
    if (!token) {
      setUploadError('Please sign in before uploading images.')
      return
    }
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPEG, PNG, WebP).')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image size exceeds 10MB limit. Please select a smaller photo.')
      return
    }

    setUploadError(null)
    setUploadingImage(true)
    setUploadedFileName(file.name)

    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string
        const res = await uploadIncidentImage(token, base64Data)
        setImageUrl(res.url)
        if (fieldErrors.imageUrl) {
          setFieldErrors((prev) => ({ ...prev, imageUrl: undefined }))
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to upload photo to Cloudinary'
        setUploadError(msg)
        setUploadedFileName(null)
      } finally {
        setUploadingImage(false)
      }
    }
    reader.onerror = () => {
      setUploadError('Failed to read file from your device.')
      setUploadingImage(false)
    }
    reader.readAsDataURL(file)
  }

  if (!token || !user) {
    return (
      <Paper elevation={0} sx={{ p: { xs: 4, md: 6 }, textAlign: 'center', border: '1px solid #e2e8f0', my: 4, width: '100%' }}>
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
    setFieldErrors({})

    const newErrors: { location?: string; description?: string; imageUrl?: string } = {}
    if (!location.trim()) {
      newErrors.location = 'Location / Ward is required.'
    }
    if (!description.trim()) {
      newErrors.description = 'Incident description is required.'
    } else if (description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters long.'
    }
    if (imageUrl.trim()) {
      try {
        new URL(imageUrl.trim())
      } catch {
        newErrors.imageUrl = 'Image URL must be a valid http or https link.'
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors)
      setError(Object.values(newErrors).join(' • '))
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
      setUploadedFileName(null)
      setUploadError(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit service request'
      const customErr = err as { fieldErrors?: Record<string, string> }
      if (customErr.fieldErrors) {
        setFieldErrors(customErr.fieldErrors)
      }
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
            p: 3,
            mb: 3,
            bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(5, 150, 105, 0.15)' : '#ecfdf5'),
            border: (t) => `1.5px solid ${t.palette.mode === 'dark' ? 'rgba(110, 231, 183, 0.4)' : '#6ee7b7'}`,
          }}
        >
          <Stack spacing={2}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: (t) => (t.palette.mode === 'dark' ? '#6ee7b7' : '#065f46') }}>
              ✓ Service Request Successfully Submitted!
            </Typography>
            <Typography variant="body1" sx={{ color: (t) => (t.palette.mode === 'dark' ? '#a7f3d0' : '#047857'), fontSize: '1.15rem' }}>
              Your report has been registered on the County Service Desk. Keep this reference number to monitor field actions:
            </Typography>

            <Stack direction="row" alignItems="center" spacing={2} sx={{ pt: 1 }}>
              <Box
                sx={{
                  bgcolor: (t) => (t.palette.mode === 'dark' ? 'background.paper' : '#ffffff'),
                  px: 2.5,
                  py: 1.2,
                  borderRadius: '4px',
                  border: '1.5px solid #059669',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  fontSize: '1.3rem',
                  color: (t) => (t.palette.mode === 'dark' ? '#6ee7b7' : '#065f46'),
                }}
              >
                {createdRequest.referenceNumber}
              </Box>
              <Button
                variant="contained"
                size="large"
                onClick={handleCopyRef}
                sx={{ bgcolor: '#059669', color: '#ffffff', px: 3, py: 1.2, fontWeight: 700, '&:hover': { bgcolor: '#047857' } }}
              >
                {copied ? 'Copied to Clipboard!' : 'Copy Reference'}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      <Card sx={{ width: '100%', p: { xs: 2, sm: 3, md: 4 } }}>
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
                <Alert severity="error" sx={{ fontSize: '1.05rem', py: 1.5 }}>
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
                    onChange={(e) => {
                      setLocation(e.target.value)
                      if (fieldErrors.location) setFieldErrors((p) => ({ ...p, location: undefined }))
                    }}
                    error={Boolean(fieldErrors.location)}
                    helperText={fieldErrors.location || "Provide specific landmarks so county engineers or inspectors can locate the site"}
                    placeholder="e.g. Kiharu Ward, near Murang'a General Hospital bypass"
                  />
                </Grid>
              </Grid>

              {/* Quick location tag suggestions */}
              <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: '4px', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700, mb: 1, fontSize: '0.9rem' }}>
                  Quick Fill: Sub-Counties & Wards (Click to insert):
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.8}>
                  {subCountiesAndWards.map((loc) => (
                    <Box
                      key={loc}
                      component="span"
                      onClick={() => {
                        setLocation(loc)
                        if (fieldErrors.location) setFieldErrors((p) => ({ ...p, location: undefined }))
                      }}
                      sx={{
                        fontSize: '0.85rem',
                        bgcolor: 'background.paper',
                        px: 1.2,
                        py: 0.5,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: 'primary.main',
                        fontWeight: 600,
                        border: '1px solid',
                        borderColor: 'divider',
                        transition: 'all 0.15s ease',
                        '&:hover': { bgcolor: 'primary.main', color: 'primary.contrastText', borderColor: 'primary.main' },
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
                onChange={(e) => {
                  setDescription(e.target.value)
                  if (fieldErrors.description) setFieldErrors((p) => ({ ...p, description: undefined }))
                }}
                placeholder="Describe the issue in detail: what happened, when it started, and how it impacts the community..."
                helperText={
                  fieldErrors.description ||
                  `${description.trim().length} / 2000 characters (minimum 10 characters required)`
                }
                error={Boolean(fieldErrors.description) || (description.length > 0 && description.trim().length < 10)}
              />

              {/* Photo Evidence Section */}
              <Box sx={{ p: 2.5, bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc'), borderRadius: '6px', border: '1px solid', borderColor: 'divider' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1.5} sx={{ mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '1.05rem' }}>
                      Incident Photo Evidence (Optional)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Clear photos help county dispatchers and field inspectors triage faster.
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant={uploadMode === 'upload' ? 'contained' : 'outlined'}
                      onClick={() => setUploadMode('upload')}
                      sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.85rem' }}
                    >
                      Upload Device Photo
                    </Button>
                    <Button
                      size="small"
                      variant={uploadMode === 'url' ? 'contained' : 'outlined'}
                      onClick={() => setUploadMode('url')}
                      sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.85rem' }}
                    >
                      Paste Image Link
                    </Button>
                  </Stack>
                </Stack>

                {uploadError && (
                  <Alert severity="error" onClose={() => setUploadError(null)} sx={{ mb: 2, fontSize: '0.95rem' }}>
                    {uploadError}
                  </Alert>
                )}

                {uploadMode === 'upload' ? (
                  <Box>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileProcess(file)
                        // Reset input value so same file can be re-selected if needed
                        e.target.value = ''
                      }}
                    />

                    {imageUrl ? (
                      <Box
                        sx={{
                          p: 2.5,
                          bgcolor: (t) => (t.palette.mode === 'dark' ? 'background.paper' : '#ffffff'),
                          borderRadius: '6px',
                          border: (t) => `1.5px solid ${t.palette.mode === 'dark' ? '#10B981' : '#059669'}`,
                          textAlign: 'center',
                        }}
                      >
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems="center">
                          <Box
                            component="img"
                            src={imageUrl}
                            alt="Uploaded evidence"
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).style.display = 'none'
                            }}
                            sx={{
                              width: { xs: '100%', sm: 160 },
                              height: 120,
                              borderRadius: '4px',
                              objectFit: 'cover',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            }}
                          />
                          <Stack spacing={1} alignItems={{ xs: 'center', sm: 'flex-start' }} sx={{ flex: 1, minWidth: 0 }}>
                            <Chip
                              label="✓ Ready & Optimized with Cloudinary"
                              size="small"
                              sx={{
                                bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5'),
                                color: (t) => (t.palette.mode === 'dark' ? '#6ee7b7' : '#047857'),
                                fontWeight: 700,
                                border: '1px solid',
                                borderColor: (t) => (t.palette.mode === 'dark' ? 'rgba(110, 231, 183, 0.3)' : '#6ee7b7'),
                              }}
                            />
                            {uploadedFileName && (
                              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', wordBreak: 'break-all' }}>
                                {uploadedFileName}
                              </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                              {imageUrl}
                            </Typography>
                            <Stack direction="row" spacing={1.5} sx={{ pt: 0.5 }}>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingImage}
                                sx={{ textTransform: 'none', fontWeight: 700 }}
                              >
                                Replace Photo
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                variant="text"
                                onClick={() => {
                                  setImageUrl('')
                                  setUploadedFileName(null)
                                }}
                                disabled={uploadingImage}
                                sx={{ textTransform: 'none', fontWeight: 700 }}
                              >
                                Remove
                              </Button>
                            </Stack>
                          </Stack>
                        </Stack>
                      </Box>
                    ) : (
                      <Box
                        onDragOver={(e) => {
                          e.preventDefault()
                          setIsDragOver(true)
                        }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault()
                          setIsDragOver(false)
                          const file = e.dataTransfer.files?.[0]
                          if (file) handleFileProcess(file)
                        }}
                        onClick={() => {
                          if (!uploadingImage) fileInputRef.current?.click()
                        }}
                        sx={{
                          p: { xs: 3, sm: 4 },
                          border: '2px dashed',
                          borderColor: isDragOver
                            ? 'primary.main'
                            : (t) => (t.palette.mode === 'dark' ? 'rgba(150, 191, 138, 0.25)' : '#cbd5e1'),
                          bgcolor: (t) =>
                            isDragOver
                              ? t.palette.mode === 'dark'
                                ? 'rgba(150, 191, 138, 0.1)'
                                : '#f0fdf4'
                              : t.palette.mode === 'dark'
                                ? 'rgba(255, 255, 255, 0.02)'
                                : '#ffffff',
                          borderRadius: '6px',
                          textAlign: 'center',
                          cursor: uploadingImage ? 'default' : 'pointer',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            borderColor: uploadingImage ? undefined : 'primary.main',
                            bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc'),
                          },
                        }}
                      >
                        {uploadingImage ? (
                          <Stack spacing={2} alignItems="center" sx={{ py: 2 }}>
                            <CircularProgress size={36} color="primary" />
                            <Typography variant="body1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                              Uploading photo to Cloudinary CDN...
                            </Typography>
                            <Box sx={{ width: '80%', maxWidth: 300 }}>
                              <LinearProgress />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              Optimizing format and quality for county inspectors...
                            </Typography>
                          </Stack>
                        ) : (
                          <Stack spacing={1.5} alignItems="center">
                            <Box
                              sx={{
                                width: 54,
                                height: 54,
                                borderRadius: '50%',
                                bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(150, 191, 138, 0.15)' : '#ecfdf5'),
                                color: 'primary.main',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.8rem',
                              }}
                            >
                              📷
                            </Box>
                            <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                              Click to select photo or drag and drop here
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Supports camera captures, JPG, PNG, WebP up to 10MB
                            </Typography>
                            <Button
                              variant="outlined"
                              size="medium"
                              sx={{ textTransform: 'none', fontWeight: 700, mt: 1, pointerEvents: 'none' }}
                            >
                              Choose Photo from Device
                            </Button>
                          </Stack>
                        )}
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    <TextField
                      label="Direct Image URL"
                      fullWidth
                      value={imageUrl}
                      onChange={(e) => {
                        setImageUrl(e.target.value)
                        if (fieldErrors.imageUrl) setFieldErrors((p) => ({ ...p, imageUrl: undefined }))
                      }}
                      placeholder="https://example.com/photos/road-damage.jpg"
                      error={Boolean(fieldErrors.imageUrl)}
                      helperText={fieldErrors.imageUrl || "Provide a direct public image link documenting the issue"}
                    />
                    {imageUrl && (
                      <Box
                        sx={{
                          p: 2,
                          border: '1px solid #e2e8f0',
                          borderRadius: '4px',
                          textAlign: 'center',
                          bgcolor: '#ffffff',
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
                          sx={{ maxHeight: 200, maxWidth: '100%', borderRadius: '4px', objectFit: 'cover' }}
                        />
                      </Box>
                    )}
                  </Stack>
                )}
              </Box>

              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={submitting}
                sx={{ py: 1.5, fontWeight: 800, fontSize: '1.1rem' }}
              >
                {submitting ? <CircularProgress size={24} color="inherit" /> : 'Submit Request to County Desk'}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
