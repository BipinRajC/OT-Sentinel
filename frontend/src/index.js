import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './index.css';
import App from './App';
import getTheme from './theme';

const root = ReactDOM.createRoot(document.getElementById('root'));

function ThemedApp() {
  const [mode, setMode] = useState('light');
  const theme = useMemo(() => getTheme(mode), [mode]);

  const toggleTheme = () => {
    setMode(prevMode => prevMode === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App toggleTheme={toggleTheme} mode={mode} />
    </ThemeProvider>
  );
}

root.render(
  <React.StrictMode>
    <ThemedApp />
  </React.StrictMode>
); 