import React, { useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import EnhancedDashboard from './components/EnhancedDashboard';
import getTheme from './theme';
import './App.css';

function App() {
  const [mode, setMode] = useState('dark');
  const theme = getTheme(mode);

  const toggleTheme = () => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    // Apply theme mode to document for CSS variables
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box 
        className="app"
        sx={{ 
          minHeight: '100vh',
          background: theme.palette.background.default,
          position: 'relative',
          overflow: 'hidden',
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
  );
}

export default App;