import { Box, Paper, Stack, Typography } from '@mui/material'
import FoundationStatus from '../components/FoundationStatus'
import CenteredLayout from '../layouts/CenteredLayout'

function FoundationPage() {
  return (
    <CenteredLayout>
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: { xs: 4, sm: 6 } }}>
        <Stack alignItems="flex-start" spacing={3}>
          <FoundationStatus />
          <Box>
            <Typography component="h1" gutterBottom variant="h3">
              M-Service Desk
            </Typography>
            <Typography color="text.secondary" variant="h6">
              Murang'a County Public Service Request System
            </Typography>
          </Box>
          <Typography color="text.secondary" variant="body1">
            The application foundation is in place. Public service request features are coming in a later phase.
          </Typography>
        </Stack>
      </Paper>
    </CenteredLayout>
  )
}

export default FoundationPage
