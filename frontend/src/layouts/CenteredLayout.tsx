import type { ReactNode } from 'react'
import { Box, Container } from '@mui/material'

type CenteredLayoutProps = {
  children: ReactNode
}

function CenteredLayout({ children }: CenteredLayoutProps) {
  return (
    <Box
      component="main"
      sx={{
        alignItems: 'center',
        display: 'flex',
        minHeight: '100vh',
        py: 4,
      }}
    >
      <Container maxWidth="sm">{children}</Container>
    </Box>
  )
}

export default CenteredLayout
