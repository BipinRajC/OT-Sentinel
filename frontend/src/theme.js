import { createTheme } from '@mui/material/styles';

// Enhanced cybersecurity-themed color palette
const cyberColors = {
  // Primary cyber blue gradient
  primary: {
    main: '#00bcd4',
    light: '#26c6da',
    dark: '#0097a7',
    50: '#e0f7fa',
    100: '#b2ebf2',
    200: '#80deea',
    300: '#4dd0e1',
    400: '#26c6da',
    500: '#00bcd4',
    600: '#00acc1',
    700: '#0097a7',
    800: '#00838f',
    900: '#006064',
    contrastText: '#ffffff',
  },
  
  // Secondary purple gradient
  secondary: {
    main: '#667eea',
    light: '#9fa8ef',
    dark: '#5a6fd8',
    50: '#f3f4fe',
    100: '#e1e5fe',
    200: '#c5cae9',
    300: '#9fa8da',
    400: '#7986cb',
    500: '#667eea',
    600: '#5c6bc0',
    700: '#512da8',
    800: '#4527a0',
    900: '#311b92',
    contrastText: '#ffffff',
  },
  
  // Success gradient
  success: {
    main: '#4caf50',
    light: '#81c784',
    dark: '#388e3c',
    contrastText: '#ffffff',
  },
  
  // Warning gradient
  warning: {
    main: '#ff9800',
    light: '#ffb74d',
    dark: '#f57c00',
    contrastText: '#ffffff',
  },
  
  // Error gradient
  error: {
    main: '#f44336',
    light: '#e57373',
    dark: '#d32f2f',
    contrastText: '#ffffff',
  },
  
  // Info gradient
  info: {
    main: '#2196f3',
    light: '#64b5f6',
    dark: '#1976d2',
    contrastText: '#ffffff',
  },
  
  // Neon accent
  neon: {
    main: '#39ff14',
    light: '#7cff5c',
    dark: '#2eb300',
  },
  
  // Background colors
  background: {
    default: '#0a0e27',
    paper: 'rgba(26, 31, 58, 0.9)',
    secondary: '#1a1f3a',
    tertiary: '#2a2f5a',
    glass: 'rgba(255, 255, 255, 0.05)',
  },
  
  // Text colors
  text: {
    primary: '#ffffff',
    secondary: '#b0bec5',
    disabled: '#78909c',
    hint: '#607d8b',
  },
  
  // Divider colors
  divider: 'rgba(255, 255, 255, 0.1)',
  
  // Border colors
  border: {
    primary: '#3a4374',
    secondary: 'rgba(255, 255, 255, 0.1)',
  },
};

// Gradient definitions
const gradients = {
  primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  secondary: 'linear-gradient(135deg, #00bcd4 0%, #0288d1 100%)',
  danger: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)',
  success: 'linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%)',
  warning: 'linear-gradient(135deg, #ff9a56 0%, #ffad56 100%)',
  info: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
  dark: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
  glass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
};

// Shadow definitions
const shadows = {
  sm: '0 2px 8px rgba(0, 0, 0, 0.1)',
  md: '0 4px 16px rgba(0, 0, 0, 0.2)',
  lg: '0 8px 32px rgba(0, 0, 0, 0.3)',
  glow: '0 0 20px rgba(0, 188, 212, 0.3)',
  glowHover: '0 0 30px rgba(0, 188, 212, 0.5)',
};

