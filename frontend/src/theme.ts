import { createTheme, type Theme } from '@mui/material'

export function getAppTheme(mode: 'light' | 'dark'): Theme {
  const isDark = mode === 'dark'

  return createTheme({
    palette: {
      mode,
      primary: isDark
        ? {
            main: '#96BF8A',
            dark: '#00412E',
            light: '#B5D6AB',
            contrastText: '#00261A',
          }
        : {
            main: '#00412E', // Brand Primary Dark Green
            dark: '#002C1F',
            light: '#1B5E4A',
            contrastText: '#FFFFFF',
          },
      secondary: isDark
        ? {
            main: '#96BF8A',
            dark: '#6F9864',
            light: '#C4E2BB',
            contrastText: '#00261A',
          }
        : {
            main: '#96BF8A', // Brand Secondary Light Green
            dark: '#739D67',
            light: '#B2D4A8',
            contrastText: '#002B1E',
          },
      background: {
        default: isDark ? '#081712' : '#E8EAE5', // Brand Background Canvas
        paper: isDark ? '#0F261E' : '#FFFFFF',   // Brand Surface/Cards
      },
      text: {
        primary: isDark ? '#F1F5F3' : '#0B1C16',
        secondary: isDark ? '#9EB3A9' : '#455A52',
      },
      divider: isDark ? 'rgba(150, 191, 138, 0.15)' : 'rgba(0, 65, 46, 0.12)',
      warning: {
        main: '#D97706',
        light: '#FEF3C7',
        dark: '#B45309',
        contrastText: '#78350F',
      },
      info: {
        main: '#00412E',
        light: '#E6F0EB',
        dark: '#002C1F',
        contrastText: '#FFFFFF',
      },
      success: {
        main: '#15803D',
        light: '#DCFCE7',
        dark: '#166534',
        contrastText: '#FFFFFF',
      },
      error: {
        main: '#DC2626',
        light: '#FEE2E2',
        dark: '#991B1B',
        contrastText: '#FFFFFF',
      },
    },
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 15,
      h3: {
        fontWeight: 800,
        fontSize: '2.3rem',
        letterSpacing: '-0.02em',
      },
      h4: {
        fontWeight: 800,
        fontSize: '1.9rem',
        letterSpacing: '-0.02em',
      },
      h5: {
        fontWeight: 700,
        fontSize: '1.5rem',
        letterSpacing: '-0.01em',
      },
      h6: {
        fontWeight: 700,
        fontSize: '1.2rem',
      },
      subtitle1: {
        fontSize: '1.05rem',
        fontWeight: 600,
        lineHeight: 1.5,
      },
      subtitle2: {
        fontSize: '0.95rem',
        fontWeight: 600,
        lineHeight: 1.5,
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.6,
      },
      body2: {
        fontSize: '0.92rem',
        lineHeight: 1.55,
      },
      button: {
        textTransform: 'none',
        fontWeight: 700,
        fontSize: '0.95rem',
      },
      caption: {
        fontSize: '0.82rem',
        lineHeight: 1.4,
      },
    },
    shape: {
      borderRadius: 4,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            boxShadow: 'none',
            textTransform: 'none',
            fontWeight: 700,
            transition: 'all 0.18s ease-in-out',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0, 65, 46, 0.18)',
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
          },
          containedPrimary: {
            backgroundColor: isDark ? '#96BF8A' : '#00412E',
            color: isDark ? '#00261A' : '#FFFFFF',
            '&:hover': {
              backgroundColor: isDark ? '#B5D6AB' : '#002C1F',
            },
          },
          containedSecondary: {
            backgroundColor: '#96BF8A',
            color: '#002B1E',
            '&:hover': {
              backgroundColor: '#82AB76',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            backgroundColor: isDark ? '#0F261E' : '#FFFFFF',
            border: `1px solid ${isDark ? 'rgba(150, 191, 138, 0.12)' : 'rgba(0, 65, 46, 0.08)'}`,
            boxShadow: isDark
              ? '0 4px 14px rgba(0, 0, 0, 0.35)'
              : '0 2px 10px rgba(0, 65, 46, 0.04)',
            transition: 'box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            backgroundImage: 'none',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 4,
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 4,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            fontWeight: 700,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 4,
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
              '& fieldset': {
                borderColor: isDark ? 'rgba(150, 191, 138, 0.2)' : 'rgba(0, 65, 46, 0.16)',
              },
              '&:hover fieldset': {
                borderColor: isDark ? '#96BF8A' : '#00412E',
              },
              '&.Mui-focused fieldset': {
                borderColor: isDark ? '#96BF8A' : '#00412E',
                borderWidth: '2px',
              },
            },
          },
        },
      },
    },
  })
}

