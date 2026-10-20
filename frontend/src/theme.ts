import { createTheme, type Theme } from '@mui/material'

export function getAppTheme(mode: 'light' | 'dark'): Theme {
  const isDark = mode === 'dark'

  return createTheme({
    palette: {
      mode,
      primary: isDark
        ? {
            main: '#2dd4bf',
            dark: '#14b8a6',
            light: '#5eead4',
            contrastText: '#042f2e',
          }
        : {
            main: '#176b57',
            dark: '#0f483a',
            light: '#238a71',
            contrastText: '#ffffff',
          },
      secondary: isDark
        ? {
            main: '#fbbf24',
            dark: '#d97706',
            light: '#fde68a',
            contrastText: '#451a03',
          }
        : {
            main: '#c27803',
            dark: '#9e5e00',
            light: '#df9420',
            contrastText: '#ffffff',
          },
      background: {
        default: isDark ? '#0b1120' : '#f8fafc',
        paper: isDark ? '#111827' : '#ffffff',
      },
      text: {
        primary: isDark ? '#f8fafc' : '#0f172a',
        secondary: isDark ? '#94a3b8' : '#334155',
      },
      divider: isDark ? '#1e293b' : '#e2e8f0',
    },
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 16,
      h3: {
        fontWeight: 800,
        fontSize: '2.5rem',
        letterSpacing: '-0.02em',
      },
      h4: {
        fontWeight: 800,
        fontSize: '2.1rem',
        letterSpacing: '-0.02em',
      },
      h5: {
        fontWeight: 700,
        fontSize: '1.6rem',
        letterSpacing: '-0.01em',
      },
      h6: {
        fontWeight: 700,
        fontSize: '1.3rem',
      },
      subtitle1: {
        fontSize: '1.15rem',
        fontWeight: 600,
        lineHeight: 1.5,
      },
      subtitle2: {
        fontSize: '1.05rem',
        fontWeight: 600,
        lineHeight: 1.5,
      },
      body1: {
        fontSize: '1.08rem',
        lineHeight: 1.65,
      },
      body2: {
        fontSize: '1rem',
        lineHeight: 1.6,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
        fontSize: '1rem',
      },
      caption: {
        fontSize: '0.9rem',
        lineHeight: 1.5,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow: 'none',
            textTransform: 'none',
            '&:hover': {
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
            boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.04)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  })
}