const getTheme = (mode = 'dark') => {
  return createTheme({
    palette: {
      mode: 'dark', // Force dark mode for cybersecurity theme
      primary: cyberColors.primary,
      secondary: cyberColors.secondary,
      error: cyberColors.error,
      warning: cyberColors.warning,
      info: cyberColors.info,
      success: cyberColors.success,
      background: cyberColors.background,
      text: cyberColors.text,
      divider: cyberColors.divider,
      // Custom colors
      gradients,
      shadows,
      cyber: cyberColors,
    },
    
    shape: {
      borderRadius: 12,
    },
    
    spacing: 8,
    
    typography: {
      fontFamily: [
        'Inter',
        'Roboto',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
      
      fontFamilyMono: [
        'JetBrains Mono',
        'Fira Code',
        'Monaco',
        'Consolas',
        'monospace',
      ].join(','),
      
      h1: {
        fontSize: '2.5rem',
        fontWeight: 700,
        background: gradients.secondary,
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        lineHeight: 1.2,
      },
      
      h2: {
        fontSize: '2rem',
        fontWeight: 600,
        color: cyberColors.text.primary,
        lineHeight: 1.3,
      },
      
      h3: {
        fontSize: '1.75rem',
        fontWeight: 600,
        color: cyberColors.text.primary,
        lineHeight: 1.3,
      },
      
      h4: {
        fontSize: '1.5rem',
        fontWeight: 600,
        color: cyberColors.text.primary,
        lineHeight: 1.4,
      },
      
      h5: {
        fontSize: '1.25rem',
        fontWeight: 600,
        color: cyberColors.text.primary,
        lineHeight: 1.4,
      },
      
      h6: {
        fontSize: '1rem',
        fontWeight: 600,
        color: cyberColors.text.primary,
        lineHeight: 1.4,
      },
      
      body1: {
        fontSize: '1rem',
        lineHeight: 1.6,
        color: cyberColors.text.primary,
      },
      
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.6,
        color: cyberColors.text.secondary,
      },
      
      button: {
        textTransform: 'none',
        fontWeight: 600,
        fontSize: '0.875rem',
      },
      
      caption: {
        fontSize: '0.75rem',
        color: cyberColors.text.secondary,
      },
    },
    
    components: {
      // Global overrides
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            background: cyberColors.background.default,
            '&::-webkit-scrollbar': {
              width: 8,
            },
            '&::-webkit-scrollbar-track': {
              background: cyberColors.background.secondary,
              borderRadius: 4,
            },
            '&::-webkit-scrollbar-thumb': {
              background: gradients.secondary,
              borderRadius: 4,
              '&:hover': {
                background: 'linear-gradient(135deg, #0288d1 0%, #01579b 100%)',
              },
            },
          },
        },
      },
      
      // Button components
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '10px 20px',
            textTransform: 'none',
            fontWeight: 600,
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
              transition: 'left 0.5s ease',
            },
            '&:hover::before': {
              left: '100%',
            },
          },
          containedPrimary: {
            background: gradients.secondary,
            color: '#ffffff',
            '&:hover': {
              background: gradients.secondary,
              transform: 'translateY(-2px)',
              boxShadow: shadows.glowHover,
            },
          },
          containedSecondary: {
            background: gradients.primary,
            color: '#ffffff',
            '&:hover': {
              background: gradients.primary,
              transform: 'translateY(-2px)',
              boxShadow: shadows.glow,
            },
          },
          outlinedPrimary: {
            borderColor: cyberColors.primary.main,
            color: cyberColors.primary.main,
            '&:hover': {
              backgroundColor: 'rgba(0, 188, 212, 0.1)',
              borderColor: cyberColors.primary.light,
              boxShadow: shadows.glow,
            },
          },
        },
      },
      
      // Card components
      MuiCard: {
        styleOverrides: {
          root: {
            background: cyberColors.background.paper,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${cyberColors.border.secondary}`,
            borderRadius: 12,
            boxShadow: shadows.md,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: 1,
              background: 'linear-gradient(90deg, transparent, #00bcd4, transparent)',
              opacity: 0.5,
            },
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: shadows.lg,
              borderColor: cyberColors.primary.main,
            },
          },
        },
      },
      
      // Paper components
      MuiPaper: {
        styleOverrides: {
          root: {
            background: cyberColors.background.paper,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${cyberColors.border.secondary}`,
            borderRadius: 12,
            boxShadow: shadows.md,
          },
          elevation1: {
            boxShadow: shadows.sm,
          },
          elevation2: {
            boxShadow: shadows.md,
          },
          elevation3: {
            boxShadow: shadows.lg,
          },
        },
      },
      
      // AppBar components
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: gradients.dark,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${cyberColors.border.secondary}`,
            boxShadow: shadows.md,
          },
        },
      },
      
      // Tab components
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            color: cyberColors.text.secondary,
            transition: 'all 0.3s ease',
            '&:hover': {
              color: cyberColors.primary.main,
              transform: 'translateY(-1px)',
            },
            '&.Mui-selected': {
              color: cyberColors.primary.main,
              textShadow: `0 0 10px ${cyberColors.primary.main}`,
            },
          },
        },
      },
      
      // Tabs indicator
      MuiTabs: {
        styleOverrides: {
          indicator: {
            background: gradients.secondary,
            height: 3,
            borderRadius: '3px 3px 0 0',
            boxShadow: shadows.glow,
          },
        },
      },
      
      // Chip components
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            fontWeight: 600,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          },
          filled: {
            background: gradients.secondary,
            color: '#ffffff',
            boxShadow: shadows.glow,
          },
          outlined: {
            borderColor: cyberColors.primary.main,
            color: cyberColors.primary.main,
            '&:hover': {
              backgroundColor: 'rgba(0, 188, 212, 0.1)',
              boxShadow: shadows.glow,
            },
          },
        },
      },
      
      // TextField components
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 8,
              '& fieldset': {
                borderColor: cyberColors.border.primary,
              },
              '&:hover fieldset': {
                borderColor: cyberColors.primary.main,
              },
              '&.Mui-focused fieldset': {
                borderColor: cyberColors.primary.main,
                boxShadow: shadows.glow,
              },
            },
            '& .MuiInputLabel-root': {
              color: cyberColors.text.secondary,
              '&.Mui-focused': {
                color: cyberColors.primary.main,
              },
            },
          },
        },
      },
      
      // Menu components
      MuiMenu: {
        styleOverrides: {
          paper: {
            background: cyberColors.background.paper,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${cyberColors.border.secondary}`,
            borderRadius: 12,
            boxShadow: shadows.lg,
          },
        },
      },
      
      // MenuItem components
      MuiMenuItem: {
        styleOverrides: {
          root: {
            color: cyberColors.text.primary,
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: 'rgba(0, 188, 212, 0.1)',
              color: cyberColors.primary.main,
              transform: 'translateX(4px)',
            },
          },
        },
      },
      
      // Dialog components
      MuiDialog: {
        styleOverrides: {
          paper: {
            background: cyberColors.background.paper,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${cyberColors.border.secondary}`,
            borderRadius: 16,
            boxShadow: shadows.lg,
          },
        },
      },
      
      // Tooltip components
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            background: cyberColors.background.secondary,
            color: cyberColors.text.primary,
            fontSize: '0.75rem',
            borderRadius: 8,
            boxShadow: shadows.md,
            border: `1px solid ${cyberColors.border.secondary}`,
          },
          arrow: {
            color: cyberColors.background.secondary,
          },
        },
      },
      
      // Table components
      MuiTableContainer: {
        styleOverrides: {
          root: {
            background: cyberColors.background.paper,
            borderRadius: 12,
            border: `1px solid ${cyberColors.border.secondary}`,
          },
        },
      },
      
      MuiTableHead: {
        styleOverrides: {
          root: {
            background: 'rgba(0, 188, 212, 0.1)',
          },
        },
      },
      
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: cyberColors.border.primary,
            color: cyberColors.text.primary,
          },
          head: {
            fontWeight: 600,
            color: cyberColors.primary.main,
            textTransform: 'uppercase',
            fontSize: '0.75rem',
            letterSpacing: '1px',
          },
        },
      },
      
      // Linear Progress
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            backgroundColor: cyberColors.background.secondary,
          },
          bar: {
            background: gradients.secondary,
            borderRadius: 4,
          },
        },
      },
      
      // Circular Progress
      MuiCircularProgress: {
        styleOverrides: {
          root: {
            color: cyberColors.primary.main,
          },
          circle: {
            strokeLinecap: 'round',
          },
        },
      },
    },
    
    // Custom breakpoints
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 960,
        lg: 1280,
        xl: 1920,
      },
    },
  });
};

export default getTheme; 