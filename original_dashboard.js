import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Grid, 
  Button, 
  Card, 
  CardContent, 
  Typography, 
  Chip,
  Box,
  CircularProgress,
  Alert,
  IconButton,
  AppBar,
  Toolbar,
  useTheme,
  Paper
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Timeline as TimelineIcon, 
  Security as SecurityIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Dashboard as DashboardIcon,
  Shield as ShieldIcon
} from '@mui/icons-material';
import NetworkMap from './visualization/NetworkMap';
import AlertPanel from './AlertPanel';
import DeviceList from './DeviceList';
import TrafficChart from './visualization/TrafficChart';
import SecurityTrends from './visualization/SecurityTrends';
import DeviceHealthStatus from './DeviceHealthStatus';
import ARFFDataViewer from './ARFFDataViewer';
import api from '../services/api';
import './Dashboard.css';

/**
 * Enhanced main dashboard component for the ICS Security Monitoring System
 */
function Dashboard({ toggleTheme, mode }) {
  const theme = useTheme();
  
  // State variables
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [networkData, setNetworkData] = useState({ devices: [], connections: [] });
  const [trafficData, setTrafficData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    deviceCount: 0,
    alertCount: 0,
    criticalAlerts: 0,
    protocolStats: {}
  });
  const [timeRange] = useState('weekly');
  
  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch devices
        const devicesResponse = await api.getDevices();
        setDevices(devicesResponse);
        
        // Fetch alerts
        const alertsResponse = await api.getAlerts();
        setAlerts(alertsResponse);
        
        // Fetch network map
        const networkMapResponse = await api.getNetworkMap();
        setNetworkData(networkMapResponse);
        
        // Fetch traffic data
        const trafficResponse = await api.getTrafficVolume();
        setTrafficData(trafficResponse);
        
        // Fetch protocol stats
        const protocolStatsResponse = await api.getProtocolStats();
        
        // Compute statistics
        setStats({
          deviceCount: devicesResponse.length,
          alertCount: alertsResponse.length,
          criticalAlerts: alertsResponse.filter(alert => alert.severity === 'critical').length,
          protocolStats: protocolStatsResponse
        });
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load dashboard data. Please try again.");
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Set up WebSocket for real-time updates
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//localhost:8000/ws`;
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('WebSocket connection established');
      setError(null);
    };
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('WebSocket message received:', data);
      
      if (data.type === 'initial_data') {
        if (data.devices) setDevices(data.devices);
        if (data.alerts) setAlerts(data.alerts);
      } else if (data.type === 'device_created') {
        setDevices(prev => [...prev, data.device]);
        setStats(prev => ({ ...prev, deviceCount: prev.deviceCount + 1 }));
      } else if (data.type === 'device_status_changed') {
        setDevices(prev => prev.map(device => 
          device.id === data.device_id 
            ? { ...device, is_online: data.is_online, last_seen: data.timestamp }
            : device
        ));
      } else if (data.type === 'new_alert') {
        setAlerts(prev => [data.alert, ...prev.slice(0, 49)]);
        
        setStats(prev => ({
          ...prev,
          alertCount: prev.alertCount + 1,
          criticalAlerts: data.alert.severity === 'critical' 
            ? prev.criticalAlerts + 1 
            : prev.criticalAlerts
        }));
        
        if (data.alert.severity === 'critical') {
          console.warn('CRITICAL ALERT:', data.alert.description);
        }
      } else if (data.type === 'risk_score_updated') {
        setDevices(prev => prev.map(device => 
          device.id === data.device_id 
            ? { ...device, risk_score: data.risk_score }
            : device
        ));
      } else if (data.type === 'traffic_update') {
        fetchTrafficData();
      }
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Real-time connection error. Some data may not update automatically.');
    };
    
    socket.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      if (event.code !== 1000) {
        setError('Lost connection to server. Attempting to reconnect...');
        setTimeout(() => {
          fetchData();
        }, 5000);
      }
    };
    
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, []);
  
  const fetchTrafficData = async () => {
    try {
      const trafficResponse = await api.getTrafficVolume();
      setTrafficData(trafficResponse);
    } catch (err) {
      console.error("Error fetching traffic data:", err);
    }
  };
  
  const handleAcknowledgeAlert = async (alertId) => {
    try {
      await api.acknowledgeAlert(alertId);
      
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, acknowledged: true }
            : alert
        )
      );
    } catch (err) {
      console.error("Error acknowledging alert:", err);
    }
  };
  
  const handleScanNetwork = async () => {
    try {
      await api.scanNetwork();
      
      setTimeout(async () => {
        const devicesResponse = await api.getDevices();
        setDevices(devicesResponse);
        setStats(prev => ({ ...prev, deviceCount: devicesResponse.length }));
      }, 2000);
    } catch (err) {
      console.error("Error scanning network:", err);
    }
  };
  
  const handleAnalyzeTraffic = async () => {
    try {
      await api.analyzeTraffic();
      
      setTimeout(async () => {
        const trafficResponse = await api.getTrafficVolume();
        setTrafficData(trafficResponse);
      }, 1000);
    } catch (err) {
      console.error("Error analyzing traffic:", err);
    }
  };

  // Loading state with enhanced spinner
  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        sx={{
          background: theme.palette.background.default,
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 50%, rgba(0, 188, 212, 0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }
        }}
      >
        <Box textAlign="center">
          <CircularProgress 
            size={60} 
            thickness={4}
            sx={{
              color: theme.palette.primary.main,
              filter: 'drop-shadow(0 0 10px currentColor)',
              mb: 2
            }}
          />
          <Typography 
            variant="h6" 
            sx={{ 
              color: theme.palette.text.secondary,
              fontWeight: 600,
              letterSpacing: '1px'
            }}
          >
            Loading Security Dashboard...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: theme.palette.background.default,
      position: 'relative'
    }}>
      {/* Enhanced Header */}
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${theme.palette.divider}`,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        }}
      >
        <Toolbar sx={{ py: 1 }}>
          <Box display="flex" alignItems="center" flexGrow={1}>
            <ShieldIcon 
              sx={{ 
                mr: 2, 
                fontSize: 32,
                color: theme.palette.primary.main,
                filter: 'drop-shadow(0 0 10px currentColor)'
              }} 
            />
            <Typography 
              variant="h4" 
              component="h1"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #00bcd4 0%, #0288d1 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 0 20px rgba(0, 188, 212, 0.3)',
              }}
            >
              OT Security Monitor
            </Typography>
          </Box>
          
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<SearchIcon />}
              onClick={handleScanNetwork}
              sx={{
                borderColor: theme.palette.primary.main,
                color: theme.palette.primary.main,
                '&:hover': {
                  backgroundColor: 'rgba(0, 188, 212, 0.1)',
                  borderColor: theme.palette.primary.light,
                  transform: 'translateY(-2px)',
                  boxShadow: '0 0 20px rgba(0, 188, 212, 0.3)',
                }
              }}
            >
              Network Scan
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<TimelineIcon />}
              onClick={handleAnalyzeTraffic}
              sx={{
                borderColor: theme.palette.secondary.main,
                color: theme.palette.secondary.main,
                '&:hover': {
                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                  borderColor: theme.palette.secondary.light,
                  transform: 'translateY(-2px)',
                  boxShadow: '0 0 20px rgba(102, 126, 234, 0.3)',
                }
              }}
            >
              Analyze Traffic
            </Button>
            
            <IconButton
              onClick={toggleTheme}
              sx={{
                color: theme.palette.text.primary,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  transform: 'rotate(180deg)',
                }
              }}
            >
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Error Alert */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3,
              background: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)',
              color: 'white',
              borderRadius: 2,
              '& .MuiAlert-icon': {
                color: 'white'
              }
            }}
          >
            {error}
          </Alert>
        )}

        {/* Enhanced Stats Overview */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card metric-card">
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <DashboardIcon 
                  sx={{ 
                    fontSize: 40, 
                    color: theme.palette.primary.main,
                    mb: 2,
                    filter: 'drop-shadow(0 0 10px currentColor)'
                  }} 
                />
                <Typography 
                  variant="h3" 
                  className="metric-value"
                  sx={{
                    background: 'linear-gradient(135deg, #00bcd4 0%, #0288d1 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {stats.deviceCount}
                </Typography>
                <Typography variant="body2" className="metric-label">
                  Active Devices
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card metric-card">
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <SecurityIcon 
                  sx={{ 
                    fontSize: 40, 
                    color: '#ff9800',
                    mb: 2,
                    filter: 'drop-shadow(0 0 10px currentColor)'
                  }} 
                />
                <Typography 
                  variant="h3" 
                  className="metric-value"
                  sx={{
                    background: 'linear-gradient(135deg, #ff9a56 0%, #ffad56 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {stats.alertCount}
                </Typography>
                <Typography variant="body2" className="metric-label">
                  Total Alerts
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card metric-card">
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <SecurityIcon 
                  sx={{ 
                    fontSize: 40, 
                    color: '#f44336',
                    mb: 2,
                    filter: 'drop-shadow(0 0 10px currentColor)'
                  }} 
                />
                <Typography 
                  variant="h3" 
                  className="metric-value"
                  sx={{
                    background: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {stats.criticalAlerts}
                </Typography>
                <Typography variant="body2" className="metric-label">
                  Critical Alerts
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card metric-card">
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <TimelineIcon 
                  sx={{ 
                    fontSize: 40, 
                    color: '#4caf50',
                    mb: 2,
                    filter: 'drop-shadow(0 0 10px currentColor)'
                  }} 
                />
                <Typography 
                  variant="h3" 
                  className="metric-value"
                  sx={{
                    background: 'linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {Object.keys(stats.protocolStats).length}
                </Typography>
                <Typography variant="body2" className="metric-label">
                  Protocols
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Main Dashboard Grid */}
        <Grid container spacing={3}>
          {/* Network Map */}
          <Grid item xs={12} lg={8}>
            <Card className="glass-card">
              <CardContent>
                <Typography 
                  variant="h5" 
                  gutterBottom
                  sx={{ 
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                    mb: 3
                  }}
                >
                  Network Topology
                </Typography>
                <NetworkMap 
                  devices={networkData.devices} 
                  connections={networkData.connections}
                />
              </CardContent>
            </Card>
          </Grid>
          
          {/* Device Health */}
          <Grid item xs={12} lg={4}>
            <Card className="glass-card" sx={{ height: '100%' }}>
              <CardContent>
                <Typography 
                  variant="h5" 
                  gutterBottom
                  sx={{ 
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                    mb: 3
                  }}
                >
                  Device Health
                </Typography>
                <DeviceHealthStatus devices={devices} />
              </CardContent>
            </Card>
          </Grid>
          
          {/* Security Alerts */}
          <Grid item xs={12} lg={6}>
            <Card className="glass-card">
              <CardContent>
                <Typography 
                  variant="h5" 
                  gutterBottom
                  sx={{ 
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                    mb: 3
                  }}
                >
                  Security Alerts
                </Typography>
                <AlertPanel 
                  alerts={alerts} 
                  onAcknowledge={handleAcknowledgeAlert}
                />
              </CardContent>
            </Card>
          </Grid>
          
          {/* Traffic Analytics */}
          <Grid item xs={12} lg={6}>
            <Card className="glass-card">
              <CardContent>
                <Typography 
                  variant="h5" 
                  gutterBottom
                  sx={{ 
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                    mb: 3
                  }}
                >
                  Traffic Volume
                </Typography>
                <TrafficChart data={trafficData} />
              </CardContent>
            </Card>
          </Grid>
          
          {/* Security Trends */}
          <Grid item xs={12} lg={8}>
            <Card className="glass-card">
              <CardContent>
                <Typography 
                  variant="h5" 
                  gutterBottom
                  sx={{ 
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                    mb: 3
                  }}
                >
                  Security Trends
                </Typography>
                <SecurityTrends timeRange={timeRange} />
              </CardContent>
            </Card>
          </Grid>
          
          {/* Device List */}
          <Grid item xs={12} lg={4}>
            <Card className="glass-card" sx={{ height: '100%' }}>
              <CardContent>
                <Typography 
                  variant="h5" 
                  gutterBottom
                  sx={{ 
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                    mb: 3
                  }}
                >
                  Device Status
                </Typography>
                <DeviceList devices={devices} />
              </CardContent>
            </Card>
          </Grid>
          
          {/* Industrial Process Data */}
          <Grid item xs={12}>
            <Card className="glass-card">
              <CardContent sx={{ p: 0 }}>
                <ARFFDataViewer />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default Dashboard; 