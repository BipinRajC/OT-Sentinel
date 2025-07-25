import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Avatar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Visibility as VisibilityIcon,
  Check as CheckIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Timeline as TimelineIcon,
  Shield as ShieldIcon,
  Computer as ComputerIcon,
} from '@mui/icons-material';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`security-tabpanel-${index}`}
      aria-labelledby={`security-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function SecurityMonitoring({ alerts, devices, onAcknowledgeAlert }) {
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterAcknowledged, setFilterAcknowledged] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [securityAssessment, setSecurityAssessment] = useState(null);
  const [anomalyPrediction, setAnomalyPrediction] = useState(null);

  useEffect(() => {
    loadSecurityData();
    const interval = setInterval(loadSecurityData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSecurityData = async () => {
    try {
      const [assessmentRes, anomalyRes] = await Promise.all([
        fetch('http://localhost:8000/api/ml/security/assessment'),
        fetch('http://localhost:8000/api/ml/predict/anomaly')
      ]);
      
      if (assessmentRes.ok) {
        const assessmentData = await assessmentRes.json();
        if (assessmentData.status === 'success') {
          setSecurityAssessment(assessmentData.assessment);
        }
      }
      
      if (anomalyRes.ok) {
        const anomalyData = await anomalyRes.json();
        if (anomalyData.status === 'success') {
          setAnomalyPrediction(anomalyData.prediction);
        }
      }
    } catch (error) {
      console.error('Error loading security data:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleViewAlert = (alert) => {
    setSelectedAlert(alert);
    setDialogOpen(true);
  };

  const handleAcknowledgeAlert = async (alertId) => {
    try {
      await onAcknowledgeAlert(alertId);
      setDialogOpen(false);
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <ErrorIcon color="error" />;
      case 'high': return <WarningIcon color="warning" />;
      case 'medium': return <InfoIcon color="info" />;
      case 'low': return <CheckCircleIcon color="success" />;
      default: return <SecurityIcon />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  // Filter alerts based on search and filters
  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = searchTerm === '' || 
      alert.alert_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = filterSeverity === '' || alert.severity === filterSeverity;
    const matchesAcknowledged = filterAcknowledged === '' || 
      (filterAcknowledged === 'true' ? (alert.acknowledged || false) : !(alert.acknowledged || false));
    
    return matchesSearch && matchesSeverity && matchesAcknowledged;
  });

  // Generate alert timeline data
  const alertTimelineData = alerts.slice(0, 20).map(alert => ({
    timestamp: new Date(alert.timestamp).getTime(),
    count: 1,
    severity: alert.severity,
  })).sort((a, b) => a.timestamp - b.timestamp);

  // Aggregate alerts by hour for trend analysis
  const alertTrendData = {};
  alerts.forEach(alert => {
    const hour = new Date(alert.timestamp).toISOString().slice(0, 13);
    if (!alertTrendData[hour]) {
      alertTrendData[hour] = { timestamp: hour, critical: 0, high: 0, medium: 0, low: 0 };
    }
    alertTrendData[hour][alert.severity] += 1;
  });

  const trendData = Object.values(alertTrendData).slice(-24); // Last 24 hours

  // Security metrics - enhanced with ML data
  const securityMetrics = {
    totalAlerts: alerts.length,
    criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
    unacknowledgedAlerts: alerts.filter(a => !(a.acknowledged || false)).length,
    devicesWithAlerts: new Set(alerts.map(a => a.device_id)).size,
    avgResponseTime: '2.5 min', // Mock data
    threatScore: securityAssessment ? securityAssessment.overall_risk_score : 
                 Math.round(alerts.filter(a => a.severity === 'critical').length * 20 + 
                           alerts.filter(a => a.severity === 'high').length * 10),
    aiThreatLevel: securityAssessment ? securityAssessment.risk_level : 'unknown',
    anomalyDetected: anomalyPrediction ? anomalyPrediction.is_anomaly : false,
    anomalyConfidence: anomalyPrediction ? Math.round(anomalyPrediction.confidence * 100) : 0,
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold" color="primary">
          Security Monitoring
        </Typography>
        <Box display="flex" gap={2}>
          <Chip 
            icon={<ShieldIcon />}
            label={`AI Risk Score: ${securityMetrics.threatScore}/100`}
            color={securityMetrics.threatScore > 70 ? 'error' : securityMetrics.threatScore > 40 ? 'warning' : 'success'}
            variant="outlined"
          />
          {securityMetrics.anomalyDetected && (
            <Chip 
              icon={<WarningIcon />}
              label={`Anomaly Detected (${securityMetrics.anomalyConfidence}%)`}
              color="error"
              variant="filled"
            />
          )}
          <Chip 
            icon={<SecurityIcon />}
            label={`Threat Level: ${securityMetrics.aiThreatLevel.toUpperCase()}`}
            color={securityMetrics.aiThreatLevel === 'low' ? 'success' : 'warning'}
            variant="outlined"
          />
        </Box>
      </Box>

      {/* Security Overview Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="h6">
                    Total Alerts
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {securityMetrics.totalAlerts}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#2196f3' }}>
                  <SecurityIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="h6">
                    Critical Alerts
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" color="error.main">
                    {securityMetrics.criticalAlerts}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#f44336' }}>
                  <ErrorIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="h6">
                    Unacknowledged
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" color="warning.main">
                    {securityMetrics.unacknowledgedAlerts}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#ff9800' }}>
                  <WarningIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="h6">
                    Affected Devices
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {securityMetrics.devicesWithAlerts}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#ff5722' }}>
                  <ComputerIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange} variant="fullWidth">
            <Tab label="Alert Dashboard" />
            <Tab label="Alert List" />
            <Tab label="Threat Analysis" />
          </Tabs>
        </Box>

        <TabPanel value={currentTab} index={0}>
          {/* Alert Dashboard */}
          <Grid container spacing={3}>
            {/* Recent Critical Alerts */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    Recent Critical Alerts
                  </Typography>
                  <List>
                    {alerts.filter(a => a.severity === 'critical').slice(0, 5).map((alert) => (
                      <ListItem key={alert.id} divider>
                        <ListItemIcon>
                          {getSeverityIcon(alert.severity)}
                        </ListItemIcon>
                        <ListItemText
                          primary={alert.alert_type}
                          secondary={
                            <Box>
                              <Typography variant="body2" color="textSecondary">
                                {alert.description}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {new Date(alert.timestamp).toLocaleString()}
                              </Typography>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton onClick={() => handleViewAlert(alert)} size="small">
                            <VisibilityIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Alert Trend Chart */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    Alert Trends (24h)
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(time) => new Date(time).getHours() + ':00'}
                      />
                      <YAxis />
                      <RechartsTooltip />
                      <Area type="monotone" dataKey="critical" stackId="1" stroke="#f44336" fill="#f44336" />
                      <Area type="monotone" dataKey="high" stackId="1" stroke="#ff9800" fill="#ff9800" />
                      <Area type="monotone" dataKey="medium" stackId="1" stroke="#2196f3" fill="#2196f3" />
                      <Area type="monotone" dataKey="low" stackId="1" stroke="#4caf50" fill="#4caf50" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Device Security Status */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    Device Security Status
                  </Typography>
                  <Grid container spacing={2}>
                    {devices.map((device) => {
                      const deviceAlerts = alerts.filter(a => a.device_id === device.id);
                      const criticalCount = deviceAlerts.filter(a => a.severity === 'critical').length;
                      
                      return (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={device.id}>
                          <Paper 
                            sx={{ 
                              p: 2, 
                              border: '1px solid',
                              borderColor: criticalCount > 0 ? 'error.main' : 
                                          deviceAlerts.length > 0 ? 'warning.main' : 'success.main'
                            }}
                          >
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {device.hostname}
                              </Typography>
                              <Badge badgeContent={deviceAlerts.length} color="error">
                                <ComputerIcon />
                              </Badge>
                            </Box>
                            <Typography variant="body2" color="textSecondary" gutterBottom>
                              {device.device_type} - {device.ip_address}
                            </Typography>
                            <Box display="flex" gap={1} flexWrap="wrap">
                              <Chip 
                                label={`Risk: ${device.risk_score}`}
                                size="small"
                                color={device.risk_score > 70 ? 'error' : device.risk_score > 40 ? 'warning' : 'success'}
                              />
                              {criticalCount > 0 && (
                                <Chip label={`${criticalCount} Critical`} size="small" color="error" />
                              )}
                            </Box>
                          </Paper>
                        </Grid>
                      );
                    })}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          {/* Alert List with Filters */}
          <Box mb={3}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Search alerts"
                  variant="outlined"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Severity</InputLabel>
                  <Select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    label="Severity"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="critical">Critical</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filterAcknowledged}
                    onChange={(e) => setFilterAcknowledged(e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="false">Unacknowledged</MenuItem>
                    <MenuItem value="true">Acknowledged</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Severity</TableCell>
                  <TableCell>Alert Type</TableCell>
                  <TableCell>Device</TableCell>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAlerts
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((alert) => (
                    <TableRow key={alert.id} hover>
                      <TableCell>
                        <Chip
                          icon={getSeverityIcon(alert.severity)}
                          label={alert.severity.toUpperCase()}
                          color={getSeverityColor(alert.severity)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {alert.alert_type}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {alert.device_ip}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(alert.timestamp).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={(alert.acknowledged || false) ? 'Acknowledged' : 'Pending'}
                          color={(alert.acknowledged || false) ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title="View Details">
                            <IconButton onClick={() => handleViewAlert(alert)} size="small">
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          {!(alert.acknowledged || false) && (
                            <Tooltip title="Acknowledge">
                              <IconButton 
                                onClick={() => handleAcknowledgeAlert(alert.id)}
                                size="small"
                                color="success"
                              >
                                <CheckIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredAlerts.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          {/* Threat Analysis */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    Threat Intelligence Timeline
                  </Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(time) => new Date(time).getHours() + ':00'}
                      />
                      <YAxis />
                      <RechartsTooltip />
                      <Line type="monotone" dataKey="critical" stroke="#f44336" strokeWidth={3} />
                      <Line type="monotone" dataKey="high" stroke="#ff9800" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    Threat Summary
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body1" gutterBottom>
                      <strong>Total Threats:</strong> {securityMetrics.totalAlerts}
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      <strong>Active Threats:</strong> {securityMetrics.unacknowledgedAlerts}
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      <strong>Threat Score:</strong> {securityMetrics.threatScore}/500
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      <strong>Avg Response:</strong> {securityMetrics.avgResponseTime}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Card>

      {/* Alert Detail Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            {selectedAlert && getSeverityIcon(selectedAlert.severity)}
            Alert Details
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Alert Type</Typography>
                <Typography variant="body1" gutterBottom>{selectedAlert.alert_type}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Severity</Typography>
                <Chip 
                  label={selectedAlert.severity.toUpperCase()}
                  color={getSeverityColor(selectedAlert.severity)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">Description</Typography>
                <Typography variant="body1" gutterBottom>{selectedAlert.description}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Device IP</Typography>
                <Typography variant="body1" gutterBottom>{selectedAlert.device_ip}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Timestamp</Typography>
                <Typography variant="body1" gutterBottom>
                  {new Date(selectedAlert.timestamp).toLocaleString()}
                </Typography>
              </Grid>
              {selectedAlert.details && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">Additional Details</Typography>
                  <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                    <pre>{JSON.stringify(selectedAlert.details, null, 2)}</pre>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
          {selectedAlert && !(selectedAlert.acknowledged || false) && (
            <Button 
              onClick={() => handleAcknowledgeAlert(selectedAlert.id)}
              variant="contained"
              color="primary"
            >
              Acknowledge
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SecurityMonitoring;
