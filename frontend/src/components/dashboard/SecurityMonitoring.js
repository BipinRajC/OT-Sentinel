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
  LinearProgress,
  Divider,
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
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar } from 'recharts';

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
  const [securityTrends, setSecurityTrends] = useState([]);
  const [threatLevels, setThreatLevels] = useState({});
  const [realtimeAlerts, setRealtimeAlerts] = useState([]);

  useEffect(() => {
    loadSecurityData();
    const interval = setInterval(loadSecurityData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSecurityData = async () => {
    try {
      const [assessmentRes, anomalyRes, realtimeRes] = await Promise.all([
        fetch('http://localhost:8000/api/ml/security/assessment'),
        fetch('http://localhost:8000/api/ml/predict/anomaly'),
        fetch('http://localhost:8000/api/realtime/recent?limit=100')
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

      if (realtimeRes.ok) {
        const realtimeData = await realtimeRes.json();
        const classifications = realtimeData.data || [];
        
        // Process security trends
        const trends = classifications.slice(0, 20).reverse().map((item, index) => ({
          time: new Date(item.timestamp).toLocaleTimeString(),
          normal: item.predicted_class === 'normal' ? 1 : 0,
          attacks: item.predicted_class !== 'normal' ? 1 : 0,
          confidence: item.confidence || 0.5
        }));
        setSecurityTrends(trends);

        // Calculate threat levels
        const threatCounts = {};
        classifications.forEach(item => {
          const threat = item.predicted_class || 'normal';
          threatCounts[threat] = (threatCounts[threat] || 0) + 1;
        });
        setThreatLevels(threatCounts);

        // Generate realtime alerts from classifications
        const alertsFromData = classifications
          .filter(item => item.predicted_class !== 'normal')
          .slice(0, 10)
          .map((item, index) => ({
            id: `alert-${index}`,
            severity: item.severity || 'medium',
            message: `${item.predicted_class?.toUpperCase()} attack detected from ${item.source_ip}`,
            timestamp: new Date(item.timestamp),
            source: item.source_ip,
            destination: item.destination_ip,
            protocol: item.protocol,
            acknowledged: false
          }));
        setRealtimeAlerts(alertsFromData);
      }
    } catch (error) {
      console.error('Error loading security data:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleAlertClick = (alert) => {
    setSelectedAlert(alert);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedAlert(null);
  };

  const handleAcknowledgeAlert = async (alertId) => {
    try {
      if (onAcknowledgeAlert) {
        await onAcknowledgeAlert(alertId);
      }
      // Update local state
      setRealtimeAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        )
      );
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#f44336';
      case 'high': return '#ff5722';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#757575';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <ErrorIcon />;
      case 'high': return <WarningIcon />;
      case 'medium': return <InfoIcon />;
      case 'low': return <CheckCircleIcon />;
      default: return <InfoIcon />;
    }
  };

  const getThreatLevelColor = (threatType) => {
    switch (threatType) {
      case 'normal': return '#4caf50';
      case 'dos': return '#f44336';
      case 'probe': return '#ff9800';
      case 'r2l': return '#9c27b0';
      case 'u2r': return '#ff5722';
      case 'modbus_attack': return '#e91e63';
      default: return '#757575';
    }
  };

  // Combine alerts from props and realtime data
  const allAlerts = [...(alerts || []), ...realtimeAlerts];
  
  // Filter alerts
  const filteredAlerts = allAlerts.filter(alert => {
    const matchesSeverity = !filterSeverity || alert.severity === filterSeverity;
    const matchesAcknowledged = !filterAcknowledged || 
      (filterAcknowledged === 'acknowledged' ? alert.acknowledged : !alert.acknowledged);
    const matchesSearch = !searchTerm || 
      alert.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.source?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSeverity && matchesAcknowledged && matchesSearch;
  });

  const paginatedAlerts = filteredAlerts.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const securityMetrics = {
    totalAlerts: allAlerts.length,
    criticalAlerts: allAlerts.filter(a => a.severity === 'critical').length,
    acknowledgedAlerts: allAlerts.filter(a => a.acknowledged).length,
    securityScore: securityAssessment?.overall_score || 85
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
          background: 'linear-gradient(45deg, #ff1744 30%, #f44336 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Security Monitoring Center
        </Typography>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={loadSecurityData}
          sx={{
            background: 'linear-gradient(135deg, #ff1744 0%, #d50000 100%)',
            color: 'white',
            fontWeight: 600,
            '&:hover': {
              background: 'linear-gradient(135deg, #d50000 0%, #b71c1c 100%)'
            }
          }}
        >
          Refresh
        </Button>
      </Box>

      {/* Security Metrics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #0f1322 0%, #1a2332 100%)',
            border: '1px solid #ff1744',
            color: 'white',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="#ff1744">
                    {securityMetrics.totalAlerts}
                  </Typography>
                  <Typography variant="body2" color="rgba(255,255,255,0.8)">
                    Total Alerts
                  </Typography>
                </Box>
                <SecurityIcon sx={{ fontSize: 40, color: '#ff1744' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #0f1322 0%, #1a2332 100%)',
            border: '1px solid #ff6f00',
            color: 'white',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="#ff6f00">
                    {securityMetrics.criticalAlerts}
                  </Typography>
                  <Typography variant="body2" color="rgba(255,255,255,0.8)">
                    Critical Alerts
                  </Typography>
                </Box>
                <ErrorIcon sx={{ fontSize: 40, color: '#ff6f00' }} />
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
                    {securityMetrics.acknowledgedAlerts}
                  </Typography>
                  <Typography variant="body2" color="rgba(255,255,255,0.7)">
                    Acknowledged
                  </Typography>
                </Box>
                <CheckIcon sx={{ fontSize: 40, color: '#4caf50' }} />
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
                    {securityMetrics.securityScore}%
                  </Typography>
                  <Typography variant="body2" color="rgba(255,255,255,0.7)">
                    Security Score
                  </Typography>
                </Box>
                <ShieldIcon sx={{ fontSize: 40, color: '#9c27b0' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card sx={{ 
        background: 'linear-gradient(135deg, #0f1322 0%, #1a2332 100%)',
        border: '1px solid #00ffff',
        color: 'white',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)'
      }}>
        <Box sx={{ borderBottom: 1, borderColor: 'rgba(0, 255, 255, 0.2)' }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': {
                color: 'rgba(255,255,255,0.7)',
                fontWeight: 500,
                '&.Mui-selected': {
                  color: '#00ffff',
                  background: 'rgba(0, 255, 255, 0.1)'
                },
                '&:hover': {
                  color: '#00ffff',
                  background: 'rgba(0, 255, 255, 0.05)'
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#00ffff',
                height: 3
              }
            }}
          >
            <Tab label="Active Alerts" />
            <Tab label="Security Trends" />
            <Tab label="Threat Analysis" />
            <Tab label="System Health" />
          </Tabs>
        </Box>

        <TabPanel value={currentTab} index={0}>
          {/* Active Alerts */}
          <Box mb={3}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Search alerts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ color: 'rgba(255,255,255,0.5)', mr: 1 }} />
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                      '&.Mui-focused fieldset': { borderColor: '#00bcd4' }
                    },
                    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Severity</InputLabel>
                  <Select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    sx={{
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00bcd4' }
                    }}
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
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Status</InputLabel>
                  <Select
                    value={filterAcknowledged}
                    onChange={(e) => setFilterAcknowledged(e.target.value)}
                    sx={{
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00bcd4' }
                    }}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="acknowledged">Acknowledged</MenuItem>
                    <MenuItem value="unacknowledged">Unacknowledged</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          <TableContainer component={Paper} sx={{ 
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Severity</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Message</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Source</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Time</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedAlerts.map((alert, index) => (
                  <TableRow 
                    key={alert.id || index}
                    sx={{ 
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
                      cursor: 'pointer'
                    }}
                    onClick={() => handleAlertClick(alert)}
                  >
                    <TableCell>
                      <Chip
                        icon={getSeverityIcon(alert.severity)}
                        label={alert.severity?.toUpperCase()}
                        size="small"
                        sx={{
                          backgroundColor: getSeverityColor(alert.severity),
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: 'white' }}>{alert.message}</TableCell>
                    <TableCell sx={{ color: 'white' }}>{alert.source || 'Unknown'}</TableCell>
                    <TableCell sx={{ color: 'white' }}>
                      {alert.timestamp ? new Date(alert.timestamp).toLocaleString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={alert.acknowledged ? 'ACK' : 'NEW'}
                        size="small"
                        sx={{
                          backgroundColor: alert.acknowledged ? '#4caf50' : '#ff9800',
                          color: 'white'
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {!alert.acknowledged && (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcknowledgeAlert(alert.id);
                          }}
                          sx={{
                            background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                            color: 'white'
                          }}
                        >
                          Acknowledge
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filteredAlerts.length}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
            sx={{
              color: 'white',
              '& .MuiTablePagination-select': { color: 'white' },
              '& .MuiTablePagination-selectIcon': { color: 'white' }
            }}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          {/* Security Trends */}
          <Card sx={{ 
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            mb: 3
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="#00bcd4" fontWeight="bold">
                Security Events Timeline
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={securityTrends}>
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
                  <Area 
                    type="monotone" 
                    dataKey="normal" 
                    stackId="1"
                    stroke="#4caf50" 
                    fill="#4caf50" 
                    fillOpacity={0.6}
                    name="Normal Traffic"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="attacks" 
                    stackId="1"
                    stroke="#f44336" 
                    fill="#f44336" 
                    fillOpacity={0.8}
                    name="Security Events"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          {/* Threat Analysis */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="#f44336" fontWeight="bold">
                    Threat Distribution
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    {Object.entries(threatLevels).map(([threat, count]) => (
                      <Box key={threat} sx={{ mb: 2 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="body2" color="white" fontWeight="medium">
                            {threat.replace('_', ' ').toUpperCase()}
                          </Typography>
                          <Typography variant="body2" color="#00bcd4" fontWeight="bold">
                            {count} events
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={(count / Math.max(...Object.values(threatLevels))) * 100}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: getThreatLevelColor(threat),
                              borderRadius: 4
                            }
                          }}
                        />
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="#9c27b0" fontWeight="bold">
                    Security Assessment
                  </Typography>
                  {securityAssessment ? (
                    <Box>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="body2" color="white">Overall Score</Typography>
                        <Typography variant="h6" color="#00bcd4" fontWeight="bold">
                          {securityAssessment.overall_score}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={securityAssessment.overall_score}
                        sx={{
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: securityAssessment.overall_score > 80 ? '#4caf50' : 
                                           securityAssessment.overall_score > 60 ? '#ff9800' : '#f44336',
                            borderRadius: 5
                          }
                        }}
                      />
                      <Typography variant="body2" color="rgba(255,255,255,0.7)" mt={2}>
                        Risk Level: {securityAssessment.risk_level || 'Moderate'}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="rgba(255,255,255,0.7)">
                      Loading assessment...
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          {/* System Health */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="#4caf50" fontWeight="bold">
                    Security Systems Status
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon sx={{ color: '#4caf50' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Intrusion Detection System"
                        secondary="Active - All sensors operational"
                        sx={{ 
                          '& .MuiListItemText-primary': { color: 'white' },
                          '& .MuiListItemText-secondary': { color: 'rgba(255,255,255,0.7)' }
                        }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon sx={{ color: '#4caf50' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Firewall Protection"
                        secondary="Active - Rules updated"
                        sx={{ 
                          '& .MuiListItemText-primary': { color: 'white' },
                          '& .MuiListItemText-secondary': { color: 'rgba(255,255,255,0.7)' }
                        }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <WarningIcon sx={{ color: '#ff9800' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Antivirus Scanner"
                        secondary="Warning - Definitions need update"
                        sx={{ 
                          '& .MuiListItemText-primary': { color: 'white' },
                          '& .MuiListItemText-secondary': { color: 'rgba(255,255,255,0.7)' }
                        }}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="#00bcd4" fontWeight="bold">
                    Network Security Metrics
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2" color="white">Firewall Efficiency</Typography>
                      <Typography variant="body2" color="#4caf50" fontWeight="bold">98.5%</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={98.5}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        '& .MuiLinearProgress-bar': { backgroundColor: '#4caf50', borderRadius: 3 }
                      }}
                    />

                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} mt={3}>
                      <Typography variant="body2" color="white">Threat Detection Rate</Typography>
                      <Typography variant="body2" color="#00bcd4" fontWeight="bold">95.2%</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={95.2}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        '& .MuiLinearProgress-bar': { backgroundColor: '#00bcd4', borderRadius: 3 }
                      }}
                    />

                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} mt={3}>
                      <Typography variant="body2" color="white">Response Time</Typography>
                      <Typography variant="body2" color="#ff9800" fontWeight="bold">2.3s avg</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={85}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        '& .MuiLinearProgress-bar': { backgroundColor: '#ff9800', borderRadius: 3 }
                      }}
                    />
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
        onClose={handleDialogClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #1a1f3a 0%, #2a2d5a 100%)',
            border: '1px solid #00bcd4',
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{ color: '#00bcd4' }}>
          Security Alert Details
        </DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedAlert.message}
              </Typography>
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="rgba(255,255,255,0.7)">
                    Severity: <span style={{ color: getSeverityColor(selectedAlert.severity) }}>
                      {selectedAlert.severity?.toUpperCase()}
                    </span>
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="rgba(255,255,255,0.7)">
                    Source: {selectedAlert.source || 'Unknown'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="rgba(255,255,255,0.7)">
                    Protocol: {selectedAlert.protocol || 'Unknown'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="rgba(255,255,255,0.7)">
                    Time: {selectedAlert.timestamp ? new Date(selectedAlert.timestamp).toLocaleString() : 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleDialogClose}
            sx={{ color: 'rgba(255,255,255,0.7)' }}
          >
            Close
          </Button>
          {selectedAlert && !selectedAlert.acknowledged && (
            <Button 
              onClick={() => {
                handleAcknowledgeAlert(selectedAlert.id);
                handleDialogClose();
              }}
              variant="contained"
              sx={{
                background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                color: 'white'
              }}
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
