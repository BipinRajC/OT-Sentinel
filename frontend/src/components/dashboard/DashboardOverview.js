import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  LinearProgress,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Alert,
  Paper,
} from '@mui/material';
import {
  Computer as ComputerIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Refresh as RefreshIcon,
  Shield as ShieldIcon,
  Speed as SpeedIcon,
  NetworkCheck as NetworkCheckIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area } from 'recharts';
import ApiService from '../../services/ApiService';
import NetworkTopology from '../NetworkTopology';
import ARFFDataViewer from '../ARFFDataViewer';

const COLORS = ['#00bcd4', '#ff9800', '#f44336', '#4caf50', '#9c27b0', '#ff5722'];

function DashboardOverview({ data, devices, alerts, onRefresh }) {
  const [trafficData, setTrafficData] = useState([]);
  const [protocolStats, setProtocolStats] = useState({});
  const [systemMetrics, setSystemMetrics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deviceHealth, setDeviceHealth] = useState(95);
  const [networkHealth, setNetworkHealth] = useState(92);
  const [processHealth, setProcessHealth] = useState(88);
  const [arffStatus, setArffStatus] = useState({
    connected: false,
    updateRate: 1.0
  });
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dashboardData, setDashboardData] = useState(null);
  const [securityAssessment, setSecurityAssessment] = useState(null);

  useEffect(() => {
    loadAnalyticsData();
    checkARFFConnection();
    loadNotifications();
    loadDashboardData();
    loadSecurityAssessment();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/dashboard/overview');
      const data = await response.json();
      if (data.status === 'success') {
        setDashboardData(data.data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const loadSecurityAssessment = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/ml/security/assessment');
      const data = await response.json();
      if (data.status === 'success') {
        setSecurityAssessment(data.assessment);
      }
    } catch (error) {
      console.error('Error loading security assessment:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/notifications');
      const data = await response.json();
      if (data.status === 'success') {
        setNotifications(data.notifications);
        setUnreadCount(data.unread_count);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const sendTestNotification = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'test_notification',
          message: 'This is a test notification sent from the dashboard',
          priority: 'medium',
          email: 'admin@ot-security.local'
        }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        alert(`Test notification sent successfully to ${data.email_sent_to}`);
        loadNotifications(); // Refresh notifications
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      alert('Error sending test notification');
    }
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  const dismissNotification = async (index) => {
    const notification = notifications[index];
    if (notification) {
      try {
        await fetch(`http://localhost:8000/api/notifications/${notification.id}/read`, {
          method: 'POST',
        });
        loadNotifications(); // Refresh notifications
      } catch (error) {
        console.error('Error dismissing notification:', error);
      }
    }
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const [traffic, protocols, metrics] = await Promise.all([
        ApiService.getRealtimeTraffic(),
        ApiService.getProtocolStatistics(),
        ApiService.getSystemMetrics()
      ]);
      
      setTrafficData(traffic);
      setProtocolStats(protocols);
      setSystemMetrics(metrics);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkARFFConnection = async () => {
    try {
      const status = await ApiService.checkARFFConnection();
      setArffStatus(status);
    } catch (error) {
      console.error('Error checking ARFF connection:', error);
    }
  };

  const getSystemHealthColor = (health) => {
    switch (health) {
      case 'Good': return '#4caf50';
      case 'Warning': return '#ff9800';
      case 'Critical': return '#f44336';
      default: return '#757575';
    }
  };

  const getRiskScoreColor = (score) => {
    if (score < 30) return '#4caf50';
    if (score < 60) return '#ff9800';
    return '#f44336';
  };

  // Calculate device statistics from the devices array
  const safeDevices = devices || [];
  const onlineDevices = safeDevices.filter(d => d.status === 'online').length;
  const offlineDevices = safeDevices.filter(d => d.status === 'offline').length;
  const warningDevices = safeDevices.filter(d => d.status === 'warning').length;
  const totalDevices = safeDevices.length;

  // Prepare chart data
  const deviceStatusData = [
    { name: 'Online', value: onlineDevices, color: '#4caf50' },
    { name: 'Offline', value: offlineDevices, color: '#f44336' },
    { name: 'Warning', value: warningDevices, color: '#ff9800' },
  ].filter(item => item.value > 0); // Only show categories with devices

  const alertSeverityData = alerts ? [
    { name: 'Critical', value: alerts.filter(a => a.severity === 'critical').length, color: '#f44336' },
    { name: 'High', value: alerts.filter(a => a.severity === 'high').length, color: '#ff9800' },
    { name: 'Medium', value: alerts.filter(a => a.severity === 'medium').length, color: '#ffeb3b' },
    { name: 'Low', value: alerts.filter(a => a.severity === 'low').length, color: '#4caf50' },
  ] : [];

  const protocolData = Object.entries(protocolStats).map(([protocol, stats]) => ({
    protocol,
    packets: stats.packets || 0,
    bytes: stats.bytes || 0,
    connections: stats.connections || 0,
  }));

  // Calculate aggregate dashboard metrics
  const safeAlerts = alerts || [];
  const criticalAlerts = safeAlerts.filter(a => a.severity === 'critical').length;
  const averageRiskScore = totalDevices > 0 
    ? Math.round(safeDevices.reduce((sum, d) => sum + (d.risk_score || 0), 0) / totalDevices)
    : 0;

  if (!data && totalDevices === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with refresh button and notifications */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} position="relative">
        <Typography variant="h4" fontWeight="bold" color="primary">
          System Overview
        </Typography>
        <Box display="flex" gap={1}>
          <Tooltip title="Notifications">
            <IconButton 
              onClick={toggleNotifications}
              color="primary"
              sx={{ position: 'relative' }}
            >
              <span className="material-icons">notifications</span>
              {unreadCount > 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    backgroundColor: '#f44336',
                    color: 'white',
                    borderRadius: '50%',
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 'bold'
                  }}
                >
                  {unreadCount}
                </Box>
              )}
            </IconButton>
          </Tooltip>
          <IconButton 
            onClick={() => {
              onRefresh();
              loadAnalyticsData();
            }}
            disabled={loading}
            color="primary"
          >
            <RefreshIcon />
          </IconButton>
        </Box>
        
        {/* Notification Panel */}
        {showNotifications && (
          <Paper
            sx={{
              position: 'absolute',
              top: 60,
              right: 0,
              width: 400,
              maxHeight: 500,
              overflow: 'auto',
              zIndex: 1000,
              border: '1px solid #e0e0e0',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
            }}
          >
            <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="bold">
                Notifications
              </Typography>
              <IconButton onClick={() => setShowNotifications(false)} size="small">
                <span className="material-icons">close</span>
              </IconButton>
            </Box>
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              {notifications.length > 0 ? (
                notifications.map((notification, index) => (
                  <Box key={index} sx={{ p: 2, borderBottom: '1px solid #f0f0f0' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          {notification.type === 'security_alert' ? '🔒 Security Alert' : 
                           notification.type === 'system_update' ? '⚙️ System Update' : 
                           notification.type === 'device_offline' ? '⚠️ Device Offline' : 
                           '📢 Notification'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {new Date(notification.timestamp).toLocaleString()}
                        </Typography>
                      </Box>
                      <IconButton onClick={() => dismissNotification(index)} size="small">
                        <span className="material-icons">close</span>
                      </IconButton>
                    </Box>
                  </Box>
                ))
              ) : (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="textSecondary">No notifications</Typography>
                </Box>
              )}
            </Box>
            <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', display: 'flex', gap: 1 }}>
              <button
                onClick={sendTestNotification}
                style={{
                  backgroundColor: '#00bcd4',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Send Test Email
              </button>
              <button
                onClick={clearAllNotifications}
                style={{
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Clear All
              </button>
            </Box>
          </Paper>
        )}
      </Box>

      {/* Key Metrics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Total Devices
                  </Typography>
                  <Typography variant="h3" component="div" fontWeight="bold">
                    {data?.totalDevices || data?.total_devices || totalDevices}
                  </Typography>
                  <Chip 
                    label={`${data?.onlineDevices || data?.online_devices || onlineDevices} Online`}
                    color="success"
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
                <Avatar sx={{ bgcolor: '#00bcd4', width: 60, height: 60 }}>
                  <ComputerIcon fontSize="large" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Active Alerts
                  </Typography>
                  <Typography variant="h3" component="div" fontWeight="bold">
                    {data?.totalAlerts || data?.total_alerts || safeAlerts.length}
                  </Typography>
                  <Chip 
                    label={`${data?.criticalAlerts || data?.critical_alerts || criticalAlerts} Critical`}
                    color={(data?.criticalAlerts || data?.critical_alerts || criticalAlerts) > 0 ? "error" : "success"}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
                <Avatar sx={{ bgcolor: (data?.criticalAlerts || data?.critical_alerts || criticalAlerts) > 0 ? '#f44336' : '#ff9800', width: 60, height: 60 }}>
                  <SecurityIcon fontSize="large" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Risk Score
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="h3" component="div" fontWeight="bold">
                      {data?.averageRiskScore || data?.average_risk_score || averageRiskScore}
                    </Typography>
                    <Typography variant="h5" color="textSecondary">
                      /100
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={data?.averageRiskScore || data?.average_risk_score || averageRiskScore} 
                    sx={{ 
                      mt: 1, 
                      height: 6,
                      borderRadius: 3,
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getRiskScoreColor(data?.averageRiskScore || data?.average_risk_score || averageRiskScore)
                      }
                    }}
                  />
                </Box>
                <Avatar sx={{ bgcolor: getRiskScoreColor(data?.averageRiskScore || data?.average_risk_score || averageRiskScore), width: 60, height: 60 }}>
                  <ShieldIcon fontSize="large" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    System Health
                  </Typography>
                  <Typography variant="h4" component="div" fontWeight="bold">
                    {data?.systemHealth || data?.system_health || 'Good'}
                  </Typography>
                  <Chip 
                    label="All Systems"
                    color={(data?.systemHealth || data?.system_health) === 'Good' ? "success" : "warning"}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
                <Avatar sx={{ bgcolor: getSystemHealthColor(data?.systemHealth || data?.system_health || 'Good'), width: 60, height: 60 }}>
                  {(data?.systemHealth || data?.system_health || 'Good') === 'Good' ? <CheckCircleIcon fontSize="large" /> : 
                   (data?.systemHealth || data?.system_health) === 'Warning' ? <WarningIcon fontSize="large" /> : 
                   <ErrorIcon fontSize="large" />}
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3}>
        {/* Device Status Distribution */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Device Status Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={deviceStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {deviceStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Alert Severity Distribution */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Alert Severity Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={alertSeverityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="value" fill="#00bcd4" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Process Trend Chart */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="bold">
                  Process Trend
                </Typography>
                <Chip 
                  icon={<TrendingUpIcon />}
                  label="24h Performance"
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              </Box>
              {dashboardData?.process_trend && dashboardData.process_trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dashboardData.process_trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <RechartsTooltip 
                      formatter={(value) => [`${value}%`, 'Performance']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#4caf50" 
                      strokeWidth={3}
                      dot={{ fill: '#4caf50', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#4caf50', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Box 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="center" 
                  height={300}
                  flexDirection="column"
                  color="text.secondary"
                >
                  <TrendingUpIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                  <Typography variant="h6">Loading Process Data...</Typography>
                  <Typography variant="body2">Please wait while we fetch process trends</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Real-time Traffic */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="bold">
                  Real-time Network Traffic
                </Typography>
                <Chip 
                  icon={<NetworkCheckIcon />}
                  label="Live Data"
                  color="success"
                  variant="outlined"
                  size="small"
                />
              </Box>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trafficData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(time) => new Date(time).toLocaleTimeString()}
                  />
                  <YAxis />
                  <RechartsTooltip 
                    labelFormatter={(time) => new Date(time).toLocaleString()}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="packets_per_second" 
                    stroke="#00bcd4" 
                    fill="#00bcd4" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Protocol Statistics */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Protocol Activity
              </Typography>
              <Box sx={{ mt: 2 }}>
                {protocolData.slice(0, 6).map((protocol, index) => (
                  <Box key={protocol.protocol} sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2" fontWeight="medium">
                        {protocol.protocol}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {protocol.packets} pkt/s
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min((protocol.packets / 1000) * 100, 100)}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: COLORS[index % COLORS.length]
                        }
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Devices */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Device Status Overview
              </Typography>
              <Grid container spacing={2} mt={1}>
                {devices.slice(0, 6).map((device) => (
                  <Grid item xs={12} sm={6} md={4} lg={2} key={device.id}>
                    <Paper 
                      sx={{ 
                        p: 2, 
                        textAlign: 'center',
                        border: '1px solid',
                        borderColor: device.is_online ? 'success.main' : 'error.main',
                        background: device.is_online 
                          ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%)'
                          : 'linear-gradient(135deg, rgba(244, 67, 54, 0.1) 0%, rgba(244, 67, 54, 0.05) 100%)'
                      }}
                    >
                      <Avatar 
                        sx={{ 
                          bgcolor: device.is_online ? 'success.main' : 'error.main',
                          mx: 'auto',
                          mb: 1
                        }}
                      >
                        {device.is_online ? <CheckCircleIcon /> : <ErrorIcon />}
                      </Avatar>
                      <Typography variant="body2" fontWeight="bold" noWrap>
                        {device.hostname}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" display="block">
                        {device.device_type}
                      </Typography>
                      <Chip
                        label={device.is_online ? 'Online' : 'Offline'}
                        size="small"
                        color={device.is_online ? 'success' : 'error'}
                        sx={{ mt: 1 }}
                      />
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* ARFF Real-time Data Stream */}
        <Grid item xs={12}>
          <ARFFDataViewer />
        </Grid>

        {/* Network Topology */}
        <Grid item xs={12}>
          <NetworkTopology />
        </Grid>

        {/* Industrial Data Stream Status - Moved to main content area */}
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: arffStatus.connected ? 'success.main' : 'error.main' }}>
                    📊
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Industrial Data Stream
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Real-time process monitoring
                    </Typography>
                  </Box>
                </Box>
                <Box textAlign="right">
                  <Chip 
                    label={arffStatus.connected ? 'LIVE' : 'OFFLINE'}
                    color={arffStatus.connected ? 'success' : 'error'}
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="body2" color="textSecondary">
                    {arffStatus.connected ? `${arffStatus.updateRate}s intervals` : 'Connection lost'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default DashboardOverview;
