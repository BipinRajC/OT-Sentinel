import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Container,
  Chip,
  Badge,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Security as SecurityIcon,
  DeviceHub as DevicesIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Shield as ShieldIcon,
  Computer as ComputerIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  WifiOff as WifiOffIcon,
  NetworkCheck as NetworkCheckIcon,
  Factory as FactoryIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';

import DashboardOverview from './dashboard/DashboardOverview';
import SecurityMonitoring from './dashboard/SecurityMonitoring';
import DeviceManagement from './dashboard/DeviceManagement';
import NetworkAnalytics from './dashboard/NetworkAnalytics';
import SystemSettings from './dashboard/SystemSettings';
import IndustrialProcess from './dashboard/IndustrialProcess';
import AIAssistant from './dashboard/AIAssistant';
import RealTimeSecurityDashboard from './dashboard/RealTimeSecurityDashboard';
import ApiService from '../services/ApiService';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function EnhancedDashboard({ toggleTheme, mode }) {
  const [currentTab, setCurrentTab] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [trafficData, setTrafficData] = useState(null);
  const [networkTopology, setNetworkTopology] = useState(null);

  const showNotification = useCallback((message, severity = 'info') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const [overviewData, devicesData, alertsData] = await Promise.all([
        ApiService.getDashboardOverview(),
        ApiService.getDevices(),
        ApiService.getAlerts()
      ]);
      
      setDashboardData(overviewData);
      setDevices(devicesData);
      setAlerts(alertsData);
    } catch (error) {
      showNotification('Failed to refresh data', 'error');
      console.error('Error refreshing data:', error);
    }
  }, [showNotification]);

  const handleWebSocketMessage = useCallback((data) => {
    try {
      if (data.type === 'device_update') {
        setDevices(prev => prev.map(device => 
          device.id === data.device_id ? { ...device, ...data.data } : device
        ));
      } else if (data.type === 'new_alert') {
        setAlerts(prev => [data.data, ...prev.slice(0, 49)]);
        showNotification(`New ${data.data.severity} alert: ${data.data.message}`, 'warning');
      } else if (data.type === 'initial_data') {
        if (data.devices) setDevices(data.devices);
        if (data.alerts) setAlerts(data.alerts);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }, [showNotification]);

  useEffect(() => {
    // Initialize data and WebSocket connection
    const initializeData = async () => {
      try {
        const [dashboardOverview, devicesData, alertsData, trafficResponse, topologyResponse] = await Promise.all([
          ApiService.getDashboardOverview(),
          ApiService.getDevices(),
          ApiService.getAlerts(),
          ApiService.getTrafficData(),
          ApiService.getNetworkTopology()
        ]);
        
        setDashboardData(dashboardOverview);
        setDevices(devicesData);
        setAlerts(alertsData);
        setTrafficData(trafficResponse);
        setNetworkTopology(topologyResponse);
        setConnectionStatus('connected');
      } catch (error) {
        console.error('Error initializing data:', error);
        setConnectionStatus('disconnected');
        setSnackbar({
          open: true,
          message: 'Error loading dashboard data',
          severity: 'error'
        });
      }
    };

    // Initialize WebSocket connection
    const connectWebSocket = () => {
      try {
        const ws = ApiService.createWebSocketConnection(
          (data) => {
            // Handle incoming WebSocket data
            handleWebSocketMessage(data);
          },
          () => {
            setConnectionStatus('connected');
            console.log('WebSocket connected');
          },
          () => {
            setConnectionStatus('disconnected');
            console.log('WebSocket disconnected');
          },
          (error) => {
            setConnectionStatus('error');
            console.error('WebSocket error:', error);
          }
        );
        return ws;
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        setConnectionStatus('disconnected');
        return null;
      }
    };

    initializeData();
    const websocket = connectWebSocket();
    
    // Auto-refresh data every 30 seconds if enabled
    let refreshInterval;
    if (autoRefresh) {
      refreshInterval = setInterval(refreshData, 30000);
    }
    
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
      if (websocket) websocket.close();
    };
  }, [autoRefresh, handleWebSocketMessage, refreshData]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircleIcon color="success" />;
      case 'disconnected':
        return <WifiOffIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <NetworkCheckIcon color="info" />;
    }
  };

  const tabs = [
    { label: 'Dashboard', icon: <DashboardIcon />, index: 0 },
    { label: 'Security', icon: <SecurityIcon />, index: 1 },
    { label: 'Devices', icon: <DevicesIcon />, index: 2 },
    { label: 'Process', icon: <FactoryIcon />, index: 3 },
    { label: 'Analytics', icon: <NetworkCheckIcon />, index: 4 },
    { label: 'Real-time Security', icon: <ShieldIcon />, index: 5 },
    { label: 'AI Assistant', icon: <PsychologyIcon />, index: 6 },
    { label: 'Settings', icon: <SettingsIcon />, index: 7 }
  ];

  const tabLabels = ['Dashboard', 'Security', 'Devices', 'Process', 'Analytics', 'Real-time Security', 'AI Assistant', 'Settings'];

  const handleToggleDevice = (deviceId) => {
    ApiService.toggleDeviceStatus(deviceId);
  };

  const handleRefresh = () => {
    ApiService.getDevices().then(setDevices);
  };

  const handleSaveSettings = () => {
    // Implement save settings logic here
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top App Bar */}
      <AppBar position="fixed" sx={{ 
        zIndex: 1300,
        background: 'linear-gradient(135deg, #1a1f3a 0%, #2a2f5a 100%)',
        borderBottom: '1px solid #3a4374',
      }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={toggleDrawer}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          <ShieldIcon sx={{ mr: 2, color: '#00bcd4' }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            OT Security Command Center
          </Typography>
          
          {/* Status Indicators */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              icon={getConnectionStatusIcon()}
              label={connectionStatus.toUpperCase()}
              size="small"
              variant="outlined"
              color={connectionStatus === 'connected' ? 'success' : 'warning'}
            />
            
            {dashboardData && (
              <Chip
                icon={<ComputerIcon />}
                label={`${dashboardData.online_devices}/${dashboardData.total_devices} Online`}
                size="small"
                variant="outlined"
                color="info"
              />
            )}
            
            <Badge 
              badgeContent={alerts.filter(a => !(a.acknowledged || false)).length} 
              color="error"
              max={99}
            >
              <IconButton color="inherit">
                <NotificationsIcon />
              </IconButton>
            </Badge>
            
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  size="small"
                />
              }
              label="Auto"
              sx={{ ml: 1 }}
            />
          </Box>
        </Toolbar>
        
        {/* Navigation Tabs */}
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ 
            borderTop: '1px solid #3a4374',
            '& .MuiTab-root': {
              minHeight: 48,
              fontWeight: 500,
            }
          }}
        >
          {tabLabels.map((label, index) => (
            <Tab 
              key={index}
              label={label} 
              id={`tab-${index}`}
              aria-controls={`tabpanel-${index}`}
            />
          ))}
        </Tabs>
      </AppBar>

      {/* Side Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            background: 'linear-gradient(180deg, #1a1f3a 0%, #2a2f5a 100%)',
            borderRight: '1px solid #3a4374',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ color: '#00bcd4', fontWeight: 600 }}>
            Quick Actions
          </Typography>
        </Box>
        <Divider />
        
        <List>
          {tabs.map((item) => (
            <ListItem 
              button 
              key={item.label}
              onClick={() => {
                setCurrentTab(item.index);
                setDrawerOpen(false);
              }}
              selected={currentTab === item.index}
            >
              <ListItemIcon sx={{ color: currentTab === item.index ? '#00bcd4' : 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItem>
          ))}
        </List>
        
        <Divider sx={{ mt: 2 }} />
        
        {/* Quick Stats in Drawer */}
        {dashboardData && (
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              System Status
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Chip
                size="small"
                label={`Risk Level: ${dashboardData.system_health}`}
                color={dashboardData.system_health === 'Good' ? 'success' : 'warning'}
              />
              <Chip
                size="small"
                label={`${dashboardData.critical_alerts} Critical Alerts`}
                color={dashboardData.critical_alerts > 0 ? 'error' : 'success'}
              />
            </Box>
          </Box>
        )}
      </Drawer>

      {/* Main Content */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          mt: 12, // Account for AppBar height
          minHeight: 'calc(100vh - 96px)',
          background: 'transparent',
        }}
      >
        <Container maxWidth="xl" sx={{ py: 2 }}>
          <TabPanel value={currentTab} index={0}>
            <DashboardOverview 
              data={dashboardData}
              devices={devices}
              alerts={alerts}
              onRefresh={refreshData}
            />
          </TabPanel>
          
          <TabPanel value={currentTab} index={1}>
            <SecurityMonitoring 
              alerts={alerts}
              devices={devices}
              onAcknowledgeAlert={(alertId) => ApiService.acknowledgeAlert(alertId)}
            />
          </TabPanel>
          
          <TabPanel value={currentTab} index={2}>
            <DeviceManagement 
              devices={devices}
              onToggleDevice={handleToggleDevice}
              onRefresh={handleRefresh}
            />
          </TabPanel>
          
          <TabPanel value={currentTab} index={3}>
            <IndustrialProcess />
          </TabPanel>
          
          <TabPanel value={currentTab} index={4}>
            <NetworkAnalytics 
              trafficData={trafficData}
              networkTopology={networkTopology}
              onRefresh={handleRefresh}
            />
          </TabPanel>
          
          <TabPanel value={currentTab} index={5}>
            <RealTimeSecurityDashboard />
          </TabPanel>
          
          <TabPanel value={currentTab} index={6}>
            <AIAssistant />
          </TabPanel>
          
          <TabPanel value={currentTab} index={7}>
            <SystemSettings 
              onSave={handleSaveSettings}
            />
          </TabPanel>
        </Container>
      </Box>

      {/* Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default EnhancedDashboard;
