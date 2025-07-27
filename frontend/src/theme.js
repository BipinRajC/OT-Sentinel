import { createTheme } from '@mui/material/styles';

// Enhanced cybersecurity-themed color palette with darker backgrounds and brighter accents
const cyberColors = {
  // Primary cyber blue gradient - more vibrant
  primary: {
    main: '#00ffff',
    light: '#4dffff',
    dark: '#00e5ff',
    50: '#e0ffff',
    100: '#b3ffff',
    200: '#80ffff',
    300: '#4dffff',
    400: '#1affff',
    500: '#00ffff',
    600: '#00e5ff',
    700: '#00bcd4',
    800: '#0091ea',
    900: '#006064',
    contrastText: '#000000',
  },
  
  // Secondary purple gradient - more vibrant
  secondary: {
    main: '#7c4dff',
    light: '#b388ff',
    dark: '#651fff',
    50: '#f3f4fe',
    100: '#e1e5fe',
    200: '#c5cae9',
    300: '#9fa8da',
    400: '#7986cb',
    500: '#7c4dff',
    600: '#651fff',
    700: '#6200ea',
    800: '#4527a0',
    900: '#311b92',
    contrastText: '#ffffff',
  },
  
  // Success gradient - brighter green
  success: {
    main: '#00e676',
    light: '#66ffa6',
    dark: '#00c853',
    contrastText: '#000000',
  },
  
  // Warning gradient - brighter orange
  warning: {
    main: '#ffab00',
    light: '#ffdd71',
    dark: '#ff6f00',
    contrastText: '#000000',
  },
  
  // Error gradient - brighter red
  error: {
    main: '#ff1744',
    light: '#ff6b7a',
    dark: '#d50000',
    contrastText: '#ffffff',
  },
  
  // Info gradient - brighter blue
  info: {
    main: '#00e5ff',
    light: '#62efff',
    dark: '#00b2ff',
    contrastText: '#000000',
  },
  
  // Neon accent - super bright
  neon: {
    main: '#39ff14',
    light: '#7cff5c',
    dark: '#2eb300',
  },
  
  // Background colors - much darker
  background: {
    default: '#020508',
    paper: 'rgba(10, 15, 26, 0.95)',
    secondary: '#0a0f1a',
    tertiary: '#0f1322',
    glass: 'rgba(0, 255, 255, 0.08)',
  },
  
  // Text colors - higher contrast
  text: {
    primary: '#ffffff',
    secondary: '#e0e6ed',
    disabled: '#b3bac1',
    hint: '#9ca3af',
  },
  
  // Divider colors - more visible
  divider: 'rgba(0, 255, 255, 0.25)',
  
  // Border colors - more visible
  border: {
    primary: 'rgba(0, 255, 255, 0.3)',
    secondary: 'rgba(255, 255, 255, 0.1)',
  },
  
  // Enhanced gradients for backgrounds
  gradients: {
    primary: 'linear-gradient(135deg, rgba(0, 255, 255, 0.1) 0%, rgba(124, 77, 255, 0.1) 100%)',
    secondary: 'linear-gradient(135deg, rgba(124, 77, 255, 0.1) 0%, rgba(0, 229, 255, 0.1) 100%)',
    success: 'linear-gradient(135deg, rgba(0, 230, 118, 0.1) 0%, rgba(57, 255, 20, 0.1) 100%)',
    warning: 'linear-gradient(135deg, rgba(255, 171, 0, 0.1) 0%, rgba(255, 111, 0, 0.1) 100%)',
    error: 'linear-gradient(135deg, rgba(255, 23, 68, 0.1) 0%, rgba(213, 0, 0, 0.1) 100%)',
    dark: 'linear-gradient(135deg, rgba(2, 5, 8, 0.95) 0%, rgba(10, 15, 26, 0.95) 100%)',
  },
};

// Shadow definitions - enhanced for darker theme
const shadows = {
  sm: '0 2px 8px rgba(0, 0, 0, 0.3)',
  md: '0 4px 16px rgba(0, 0, 0, 0.4)',
  lg: '0 8px 32px rgba(0, 0, 0, 0.6)',
  glow: '0 0 20px rgba(0, 255, 255, 0.4)',
  glowHover: '0 0 30px rgba(0, 255, 255, 0.6)',
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
      gradients: cyberColors.gradients,
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
        fontSize: '3rem', // Increased from 2.5rem
        fontWeight: 700,
        background: cyberColors.gradients.secondary,
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        lineHeight: 1.2,
      },
      
      h2: {
        fontSize: '2.25rem', // Increased from 2rem
        fontWeight: 600,
        color: cyberColors.text.primary,
        lineHeight: 1.3,
      },
      
      h3: {
        fontSize: '2rem', // Increased from 1.75rem
        fontWeight: 600,
        color: cyberColors.text.primary,
        lineHeight: 1.3,
      },
      
      h4: {
        fontSize: '1.75rem', // Increased from 1.5rem
        fontWeight: 600,
        color: cyberColors.text.primary,
        lineHeight: 1.4,
      },
      
      h5: {
        fontSize: '1.5rem', // Increased from 1.25rem
        fontWeight: 600,
        color: cyberColors.text.primary,
        lineHeight: 1.4,
      },
      
      h6: {
        fontSize: '1.25rem', // Increased from 1rem
        fontWeight: 600,
        color: cyberColors.text.primary,
        lineHeight: 1.4,
      },
      
      body1: {
        fontSize: '1.125rem', // Increased from 1rem
        lineHeight: 1.6,
        color: cyberColors.text.primary,
        fontWeight: 400,
      },
      
      body2: {
        fontSize: '1rem', // Increased from 0.875rem
        lineHeight: 1.6,
        color: cyberColors.text.secondary,
        fontWeight: 400,
      },
      
      button: {
        textTransform: 'none',
        fontWeight: 600,
        fontSize: '1rem', // Increased from 0.875rem
        letterSpacing: '0.02em',
      },
      
      caption: {
        fontSize: '0.875rem', // Increased from 0.75rem
        color: cyberColors.text.secondary,
        lineHeight: 1.5,
      },
      
      subtitle1: {
        fontSize: '1.125rem',
        fontWeight: 500,
        color: cyberColors.text.primary,
        lineHeight: 1.5,
      },
      
      subtitle2: {
        fontSize: '1rem',
        fontWeight: 500,
        color: cyberColors.text.secondary,
        lineHeight: 1.5,
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
              background: cyberColors.gradients.secondary,
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
            background: cyberColors.gradients.secondary,
            color: '#ffffff',
            '&:hover': {
              background: cyberColors.gradients.secondary,
              transform: 'translateY(-2px)',
              boxShadow: shadows.glowHover,
            },
          },
          containedSecondary: {
            background: cyberColors.gradients.primary,
            color: '#ffffff',
            '&:hover': {
              background: cyberColors.gradients.primary,
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
            background: cyberColors.gradients.dark,
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
            background: cyberColors.gradients.secondary,
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
            background: cyberColors.gradients.secondary,
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
            background: cyberColors.gradients.secondary,
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

// Export both named and default for flexibility
export { getTheme };
export default getTheme; 