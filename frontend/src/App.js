import React, { useState } from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { getTheme } from './theme';
import EnhancedDashboard from './components/EnhancedDashboard';
import './App.css';

// Global Error Boundary Component
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: '#020508',
            color: '#ffffff',
            p: 3,
            textAlign: 'center'
          }}
        >
          <h1 style={{ color: '#00ffff', marginBottom: '1rem', fontSize: '2rem' }}>
            🛡️ OT-Sentinel Security Dashboard
          </h1>
          <h2 style={{ color: '#ff1744', marginBottom: '1rem' }}>
            System Error Detected
          </h2>
          <p style={{ marginBottom: '2rem', fontSize: '1.1rem', maxWidth: '600px' }}>
            The security dashboard encountered an unexpected error. This could be due to a network issue or a temporary system problem.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#00ffff',
              color: '#000000',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            🔄 Reload Dashboard
          </button>
          <details style={{ marginTop: '2rem', fontSize: '0.9rem' }}>
            <summary style={{ cursor: 'pointer', color: '#00e5ff' }}>
              Technical Details (Click to expand)
            </summary>
            <pre style={{ 
              textAlign: 'left', 
              backgroundColor: 'rgba(255,255,255,0.1)', 
              padding: '1rem', 
              borderRadius: '4px',
              marginTop: '1rem',
              overflow: 'auto',
              maxWidth: '800px'
            }}>
              {this.state.error && this.state.error.toString()}
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </details>
        </Box>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [mode, setMode] = useState('dark'); // Force dark mode for cybersecurity theme
  
  const theme = getTheme(mode);

  const toggleTheme = () => {
    // Keep dark mode for cybersecurity theme - just visual feedback
    console.log('Theme toggle requested - maintaining dark cybersecurity theme');
  };

  return (
    <AppErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box 
          className="app"
          sx={{ 
            minHeight: '100vh',
            background: theme.palette.background.default,
          }}
        >
          {/* Background gradient overlay */}
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 
                'radial-gradient(circle at 20% 80%, rgba(0, 188, 212, 0.1) 0%, transparent 50%), ' +
                'radial-gradient(circle at 80% 20%, rgba(103, 126, 234, 0.1) 0%, transparent 50%), ' +
                'radial-gradient(circle at 40% 40%, rgba(255, 152, 0, 0.05) 0%, transparent 50%)',
              pointerEvents: 'none',
              zIndex: -1,
            }}
          />
          
          {/* Matrix-style background grid */}
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 
                'repeating-linear-gradient(' +
                  '90deg, ' +
                  'transparent, ' +
                  'transparent 98px, ' +
                  'rgba(0, 188, 212, 0.02) 100px' +
                '), ' +
                'repeating-linear-gradient(' +
                  '0deg, ' +
                  'transparent, ' +
                  'transparent 98px, ' +
                  'rgba(0, 188, 212, 0.02) 100px' +
                ')',
              pointerEvents: 'none',
              zIndex: -1,
            }}
          />
          
          <EnhancedDashboard toggleTheme={toggleTheme} mode={mode} />
        </Box>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}

export default App;