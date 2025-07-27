import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  AppBar,
  Toolbar,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Badge,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  CircularProgress,
  Menu,
  MenuItem,
  Divider,
  ListItemAvatar,
  Avatar,
  TextField,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Security as SecurityIcon,
  NetworkCheck as NetworkIcon,
  DeviceHub as DeviceIcon,
  Settings as SettingsIcon,
  Brightness4,
  Brightness7,
  Refresh as RefreshIcon,
  Notifications as NotificationsIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  Send as SendIcon
} from '@mui/icons-material';

// Import dashboard components
import DashboardOverview from './dashboard/DashboardOverview';
import SecurityMonitoring from './dashboard/SecurityMonitoring';
import NetworkAnalytics from './dashboard/NetworkAnalytics';
import DeviceManagement from './dashboard/DeviceManagement';
import SystemSettings from './dashboard/SystemSettings';
import RealTimeSecurityDashboard from './dashboard/RealTimeSecurityDashboard';
import AIAssistant from './dashboard/AIAssistant';
import IndustrialProcess from './dashboard/IndustrialProcess';

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

const tabs = [
  { label: 'Overview', icon: <DashboardIcon />, component: DashboardOverview },
  { label: 'Real-Time Security', icon: <SecurityIcon />, component: RealTimeSecurityDashboard },
  { label: 'Security Monitor', icon: <SecurityIcon />, component: SecurityMonitoring },
  { label: 'Network Analytics', icon: <NetworkIcon />, component: NetworkAnalytics },
  { label: 'Device Management', icon: <DeviceIcon />, component: DeviceManagement },
  { label: 'Industrial Process', icon: <DeviceIcon />, component: IndustrialProcess },
  { label: 'AI Assistant', icon: <InfoIcon />, component: AIAssistant },
  { label: 'Settings', icon: <SettingsIcon />, component: SystemSettings }
];

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

  // Anomaly detection state
  const [anomalyNotifications, setAnomalyNotifications] = useState([]);
  const [realtimeData, setRealtimeData] = useState([]);
  const [criticalAlertDialog, setCriticalAlertDialog] = useState({ open: false, alert: null });
  const [lastAnomalyCheck, setLastAnomalyCheck] = useState(Date.now());
  
  // Smart notification system state
  const [notificationQueue, setNotificationQueue] = useState([]);
  const [lastNotificationTime, setLastNotificationTime] = useState(0);
  const [notificationCounts, setNotificationCounts] = useState({});
  const [suppressNotifications, setSuppressNotifications] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    enabled: true,
    rateLimitSeconds: 10,
    highVolumeThreshold: 10,
    suppressHighVolume: true,
    allowedSeverities: ['high', 'critical'],
    allowedAttackTypes: ['dos', 'ddos', 'modbus_attack', 'probe', 'r2l', 'u2r'],
    soundEnabled: true,
    showCriticalDialog: true
  });
  
  // Notification dropdown state
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const notificationOpen = Boolean(notificationAnchor);
  
  // Email alert system state
  const [emailSettings, setEmailSettings] = useState({
    enabled: false,
    email: '',
    severityThreshold: 'high',
    autoSend: false
  });
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Load notification settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('ot-sentinel-settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.notifications) {
          setNotificationSettings(settings.notifications);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  // Handle settings updates from SystemSettings component
  const handleSettingsUpdate = useCallback((newSettings) => {
    if (newSettings.notifications) {
      setNotificationSettings(newSettings.notifications);
    }
  }, []);

  const showNotification = useCallback((message, severity = 'info') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  }, []);

  // Smart notification system
  const smartNotificationSystem = useCallback((attacks) => {
    // Check if notifications are disabled
    if (!notificationSettings.enabled) {
      return;
    }

    const now = Date.now();
    const NOTIFICATION_COOLDOWN = notificationSettings.rateLimitSeconds * 1000; // Convert to milliseconds
    const HIGH_VOLUME_THRESHOLD = notificationSettings.highVolumeThreshold;
    
    // Filter attacks based on user settings
    const filteredAttacks = attacks.filter(attack => {
      // Check if attack type is allowed
      const attackTypeAllowed = notificationSettings.allowedAttackTypes.includes(attack.predicted_class);
      
      // Check if severity is allowed (if severity is available)
      const severityAllowed = !attack.severity || notificationSettings.allowedSeverities.includes(attack.severity);
      
      return attackTypeAllowed && severityAllowed;
    });

    // If no attacks pass the filter, don't show notifications
    if (filteredAttacks.length === 0) {
      return;
    }

    // Check if we should suppress notifications due to high volume
    if (notificationSettings.suppressHighVolume && filteredAttacks.length > HIGH_VOLUME_THRESHOLD) {
      if (!suppressNotifications) {
        setSuppressNotifications(true);
        showNotification(
          `High attack volume detected: ${filteredAttacks.length} attacks in last 30 seconds. Notifications suppressed.`,
          'warning'
        );
        setLastNotificationTime(now);
      }
      return;
    } else {
      setSuppressNotifications(false);
    }

    // Rate limiting check
    if (now - lastNotificationTime < NOTIFICATION_COOLDOWN) {
      return;
    }

    // Group attacks by type
    const attackGroups = {};
    filteredAttacks.forEach(attack => {
      const type = attack.predicted_class;
      if (!attackGroups[type]) {
        attackGroups[type] = [];
      }
      attackGroups[type].push(attack);
    });

    // Create smart notifications
    let notificationShown = false;
    
    for (const [attackType, attacksOfType] of Object.entries(attackGroups)) {
      if (notificationShown) break; // Only show one notification at a time
      
      const count = attacksOfType.length;
      const uniqueSources = [...new Set(attacksOfType.map(a => a.source_ip))].length;
      
      let message;
      let severity = 'warning';
      
      if (count === 1) {
        message = `${attackType.toUpperCase()} attack detected from ${attacksOfType[0].source_ip}`;
      } else if (uniqueSources === 1) {
        message = `${count} ${attackType.toUpperCase()} attacks from ${attacksOfType[0].source_ip}`;
        severity = 'error';
      } else {
        message = `${count} ${attackType.toUpperCase()} attacks from ${uniqueSources} sources`;
        severity = 'error';
      }
      
      // Check if this is a critical attack type
      if (['dos', 'ddos', 'modbus_attack'].includes(attackType.toLowerCase())) {
        severity = 'error';
      }
      
      showNotification(message, severity);
      setLastNotificationTime(now);
      notificationShown = true;
      
      // Show critical alert dialog for severe attacks (if enabled in settings)
      if (notificationSettings.showCriticalDialog && severity === 'error' && count >= 3) {
        const representativeAttack = attacksOfType[0];
        const criticalAlert = {
          id: `critical_${attackType}_${now}`,
          type: 'critical_attack',
          severity: 'critical',
          message: `Critical: Multiple ${attackType.toUpperCase()} attacks detected`,
          details: {
            attackType: attackType,
            attackCount: count,
            uniqueSources: uniqueSources,
            sourceIps: attacksOfType.map(a => a.source_ip).slice(0, 5),
            confidence: Math.max(...attacksOfType.map(a => a.confidence || 0.5)),
            timestamp: representativeAttack.timestamp
          },
          timestamp: new Date()
        };
        setCriticalAlertDialog({ open: true, alert: criticalAlert });
      }
    }
  }, [showNotification, lastNotificationTime, suppressNotifications, notificationSettings]);

  // Enhanced anomaly detection function
  const checkForAnomalies = useCallback((data) => {
    if (!data || !Array.isArray(data)) return;

    const currentTime = Date.now();
    const recentData = data.filter(item => {
      const itemTime = new Date(item.timestamp).getTime();
      return currentTime - itemTime < 30000; // Last 30 seconds
    });

    // Check for various anomaly patterns
    const anomalies = [];
    const attacks = [];

    recentData.forEach(item => {
      if (item.predicted_class && item.predicted_class !== 'normal' && item.predicted_class !== 'clean') {
        const severityLevel = item.severity || 'medium';
        const confidence = item.confidence || 0.5;
        
        // Create anomaly notification
        const anomaly = {
          id: `anomaly_${Date.now()}_${Math.random()}`,
          type: 'attack_detection',
          severity: severityLevel,
          message: `${item.predicted_class?.toUpperCase()} attack detected from ${item.source_ip}`,
          details: {
            attackType: item.predicted_class,
            sourceIp: item.source_ip,
            destinationIp: item.destination_ip,
            protocol: item.protocol,
            confidence: confidence,
            anomalyScore: item.anomaly_score,
            timestamp: item.timestamp
          },
          timestamp: new Date()
        };

        anomalies.push(anomaly);
        attacks.push(item);
      }
    });

    // Use smart notification system instead of showing individual notifications
    if (attacks.length > 0) {
      smartNotificationSystem(attacks);
    }

    // Check for DDoS patterns (multiple attacks from same source)
    const attacksBySource = {};
    recentData.filter(item => item.predicted_class !== 'normal' && item.predicted_class !== 'clean')
              .forEach(item => {
                const source = item.source_ip;
                if (!attacksBySource[source]) attacksBySource[source] = [];
                attacksBySource[source].push(item);
              });

    Object.entries(attacksBySource).forEach(([source, attacks]) => {
      if (attacks.length >= 5) { // 5+ attacks from same source in 30 seconds
        const ddosAnomaly = {
          id: `ddos_${Date.now()}_${source}`,
          type: 'ddos_detection',
          severity: 'critical',
          message: `Potential DDoS attack detected from ${source} (${attacks.length} attacks)`,
          details: {
            attackType: 'DDoS',
            sourceIp: source,
            attackCount: attacks.length,
            timeWindow: '30 seconds',
            timestamp: new Date()
          },
          timestamp: new Date()
        };

        anomalies.push(ddosAnomaly);
        showNotification(ddosAnomaly.message, 'error');
        setCriticalAlertDialog({ open: true, alert: ddosAnomaly });
      }
    });

    if (anomalies.length > 0) {
      setAnomalyNotifications(prev => [...anomalies, ...prev].slice(0, 100)); // Keep last 100
    }
  }, [smartNotificationSystem]);

  // Data refresh function
  const refreshData = useCallback(async () => {
    try {
      const [overviewData, devicesData, alertsData] = await Promise.all([
        ApiService.getDashboardOverview(),
        ApiService.getDevices(),
        ApiService.getAlerts()
      ]);
      
      // Process and enhance dashboard data with real device information
      if (devicesData && Array.isArray(devicesData)) {
        const totalDevices = devicesData.length;
        const onlineDevices = devicesData.filter(d => d.status === 'online' || d.is_online).length;
        const offlineDevices = totalDevices - onlineDevices;
        const warningDevices = devicesData.filter(d => d.status === 'warning').length;
        
        const enhancedDashboardData = {
          ...overviewData?.data || {},
          total_devices: totalDevices,
          online_devices: onlineDevices,
          offline_devices: offlineDevices,
          warning_devices: warningDevices,
          device_health: totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 0,
          last_update: new Date().toLocaleString(),
          system_status: onlineDevices === totalDevices ? 'healthy' : offlineDevices > totalDevices / 2 ? 'critical' : 'warning'
        };
        
        setDashboardData(enhancedDashboardData);
      } else {
        setDashboardData(overviewData?.data || {});
      }
      
      setDevices(devicesData || []);
      setAlerts(alertsData || []);
      
      // Process new alerts for real-time notifications
      if (alertsData && Array.isArray(alertsData)) {
        const criticalAlerts = alertsData.filter(alert => 
          (alert.severity === 'critical' || alert.severity === 'high') &&
          !alert.acknowledged
        );
        
        // Add new critical alerts to anomaly notifications
        criticalAlerts.forEach(alert => {
          const alertExists = anomalyNotifications.find(a => 
            a.id === `alert_${alert.id}` || a.id === alert.id
          );
          
          if (!alertExists) {
            const newAnomalyNotification = {
              id: `alert_${alert.id}`,
              type: 'security_alert',
              severity: alert.severity,
              message: alert.alert_type || alert.description,
              details: {
                description: alert.description,
                deviceIp: alert.device_ip,
                deviceId: alert.device_id,
                attackType: alert.alert_type,
                timestamp: alert.timestamp
              },
              timestamp: alert.timestamp || new Date().toISOString()
            };
            
            setAnomalyNotifications(prev => [newAnomalyNotification, ...prev.slice(0, 49)]);
          }
        });
      }
      
    } catch (error) {
      showNotification('Failed to refresh data', 'error');
      console.error('Error refreshing data:', error);
    }
  }, [showNotification, anomalyNotifications]);

  // Enhanced real-time data fetching with anomaly detection
  const fetchRealtimeData = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/api/realtime/recent?limit=200', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (response.ok) {
        const result = await response.json();
        const newData = result.data || [];
        
        // Update realtime data
        setRealtimeData(newData);
        
        // Check for anomalies in new data
        checkForAnomalies(newData);
        
        setConnectionStatus('connected');
      } else {
        console.warn(`API response not ok: ${response.status}`);
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Request timeout - API may be slow');
      } else {
        console.error('Error fetching realtime data:', error);
      }
      setConnectionStatus('disconnected');
    }
  }, [checkForAnomalies]);

  // WebSocket message handler (defined first to avoid hoisting issues)
  const handleWebSocketMessage = useCallback((data) => {
    try {
      if (data.type === 'device_update') {
        setDevices(prev => prev.map(device => 
          device.id === data.device_id ? { ...device, ...data.data } : device
        ));
      } else if (data.type === 'new_alert') {
        setAlerts(prev => [data.data, ...prev.slice(0, 49)]);
        showNotification(`New ${data.data.severity} alert: ${data.data.message}`, 'warning');
      } else if (data.type === 'classification') {
        // Handle real-time classification data
        const newClassification = data.data;
        setRealtimeData(prev => [newClassification, ...prev].slice(0, 200));
        
        // Check for anomalies in new classification
        checkForAnomalies([newClassification]);
      } else if (data.type === 'initial_data') {
        if (data.devices) setDevices(data.devices);
        if (data.alerts) setAlerts(data.alerts);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }, [showNotification, checkForAnomalies]);

  // WebSocket connection management
  const websocketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 seconds

  const connectWebSocket = useCallback(() => {
    // Clear any existing connection
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }

    try {
      console.log('Attempting WebSocket connection...');
      const ws = new WebSocket('ws://localhost:8000/ws');
      
      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        reconnectAttemptsRef.current = 0;
        setConnectionStatus('connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
        websocketRef.current = null;
        setConnectionStatus('disconnected');
        
        // Attempt reconnection if not a normal closure and under max attempts
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`Scheduling reconnection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${reconnectDelay}ms`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, reconnectDelay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.warn('Max WebSocket reconnection attempts reached');
          showNotification('WebSocket connection failed. Using polling for updates.', 'warning');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('disconnected');
      };

      websocketRef.current = ws;
      
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setConnectionStatus('disconnected');
    }
  }, [handleWebSocketMessage, showNotification]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

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
        showNotification('Error loading dashboard data. Using fallback mode.', 'warning');
      }
    };

    initializeData();

    // Start WebSocket connection
    connectWebSocket();

    // Set up real-time data polling as fallback
    fetchRealtimeData();
    const realtimeInterval = setInterval(fetchRealtimeData, 5000); // Check every 5 seconds

    // Set up regular data refresh
    let refreshInterval;
    if (autoRefresh) {
      refreshInterval = setInterval(refreshData, 30000); // Refresh every 30 seconds
    }

    return () => {
      clearInterval(realtimeInterval);
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh, refreshData, fetchRealtimeData, connectWebSocket]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleCloseCriticalAlert = () => {
    setCriticalAlertDialog({ open: false, alert: null });
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <InfoIcon color="success" />;
      case 'disconnected':
        return <ErrorIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <NetworkIcon color="info" />;
    }
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircleIcon color="success" />;
      case 'connecting':
        return <CircularProgress size={16} />;
      default:
        return <ErrorIcon color="error" />;
    }
  };

  const getAlertIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon color="error" />;
      case 'high':
        return <WarningIcon color="warning" />;
      case 'medium':
        return <InfoIcon color="info" />;
      default:
        return <InfoIcon color="primary" />;
    }
  };

  const handleToggleDevice = (deviceId) => {
    // Implement device toggle logic
    console.log('Toggle device:', deviceId);
  };

  const activeAnomalies = useMemo(() => {
    return anomalyNotifications.filter(anomaly => {
      const age = Date.now() - new Date(anomaly.timestamp).getTime();
      return age < 300000; // Show anomalies from last 5 minutes
    });
  }, [anomalyNotifications]);

  // All notifications for dropdown (alerts + anomalies)
  const allNotifications = useMemo(() => {
    const criticalAlerts = alerts
      .filter(alert => alert.severity === 'critical' || alert.severity === 'high')
      .map(alert => ({
        ...alert,
        type: 'alert',
        timestamp: alert.timestamp || new Date().toISOString()
      }));
    
    const recentAnomalies = activeAnomalies.map(anomaly => ({
      ...anomaly,
      type: 'anomaly'
    }));
    
    return [...criticalAlerts, ...recentAnomalies]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10); // Show only 10 most recent
  }, [alerts, activeAnomalies]);

  // Handle notification bell click
  const handleNotificationClick = (event) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const getNotificationIcon = (item) => {
    if (item.type === 'alert') {
      switch (item.severity) {
        case 'critical': return <ErrorIcon sx={{ color: '#f44336' }} />;
        case 'high': return <WarningIcon sx={{ color: '#ff9800' }} />;
        default: return <InfoIcon sx={{ color: '#2196f3' }} />;
      }
    } else {
      switch (item.severity) {
        case 'critical': return <ErrorIcon sx={{ color: '#f44336' }} />;
        case 'high': return <WarningIcon sx={{ color: '#ff9800' }} />;
        default: return <WarningIcon sx={{ color: '#ff9800' }} />;
      }
    }
  };

  // Email functionality
  const sendEmailAlert = async (alertData, recipientEmail) => {
    setSendingEmail(true);
    try {
      const response = await fetch('http://localhost:8000/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'security_alert',
          message: `CRITICAL SECURITY ALERT: ${alertData.message || alertData.alert_type}
          
Device: ${alertData.details?.deviceIp || 'Unknown'}
Severity: ${alertData.severity?.toUpperCase()}
Time: ${new Date(alertData.timestamp).toLocaleString()}
Description: ${alertData.details?.description || alertData.description || 'Security threat detected'}

This is an automated security alert from your OT Security Monitoring System.
Please investigate immediately.

---
OT-Sentinel Security Dashboard
${window.location.origin}`,
          priority: alertData.severity === 'critical' ? 'high' : 'medium',
          email: recipientEmail || emailSettings.email
        })
      });

      if (response.ok) {
        const result = await response.json();
        showNotification(`Alert email sent successfully to ${result.email_sent_to}`, 'success');
        return true;
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      showNotification('Failed to send alert email', 'error');
      return false;
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendEmailAlert = async () => {
    if (!emailSettings.email) {
      showNotification('Please configure email address first', 'warning');
      setEmailDialogOpen(true);
      return;
    }

    const criticalAlert = allNotifications.find(n => n.severity === 'critical') || allNotifications[0];
    if (criticalAlert) {
      await sendEmailAlert(criticalAlert, emailSettings.email);
    } else {
      showNotification('No alerts to send', 'info');
    }
  };

  const handleEmailSettingsSave = () => {
    localStorage.setItem('ot-sentinel-email-settings', JSON.stringify(emailSettings));
    setEmailDialogOpen(false);
    showNotification('Email settings saved successfully', 'success');
  };

  // Load email settings on component mount
  useEffect(() => {
    const savedEmailSettings = localStorage.getItem('ot-sentinel-email-settings');
    if (savedEmailSettings) {
      try {
        setEmailSettings(JSON.parse(savedEmailSettings));
      } catch (error) {
        console.error('Error loading email settings:', error);
      }
    }
  }, []);

  // Auto-send emails for critical alerts if enabled
  useEffect(() => {
    if (emailSettings.enabled && emailSettings.autoSend && emailSettings.email) {
      const newCriticalAlerts = allNotifications.filter(alert => 
        alert.severity === 'critical' && 
        !alert.emailSent &&
        (Date.now() - new Date(alert.timestamp).getTime()) < 60000 // Only new alerts (last minute)
      );

      newCriticalAlerts.forEach(async (alert) => {
        const success = await sendEmailAlert(alert, emailSettings.email);
        if (success) {
          alert.emailSent = true; // Mark as sent to avoid resending
        }
      });
    }
  }, [allNotifications, emailSettings]);

  return (
    <Box sx={{ 
      display: 'flex',
      minHeight: '100vh',
      background: mode === 'dark' 
        ? 'linear-gradient(135deg, #0f1419 0%, #1a2332 100%)'
        : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
    }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: 280,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
            background: mode === 'dark' 
              ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
              : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            borderRight: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`
          },
        }}
      >
        <Toolbar>
          <SecurityIcon sx={{ mr: 2, color: '#00ffff' }} />
          <Typography variant="h6" sx={{ color: '#00ffff', fontWeight: 'bold' }}>
            OT-Sentinel
          </Typography>
        </Toolbar>
        
        <List sx={{ pt: 2 }}>
          {tabs.map((tab, index) => (
            <ListItem
              key={index}
              button
              selected={currentTab === index}
              onClick={() => setCurrentTab(index)}
              sx={{
                mx: 1,
                my: 0.5,
                borderRadius: '8px',
                '&.Mui-selected': {
                  background: mode === 'dark' 
                    ? 'linear-gradient(90deg, rgba(0,255,255,0.1) 0%, rgba(0,255,255,0.05) 100%)'
                    : 'linear-gradient(90deg, rgba(59,130,246,0.1) 0%, rgba(59,130,246,0.05) 100%)',
                  borderLeft: '3px solid #00ffff'
                },
                '&:hover': {
                  background: mode === 'dark' 
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(0,0,0,0.05)'
                }
              }}
            >
              <ListItemIcon sx={{ color: currentTab === index ? '#00ffff' : 'inherit' }}>
                {tab.icon}
              </ListItemIcon>
              <ListItemText 
                primary={tab.label}
                sx={{ 
                  '& .MuiListItemText-primary': {
                    fontWeight: currentTab === index ? 'bold' : 'normal',
                    color: currentTab === index ? '#00ffff' : 'inherit'
                  }
                }}
              />
              {/* Show anomaly count for security tabs */}
              {(index === 1 || index === 2) && activeAnomalies.length > 0 && (
                <Badge badgeContent={activeAnomalies.length} color="error" />
              )}
            </ListItem>
          ))}
        </List>

        {/* Connection status */}
        <Box sx={{ p: 2, mt: 'auto' }}>
          <Paper sx={{ 
            p: 2, 
            background: mode === 'dark' 
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(0,0,0,0.05)',
            border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              {getConnectionIcon()}
              <Typography variant="body2" sx={{ ml: 1 }}>
                {connectionStatus === 'connected' ? 'Online' : 'Offline'}
              </Typography>
            </Box>
            {activeAnomalies.length > 0 && (
              <Typography variant="caption" color="error">
                {activeAnomalies.length} active anomal{activeAnomalies.length === 1 ? 'y' : 'ies'}
              </Typography>
            )}
          </Paper>
        </Box>
      </Drawer>

      {/* Main content */}
      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top AppBar */}
        <AppBar 
          position="static" 
          elevation={0}
          sx={{ 
            background: mode === 'dark' 
              ? 'linear-gradient(90deg, #1e293b 0%, #334155 100%)'
              : 'linear-gradient(90deg, #ffffff 0%, #f8fafc 100%)',
            borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ 
                color: mode === 'dark' ? '#f1f5f9' : '#1e293b',
                fontWeight: 'bold'
              }}>
                {tabs[currentTab]?.label}
              </Typography>
              
              {dashboardData && (
                <Chip
                  icon={<InfoIcon />}
                  label={`${dashboardData.online_devices || 0}/${dashboardData.total_devices || 0} Online`}
                  size="small"
                  sx={{ ml: 2 }}
                  color={connectionStatus === 'connected' ? 'success' : 'warning'}
                />
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Anomaly notifications indicator */}
              {activeAnomalies.length > 0 && (
                <Chip
                  icon={<WarningIcon />}
                  label={`${activeAnomalies.length} Alerts`}
                  size="small"
                  color="error"
                  variant="outlined"
                />
              )}

              <FormControlLabel
                control={
                  <Switch
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    size="small"
                  />
                }
                label="Auto-refresh"
                sx={{ ml: 1 }}
              />

              <IconButton 
                onClick={refreshData}
                color="inherit"
                title="Refresh Data"
              >
                <RefreshIcon />
              </IconButton>

              <IconButton 
                onClick={toggleTheme}
                color="inherit"
                title="Toggle Theme"
              >
                {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
              </IconButton>

              {/* Email Alert Button */}
              <IconButton
                onClick={() => setEmailDialogOpen(true)}
                color="inherit"
                title="Email Alert Settings"
                sx={{ 
                  color: emailSettings.enabled ? '#4caf50' : 'inherit',
                  '&:hover': { backgroundColor: 'rgba(0, 255, 255, 0.1)' }
                }}
              >
                <Badge badgeContent={emailSettings.enabled && emailSettings.autoSend ? '●' : null} color="success">
                  <EmailIcon />
                </Badge>
              </IconButton>

              {/* Send Email Alert Button */}
              {allNotifications.length > 0 && (
                <IconButton
                  onClick={handleSendEmailAlert}
                  color="inherit"
                  title="Send Alert Email"
                  disabled={sendingEmail || !emailSettings.email}
                  sx={{ 
                    color: '#ff9800',
                    '&:hover': { backgroundColor: 'rgba(255, 152, 0, 0.1)' }
                  }}
                >
                  {sendingEmail ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <SendIcon />
                  )}
                </IconButton>
              )}

              <Badge badgeContent={allNotifications.length} color="error">
                <IconButton 
                  color="inherit" 
                  onClick={handleNotificationClick}
                  title="View Notifications"
                >
                  <NotificationsIcon />
                </IconButton>
              </Badge>
              
              {/* Notification Dropdown */}
              <Menu
                anchorEl={notificationAnchor}
                open={notificationOpen}
                onClose={handleNotificationClose}
                PaperProps={{
                  sx: {
                    width: 400,
                    maxHeight: 500,
                    bgcolor: 'background.paper',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <Box sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <Typography variant="h6" fontWeight="bold">
                    Critical Notifications
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {allNotifications.length} active alerts
                  </Typography>
                </Box>
                
                {allNotifications.length === 0 ? (
                  <MenuItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#4caf50' }}>
                        <CheckCircleIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        All Clear
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        No critical alerts at this time
                      </Typography>
                    </Box>
                  </MenuItem>
                ) : (
                  allNotifications.map((item, index) => (
                    <MenuItem key={`${item.type}-${item.id || index}`} sx={{ py: 1.5 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'transparent' }}>
                          {getNotificationIcon(item)}
                        </Avatar>
                      </ListItemAvatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          {item.type === 'alert' ? item.alert_type : item.message}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                          {item.type === 'alert' ? item.description : item.details?.attackType?.toUpperCase()}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                          {new Date(item.timestamp).toLocaleString()}
                        </Typography>
                      </Box>
                      <Chip 
                        label={item.severity?.toUpperCase()} 
                        size="small" 
                        color={item.severity === 'critical' ? 'error' : 'warning'}
                        variant="outlined"
                      />
                    </MenuItem>
                  ))
                )}
                
                {allNotifications.length > 0 && (
                  <>
                    <Divider />
                    <MenuItem 
                      onClick={() => {
                        setCurrentTab(1); // Switch to Security tab
                        handleNotificationClose();
                      }}
                      sx={{ justifyContent: 'center', py: 1.5 }}
                    >
                      <Typography variant="body2" fontWeight="bold" color="primary">
                        View All in Security Dashboard
                      </Typography>
                    </MenuItem>
                  </>
                )}
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Tab Content */}
        <Box sx={{ flexGrow: 1, p: 3 }}>
          <TabPanel value={currentTab} index={0}>
            <DashboardOverview 
              onRefresh={refreshData}
              realtimeData={realtimeData}
              anomalies={activeAnomalies}
            />
          </TabPanel>
          
          <TabPanel value={currentTab} index={1}>
            <RealTimeSecurityDashboard 
              alerts={alerts}
              devices={devices}
              onRefresh={refreshData}
              realtimeData={realtimeData}
              anomalies={activeAnomalies}
            />
          </TabPanel>
          
          <TabPanel value={currentTab} index={2}>
            <SecurityMonitoring 
              alerts={alerts}
              devices={devices}
              onAcknowledgeAlert={handleToggleDevice}
              onRefresh={refreshData}
              realtimeData={realtimeData}
              anomalies={activeAnomalies}
            />
          </TabPanel>
          
          <TabPanel value={currentTab} index={3}>
            <NetworkAnalytics 
              trafficData={trafficData}
              networkTopology={networkTopology}
              onRefresh={refreshData}
              realtimeData={realtimeData}
            />
          </TabPanel>
          
          <TabPanel value={currentTab} index={4}>
            <DeviceManagement 
              devices={devices}
              onToggleDevice={handleToggleDevice}
              onRefresh={refreshData}
            />
          </TabPanel>
          
          <TabPanel value={currentTab} index={5}>
            <IndustrialProcess
              onRefresh={refreshData}
              realtimeData={realtimeData}
            />
          </TabPanel>
          
          <TabPanel value={currentTab} index={6}>
            <AIAssistant />
          </TabPanel>
          
          <TabPanel value={currentTab} index={7}>
            <SystemSettings onSave={refreshData} onSettingsUpdate={handleSettingsUpdate} />
          </TabPanel>
        </Box>
      </Box>

      {/* Critical Alert Dialog */}
      <Dialog
        open={criticalAlertDialog.open}
        onClose={handleCloseCriticalAlert}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#1a1a1a',
            border: '2px solid #f44336'
          }
        }}
      >
        <DialogTitle sx={{ color: '#f44336', fontWeight: 'bold' }}>
          Critical Security Alert
        </DialogTitle>
        <DialogContent>
          {criticalAlertDialog.alert && (
            <Box>
              <Typography variant="h6" sx={{ color: '#f44336', mb: 2 }}>
                {criticalAlertDialog.alert.message}
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">Attack Type:</Typography>
                  <Typography variant="body1" sx={{ color: '#f44336', fontWeight: 'bold' }}>
                    {criticalAlertDialog.alert.details?.attackType?.toUpperCase() || 'Unknown'}
                  </Typography>
                </Grid>
                
                {criticalAlertDialog.alert.details?.attackCount && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">Attack Count:</Typography>
                    <Typography variant="body1" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                      {criticalAlertDialog.alert.details.attackCount} attacks
                    </Typography>
                  </Grid>
                )}
                
                {criticalAlertDialog.alert.details?.uniqueSources && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">Unique Sources:</Typography>
                    <Typography variant="body1" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                      {criticalAlertDialog.alert.details.uniqueSources} IP addresses
                    </Typography>
                  </Grid>
                )}
                
                {criticalAlertDialog.alert.details?.sourceIp && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">Source IP:</Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                      {criticalAlertDialog.alert.details.sourceIp}
                    </Typography>
                  </Grid>
                )}
                
                {criticalAlertDialog.alert.details?.sourceIps && criticalAlertDialog.alert.details.sourceIps.length > 1 && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="textSecondary">Source IPs:</Typography>
                    <Box sx={{ mt: 1 }}>
                      {criticalAlertDialog.alert.details.sourceIps.map((ip, index) => (
                        <Chip
                          key={index}
                          label={ip}
                          size="small"
                          sx={{
                            mr: 1,
                            mb: 1,
                            backgroundColor: '#ff5722',
                            color: 'white',
                            fontFamily: 'monospace'
                          }}
                        />
                      ))}
                      {criticalAlertDialog.alert.details.uniqueSources > 5 && (
                        <Chip
                          label={`+${criticalAlertDialog.alert.details.uniqueSources - 5} more`}
                          size="small"
                          sx={{
                            backgroundColor: '#757575',
                            color: 'white'
                          }}
                        />
                      )}
                    </Box>
                  </Grid>
                )}
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">Timestamp:</Typography>
                  <Typography variant="body1">
                    {new Date(criticalAlertDialog.alert.timestamp).toLocaleString()}
                  </Typography>
                </Grid>
                
                {criticalAlertDialog.alert.details?.confidence && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">Confidence:</Typography>
                    <Typography variant="body1">
                      {(criticalAlertDialog.alert.details.confidence * 100).toFixed(1)}%
                    </Typography>
                  </Grid>
                )}
              </Grid>
              
              {(criticalAlertDialog.alert.details?.attackCount >= 5 || 
                criticalAlertDialog.alert.details?.uniqueSources >= 3) && (
                <Box sx={{ mt: 2, p: 2, backgroundColor: '#2d1b1b', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ color: '#f44336', fontWeight: 'bold' }}>
                    ⚠️ High Severity Alert
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    This appears to be a coordinated attack. Consider implementing immediate countermeasures.
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCriticalAlert} color="primary">
            Acknowledge
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Floating Action Button for Quick Security View */}
      {activeAnomalies.length > 0 && currentTab !== 1 && currentTab !== 2 && (
        <Fab
          color="error"
          aria-label="security alerts"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            animation: 'pulse 2s infinite'
          }}
          onClick={() => setCurrentTab(1)}
        >
          <Badge badgeContent={activeAnomalies.length} color="error">
            <SecurityIcon />
          </Badge>
        </Fab>
      )}

      {/* Email Settings Dialog */}
      <Dialog open={emailDialogOpen} onClose={() => setEmailDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          color: '#00ffff',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <EmailIcon />
          Email Alert Configuration
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={emailSettings.enabled}
                  onChange={(e) => setEmailSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                />
              }
              label="Enable Email Alerts"
            />
            
            <TextField
              fullWidth
              label="Alert Email Address"
              type="email"
              value={emailSettings.email}
              onChange={(e) => setEmailSettings(prev => ({ ...prev, email: e.target.value }))}
              helperText="Enter email address to receive security alerts"
              disabled={!emailSettings.enabled}
            />
            
            <FormControl fullWidth disabled={!emailSettings.enabled}>
              <InputLabel>Severity Threshold</InputLabel>
              <Select
                value={emailSettings.severityThreshold}
                label="Severity Threshold"
                onChange={(e) => setEmailSettings(prev => ({ ...prev, severityThreshold: e.target.value }))}
              >
                <MenuItem value="medium">Medium and above</MenuItem>
                <MenuItem value="high">High and above</MenuItem>
                <MenuItem value="critical">Critical only</MenuItem>
              </Select>
            </FormControl>
            
            <FormControlLabel
              control={
                <Switch
                  checked={emailSettings.autoSend}
                  onChange={(e) => setEmailSettings(prev => ({ ...prev, autoSend: e.target.checked }))}
                  disabled={!emailSettings.enabled || !emailSettings.email}
                />
              }
              label="Auto-send emails for critical alerts"
            />
            
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Email Service:</strong> Using Gmail SMTP for reliable delivery.
                <br />
                <strong>Note:</strong> Emails will be sent from the OT-Sentinel system.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setEmailDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleEmailSettingsSave} 
            variant="contained" 
            sx={{
              bgcolor: '#00ffff',
              color: '#000',
              '&:hover': { bgcolor: '#00e5ff' }
            }}
          >
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default EnhancedDashboard;
