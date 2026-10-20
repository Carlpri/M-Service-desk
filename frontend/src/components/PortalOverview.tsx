import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material'

type PortalOverviewProps = {
  onNavigateToSubmit: () => void
  onNavigateToTrack: () => void
  onOpenAuth: () => void
  isAuthenticated: boolean
}

const countyServices = [
  {
    title: 'Roads & Infrastructure',
    description: 'Pothole repairs, feeder roads, grading, bridge maintenance, and drainage clearing.',
    icon: '🛣️',
  },
  {
    title: 'Water & Sanitation',
    description: 'Boreholes, piped water supply, sewerage management, and pipeline burst repairs.',
    icon: '💧',
  },
  {
    title: 'Waste Management',
    description: 'Solid waste collection, market cleanliness, dumpsite maintenance, and litter control.',
    icon: '♻️',
  },
  {
    title: 'Public Health',
    description: 'County dispensaries, clinic facilities, food hygiene inspection, and vector control.',
    icon: '🏥',
  },
  {
    title: 'Street Lighting & Energy',
    description: 'Solar streetlights, security high-masts, transformer issues, and market floodlights.',
    icon: '💡',
  },
  {
    title: 'Agriculture & Livestock',
    description: 'Extension services, veterinary clinics, subsidized inputs, and irrigation support.',
    icon: '🌱',
  },
]

export default function PortalOverview({
  onNavigateToSubmit,
  onNavigateToTrack,
  onOpenAuth,
  isAuthenticated,
}: PortalOverviewProps) {
  return (
    <Box sx={{ py: 3, width: '100%' }}>
      {/* Hero Banner spanning full width */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 4, sm: 6, md: 7 },
          borderRadius: '4px',
          background: 'linear-gradient(135deg, #00412E 0%, #00261A 100%)',
          color: '#ffffff',
          mb: 5,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 30px rgba(0, 65, 46, 0.22)',
        }}
      >
        <Stack spacing={3} sx={{ position: 'relative', zIndex: 1, maxWidth: 1100 }}>
          <Box
            sx={{
              display: 'inline-block',
              bgcolor: 'rgba(150, 191, 138, 0.2)',
              color: '#96BF8A',
              px: 2,
              py: 0.8,
              borderRadius: '4px',
              width: 'fit-content',
              fontSize: '0.95rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              border: '1px solid rgba(150, 191, 138, 0.3)',
            }}
          >
            COUNTY GOVERNMENT OF MURANG'A
          </Box>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 900,
              fontSize: { xs: '2.2rem', sm: '2.8rem', md: '3.4rem' },
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
            }}
          >
            Public Service Desk & Citizen Request Portal
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'rgba(255,255,255,0.92)',
              fontSize: { xs: '1.15rem', md: '1.35rem' },
              lineHeight: 1.6,
              maxWidth: 950,
            }}
          >
            Empowering citizens across Murang'a County to report public service breakdowns, request county department interventions, and track government resolutions in real time.
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} sx={{ pt: 1.5 }}>
            <Button
              variant="contained"
              size="large"
              onClick={isAuthenticated ? onNavigateToSubmit : onOpenAuth}
              sx={{
                bgcolor: '#96BF8A',
                color: '#00261A',
                fontWeight: 800,
                fontSize: '1.15rem',
                py: 1.6,
                px: 4.5,
                borderRadius: '4px',
                '&:hover': { bgcolor: '#B5D6AB', transform: 'translateY(-1px)' },
              }}
            >
              Submit Service Request
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={isAuthenticated ? onNavigateToTrack : onOpenAuth}
              sx={{
                borderColor: 'rgba(255,255,255,0.7)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '1.15rem',
                py: 1.6,
                px: 4.5,
                borderWidth: '2px',
                borderRadius: '4px',
                '&:hover': { borderColor: '#ffffff', bgcolor: 'rgba(255,255,255,0.12)', borderWidth: '2px' },
              }}
            >
              Track Request Status
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* How it Works Workflow */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, fontSize: '1.75rem', color: 'text.primary' }}>
          How M-Service Desk Works
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3.5, fontSize: '1.15rem' }}>
          Transparent, accountable public service delivery in four straightforward steps.
        </Typography>

        <Grid container spacing={3}>
          {[
            { step: '01', title: 'Submit Request', desc: 'Describe the issue, specify your Ward or Sub-County, and upload optional photographic evidence.' },
            { step: '02', title: 'Unique Reference', desc: 'Receive an instant collision-safe tracking number (e.g. MSD-20261017-XXXXX).' },
            { step: '03', title: 'County Action', desc: 'Relevant county departments review, dispatch field crews, and conduct on-site repairs.' },
            { step: '04', title: 'Transparent Resolution', desc: 'Track live progress from Pending to In Progress to Resolved with official county notes.' },
          ].map((item) => (
            <Grid key={item.step} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ height: '100%', p: 2, bgcolor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <CardContent sx={{ p: 1 }}>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 900,
                      color: 'primary.main',
                      fontSize: '2.4rem',
                      mb: 1,
                    }}
                  >
                    {item.step}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, fontSize: '1.25rem', color: 'text.primary' }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '1.02rem', lineHeight: 1.6 }}>
                    {item.desc}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* County Services Grid */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, fontSize: '1.75rem', color: 'text.primary' }}>
          County Public Service Sectors
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3.5, fontSize: '1.15rem' }}>
          Select a sector to file a report directly with the responsible sub-county department.
        </Typography>

        <Grid container spacing={3}>
          {countyServices.map((service) => (
            <Grid key={service.title} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  p: 2,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                    borderColor: 'primary.light',
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, p: 1 }}>
                  <Box sx={{ fontSize: '2.8rem', mb: 1.5 }}>{service.icon}</Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, fontSize: '1.3rem', color: 'text.primary' }}>
                    {service.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '1.05rem', lineHeight: 1.6 }}>
                    {service.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  )
}
