import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  Button,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Speed as SpeedIcon,
  Thermostat as ThermostatIcon,
  BatteryFull as BatteryFullIcon,
  Memory as MemoryIcon,
  Timeline as TimelineIcon,
  Refresh as RefreshIcon,
  Factory as FactoryIcon,
  Electrical as ElectricalIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

const DARK_COLORS = ['#00ffff', '#ffab00', '#ff1744', '#00e676', '#7c4dff', '#ff6f00'];

const IndustrialProcess = ({ processData = [], onRefresh }) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [processMetrics, setProcessMetrics] = useState({});
  const [realtimeData, setRealtimeData] = useState([]);
  const [processStatus, setProcessStatus] = useState({});
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    loadProcessData();
    const interval = setInterval(loadProcessData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadProcessData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API call for process data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate mock process metrics
      const metrics = {
        totalProcesses: 12,
        activeProcesses: 10,
        criticalProcesses: 2,
        efficiency: 87.5,
        uptime: 99.2,
        temperature: 65.3,
        pressure: 2.4,
        flowRate: 145.7
      };
      setProcessMetrics(metrics);

      // Generate mock realtime data
      const mockData = [];
      for (let i = 19; i >= 0; i--) {
        const time = new Date(Date.now() - i * 60000);
        mockData.push({
          time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          temperature: 60 + Math.random() * 20,
          pressure: 2 + Math.random() * 1,
          flowRate: 140 + Math.random() * 20,
          efficiency: 80 + Math.random() * 15
        });
      }
      setRealtimeData(mockData);

      // Mock process status
      setProcessStatus({
        reactor1: { status: 'normal', value: 87.5 },
        reactor2: { status: 'warning', value: 76.2 },
        conveyor: { status: 'normal', value: 92.1 },
        packaging: { status: 'critical', value: 45.8 }
      });

      // Generate mock alerts
      setAlerts([
        { 
          type: 'warning', 
          message: 'Temperature rising in Reactor 2', 
          timestamp: new Date() 
        },
        { 
          type: 'info', 
          message: 'Scheduled maintenance due in 2 hours', 
          timestamp: new Date(Date.now() - 3600000) 
        },
        { 
          type: 'success', 
          message: 'Production target achieved', 
          timestamp: new Date(Date.now() - 7200000) 
        }
      ]);

    } catch (error) {
      console.error('Error loading process data:', error);
      setError('Failed to load process data');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'normal': return '#00e676';
      case 'warning': return '#ffab00';
      case 'critical': return '#ff1744';
      default: return '#9e9e9e';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'operational': return <CheckCircleIcon />;
      case 'warning': return <WarningIcon />;
      case 'error': return <ErrorIcon />;
      case 'maintenance': return <SettingsIcon />;
      default: return <CheckCircleIcon />;
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'warning': return <WarningIcon sx={{ color: '#ffab00' }} />;
      case 'critical': case 'error': return <ErrorIcon sx={{ color: '#ff1744' }} />;
      case 'success': return <CheckCircleIcon sx={{ color: '#00e676' }} />;
      case 'info': return <InfoIcon sx={{ color: '#00e5ff' }} />;
      default: return <InfoIcon sx={{ color: '#9e9e9e' }} />;
    }
  };

  return (
    <Box sx={{ 
      background: 'linear-gradient(135deg, #020508 0%, #0a0f1a 50%, #0f1322 100%)',
      minHeight: '100vh',
      p: 3
    }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold" sx={{ 
          background: 'linear-gradient(45deg, #ffab00 30%, #ff6f00 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Industrial Process Control
        </Typography>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={() => {
            onRefresh?.();
            loadProcessData();
          }}
          sx={{
            background: 'linear-gradient(135deg, #ffab00 0%, #ff6f00 100%)',
            color: '#000000',
            fontWeight: 600,
            '&:hover': {
              background: 'linear-gradient(135deg, #ff6f00 0%, #f57c00 100%)'
            }
          }}
        >
          Refresh
        </Button>
      </Box>

      {/* Process Metrics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #1e2a4a 0%, #2d3561 100%)',
            border: '1px solid #ff9800',
            color: 'white'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="#ff9800">
                    {processMetrics.productionRate || 0}
                  </Typography>
                  <Typography variant="body2" color="rgba(255,255,255,0.7)">
                    Units/Hour
                  </Typography>
                </Box>
                <FactoryIcon sx={{ fontSize: 40, color: '#ff9800' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)',
            border: '1px solid #4caf50',
            color: 'white'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="#4caf50">
                    {processMetrics.efficiency || 0}%
              </Typography>
                  <Typography variant="body2" color="rgba(255,255,255,0.7)">
                    Efficiency
              </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 40, color: '#4caf50' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #2d1b69 0%, #1e3c72 100%)',
            border: '1px solid #9c27b0',
            color: 'white'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="#9c27b0">
                    {processMetrics.qualityIndex || 0}%
              </Typography>
                  <Typography variant="body2" color="rgba(255,255,255,0.7)">
                    Quality Index
              </Typography>
                </Box>
                <CheckCircleIcon sx={{ fontSize: 40, color: '#9c27b0' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #e65100 0%, #ff8f00 100%)',
            border: '1px solid #00bcd4',
            color: 'white'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="#00bcd4">
                    {processMetrics.uptime || 0}%
              </Typography>
                  <Typography variant="body2" color="rgba(255,255,255,0.7)">
                    Uptime
              </Typography>
                </Box>
                <SpeedIcon sx={{ fontSize: 40, color: '#00bcd4' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Charts */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={8}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #1a1f3a 0%, #2a2d5a 100%)',
            border: '1px solid #00bcd4',
            color: 'white'
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold" color="#00bcd4">
                Real-time Process Parameters
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={realtimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                  <RechartsTooltip 
                    contentStyle={{
                      backgroundColor: '#1a1f3a',
                      border: '1px solid #00bcd4',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="temperature" 
                    stroke="#ff9800" 
                    strokeWidth={2}
                    name="Temperature (°C)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="pressure" 
                    stroke="#9c27b0" 
                    strokeWidth={2}
                    name="Pressure (PSI)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="flow_rate" 
                    stroke="#4caf50" 
                    strokeWidth={2}
                    name="Flow Rate (L/min)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="efficiency" 
                    stroke="#00bcd4" 
                    strokeWidth={2}
                    name="Efficiency (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #1a1f3a 0%, #2a2d5a 100%)',
            border: '1px solid #4caf50',
            color: 'white'
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold" color="#4caf50">
                System Health Indicators
              </Typography>
              <Box sx={{ mt: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="body2" color="white">Overall Health</Typography>
                  <Typography variant="body2" color="#4caf50" fontWeight="bold">
                    {processStatus.overall || 0}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={processStatus.overall || 0}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: '#4caf50',
                      borderRadius: 4
                    }
                  }}
                />

                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} mt={3}>
                  <Typography variant="body2" color="white">Temperature</Typography>
                  <Typography variant="body2" color="#ff9800" fontWeight="bold">
                    {processStatus.temperature || 0}°C
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min((processStatus.temperature || 0) / 2, 100)}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: '#ff9800',
                      borderRadius: 4
                    }
                  }}
                />

                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} mt={3}>
                  <Typography variant="body2" color="white">Pressure</Typography>
                  <Typography variant="body2" color="#9c27b0" fontWeight="bold">
                    {processStatus.pressure || 0} PSI
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min((processStatus.pressure || 0) / 2, 100)}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: '#9c27b0',
                      borderRadius: 4
                    }
                  }}
                />

                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} mt={3}>
                  <Typography variant="body2" color="white">Power Consumption</Typography>
                  <Typography variant="body2" color="#00bcd4" fontWeight="bold">
                    {processStatus.powerConsumption || 0}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={processStatus.powerConsumption || 0}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: '#00bcd4',
                      borderRadius: 4
                    }
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        </Grid>

      {/* Equipment Status and Alerts */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={8}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #1a1f3a 0%, #2a2d5a 100%)',
            border: '1px solid #ff9800',
            color: 'white'
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold" color="#ff9800">
                Equipment Status
              </Typography>
              <Grid container spacing={2} mt={1}>
                {Object.entries(processStatus).map(([name, status]) => (
                  <Grid item xs={12} sm={6} md={4} key={name}>
                    <Paper 
                      sx={{ 
                        p: 2, 
                        textAlign: 'center',
                        background: `linear-gradient(135deg, ${getStatusColor(status.status)}20 0%, ${getStatusColor(status.status)}10 100%)`,
                        border: `1px solid ${getStatusColor(status.status)}`,
                        color: 'white'
                      }}
                    >
                      <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                        {getStatusIcon(status.status)}
                        <Typography variant="body2" fontWeight="bold" ml={1} color="white">
                          {name}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="caption" color="rgba(255,255,255,0.7)">
                          Status
                        </Typography>
                        <Typography variant="caption" color="white" fontWeight="bold">
                          {status.status}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={status.value}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getStatusColor(status.status),
                            borderRadius: 3
                          }
                        }}
                      />
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #1a1f3a 0%, #2a2d5a 100%)',
            border: '1px solid #f44336',
            color: 'white'
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold" color="#f44336">
                Process Alerts
              </Typography>
              <List>
                {alerts.map((alert, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon>
                      {getAlertIcon(alert.type)}
                    </ListItemIcon>
                    <ListItemText 
                      primary={alert.message}
                      secondary={alert.timestamp.toLocaleString()}
                      sx={{ 
                        '& .MuiListItemText-primary': { 
                          color: 'white',
                          fontSize: '0.875rem'
                        },
                        '& .MuiListItemText-secondary': { 
                          color: 'rgba(255,255,255,0.7)',
                          fontSize: '0.75rem'
                        }
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Production Efficiency Chart */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #1a1f3a 0%, #2a2d5a 100%)',
            border: '1px solid #9c27b0',
            color: 'white'
          }}>
        <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold" color="#9c27b0">
                Production Efficiency Trends
          </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={realtimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                  <RechartsTooltip 
                    contentStyle={{
                      backgroundColor: '#1a1f3a',
                      border: '1px solid #9c27b0',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="efficiency" 
                    stroke="#9c27b0" 
                    fill="url(#efficiencyGradient)"
                    strokeWidth={2}
                    name="Efficiency (%)"
                  />
                  <defs>
                    <linearGradient id="efficiencyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9c27b0" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#9c27b0" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
        </CardContent>
      </Card>
        </Grid>
      </Grid>

      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" mt={3}>
          <CircularProgress sx={{ color: '#ff9800' }} />
          <Typography variant="body2" color="rgba(255,255,255,0.7)" ml={2}>
            Loading process data...
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default IndustrialProcess;
