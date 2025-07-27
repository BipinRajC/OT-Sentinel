import React, { useState, useEffect, useCallback } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  IconButton,
  Slider,
  FormControlLabel,
  Switch,
  Paper,
  Alert,
  Badge,
  LinearProgress,
  Tooltip,
  Tabs,
  Tab,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  NetworkCheck as NetworkCheckIcon,
  Timeline as TimelineIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';

// Import network graph component
import RealTimeNetworkGraph from './RealTimeNetworkGraph';

const SEVERITY_COLORS = {
  normal: '#4caf50',
  low: '#ffeb3b',
  medium: '#ff9800',
  high: '#f44336',
  critical: '#d32f2f',
};

const ATTACK_TYPE_COLORS = {
  normal: '#4caf50',
  dos: '#f44336',
  probe: '#ff9800',
  r2l: '#9c27b0',
  u2r: '#e91e63',
  modbus_attack: '#d32f2f',
  tcpSYNFloodDDoS: '#d32f2f',
  modbusQueryFlooding: '#f44336',
  clean: '#4caf50'
};

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`realtime-tabpanel-${index}`}
      aria-labelledby={`realtime-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function RealTimeSecurityDashboard({ alerts = [], devices = [], onRefresh, realtimeData = [], anomalies = [] }) {
  // State for data
  const [recentClassifications, setRecentClassifications] = useState([]);
  const [attackTimeline, setAttackTimeline] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // UI state
  const [currentTab, setCurrentTab] = useState(0);
  const [alertBanner, setAlertBanner] = useState(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Processed data for visualizations
  const [timelineData, setTimelineData] = useState([]);
  const [attackDistribution, setAttackDistribution] = useState([]);
  const [severityDistribution, setSeverityDistribution] = useState([]);

  useEffect(() => {
    loadRealTimeData();
    const interval = setInterval(loadRealTimeData, 3000); // Update every 3 seconds
    return () => clearInterval(interval);
  }, []);

  // Process real-time data when it changes
  useEffect(() => {
    if (realtimeData && realtimeData.length > 0) {
      processRealtimeData(realtimeData);
    }
  }, [realtimeData]);

  const loadRealTimeData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try to fetch real data from backend
      const response = await fetch('http://localhost:8000/api/realtime/recent?limit=500');
      
      if (response.ok) {
        const result = await response.json();
        const data = result.data || [];
        
        if (data.length > 0) {
          setRecentClassifications(data);
          processRealtimeData(data);
        } else {
          // Generate mock data if no real data available
          generateMockData();
        }
      } else {
        generateMockData();
      }
    } catch (error) {
      console.error('Error loading real-time data:', error);
      setError('Could not connect to backend, showing simulated data');
      generateMockData();
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockData = () => {
    // Generate realistic mock data
    const mockData = [];
    const attackTypes = ['normal', 'dos', 'probe', 'r2l', 'u2r', 'modbus_attack'];
    const now = new Date();

    for (let i = 0; i < 100; i++) {
      const timestamp = new Date(now.getTime() - (i * 10000)); // 10 seconds apart
      const isAttack = Math.random() > 0.85; // 15% attack rate
      const attackType = isAttack ? attackTypes[Math.floor(Math.random() * (attackTypes.length - 1)) + 1] : 'normal';
      
      mockData.push({
        id: i,
        timestamp: timestamp.toISOString(),
        source_ip: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
        destination_ip: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
        protocol: ['TCP', 'UDP', 'Modbus', 'ICMP'][Math.floor(Math.random() * 4)],
        packet_size: 64 + Math.floor(Math.random() * 1400),
        predicted_class: attackType,
        confidence: 0.7 + Math.random() * 0.3,
        severity: isAttack ? ['medium', 'high', 'critical'][Math.floor(Math.random() * 3)] : 'normal',
        anomaly_score: isAttack ? 0.6 + Math.random() * 0.4 : Math.random() * 0.3
      });
    }

    setRecentClassifications(mockData);
    processRealtimeData(mockData);
  };

  const processRealtimeData = (data) => {
    // Process timeline data
    const timelineMap = {};
    const attackCounts = {};
    const severityCounts = {};

    data.forEach(item => {
      const time = new Date(item.timestamp);
      const timeKey = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      if (!timelineMap[timeKey]) {
        timelineMap[timeKey] = {
          time: timeKey,
          normal: 0,
          attacks: 0,
          total: 0
        };
      }

      timelineMap[timeKey].total += 1;
      
      if (item.predicted_class === 'normal' || item.predicted_class === 'clean') {
        timelineMap[timeKey].normal += 1;
      } else {
        timelineMap[timeKey].attacks += 1;
        
        // Count attack types
        const attackType = item.predicted_class || 'unknown';
        attackCounts[attackType] = (attackCounts[attackType] || 0) + 1;
        
        // Count severity levels
        const severity = item.severity || 'medium';
        severityCounts[severity] = (severityCounts[severity] || 0) + 1;
      }
    });

    // Convert to arrays for charts
    const timelineArray = Object.values(timelineMap).slice(-20); // Last 20 time points
    setTimelineData(timelineArray);

    // Attack distribution
    const attackArray = Object.entries(attackCounts).map(([name, value], index) => ({
      name: name.toUpperCase(),
      value,
      color: ATTACK_TYPE_COLORS[name] || '#757575'
    }));
    setAttackDistribution(attackArray);

    // Severity distribution
    const severityArray = Object.entries(severityCounts).map(([name, value]) => ({
      name: name.toUpperCase(),
      value,
      color: SEVERITY_COLORS[name] || '#757575'
    }));
    setSeverityDistribution(severityArray);

    // Update statistics
    const totalPackets = data.length;
    const attackPackets = data.filter(d => d.predicted_class !== 'normal' && d.predicted_class !== 'clean').length;
    
    setStatistics({
      totalPackets,
      attackPackets,
      normalPackets: totalPackets - attackPackets,
      attackRate: totalPackets > 0 ? ((attackPackets / totalPackets) * 100).toFixed(1) : '0.0',
      avgConfidence: data.reduce((sum, d) => sum + (d.confidence || 0), 0) / data.length,
      lastUpdate: new Date().toLocaleString()
    });

    // Generate attack timeline
    const timelineItems = data
      .filter(d => d.predicted_class !== 'normal' && d.predicted_class !== 'clean')
      .slice(0, 10)
      .map(item => ({
        time: new Date(item.timestamp).toLocaleTimeString(),
        attackType: item.predicted_class,
        severity: item.severity,
        sourceIp: item.source_ip,
        confidence: item.confidence
      }));
    
    setAttackTimeline(timelineItems);
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getSeverityColor = (severity) => {
    return SEVERITY_COLORS[severity] || '#757575';
  };

  const getAttackTypeColor = (attackType) => {
    return ATTACK_TYPE_COLORS[attackType] || '#757575';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: '#f44336', width: 48, height: 48 }}>
              <SecurityIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight="bold" color="#f44336">
                Real-Time Security Dashboard
              </Typography>
              <Typography variant="body1" color="rgba(255,255,255,0.7)">
                Live monitoring and threat detection
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={() => {
              loadRealTimeData();
              if (onRefresh) onRefresh();
            }}
            sx={{ bgcolor: '#f44336', color: '#fff', '&:hover': { bgcolor: '#d32f2f' } }}
          >
            Refresh
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Active Anomalies Alert */}
      {anomalies.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }} 
          action={
            <Chip label={`${anomalies.length} Active Threats`} color="error" size="small" />
          }
        >
          <Typography variant="body1" fontWeight="bold">
            Active Security Threats Detected
          </Typography>
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: '#2196f3' }}>
                  <NetworkCheckIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="#2196f3">
                    {statistics.totalPackets || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Packets
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: '#f44336' }}>
                  <WarningIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="#f44336">
                    {statistics.attackPackets || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Attack Packets
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" color="textSecondary">
                {statistics.attackRate || '0.0'}% of total traffic
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: '#4caf50' }}>
                  <CheckCircleIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="#4caf50">
                    {statistics.normalPackets || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Normal Packets
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" color="textSecondary">
                Clean network traffic
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: '#ff9800' }}>
                  <TimelineIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="#ff9800">
                    {(statistics.avgConfidence * 100)?.toFixed(1) || '0.0'}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Avg Confidence
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" color="textSecondary">
                Detection accuracy
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs for detailed views */}
      <Card elevation={3}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                fontWeight: 'bold',
                '&.Mui-selected': {
                  color: '#f44336'
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#f44336'
              }
            }}
          >
            <Tab label="Real-Time Timeline" icon={<TimelineIcon />} />
            <Tab label="Network Topology" icon={<NetworkCheckIcon />} />
            <Tab label="Attack Analysis" icon={<BarChartIcon />} />
            <Tab label="Live Classifications" icon={<SecurityIcon />} />
          </Tabs>
        </Box>

        <TabPanel value={currentTab} index={0}>
          {/* Real-Time Timeline */}
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Security Events Timeline
            </Typography>
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <RechartsTooltip />
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
                    name="Attack Traffic"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>

            {/* Recent Attack Timeline */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Recent Security Events
              </Typography>
              <List>
                {attackTimeline.slice(0, 5).map((item, index) => (
                  <ListItem key={index} divider={index < attackTimeline.length - 1}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: getSeverityColor(item.severity) }}>
                        <WarningIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" fontWeight="bold">
                            {item.attackType?.toUpperCase()} attack detected
                          </Typography>
                          <Chip 
                            label={item.severity?.toUpperCase()} 
                            size="small" 
                            sx={{ 
                              bgcolor: getSeverityColor(item.severity),
                              color: 'white'
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="textSecondary">
                          From {item.sourceIp} at {item.time} (Confidence: {(item.confidence * 100)?.toFixed(1)}%)
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </CardContent>
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          {/* Network Topology */}
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Interactive Network Topology
            </Typography>
            <RealTimeNetworkGraph data={recentClassifications} />
          </CardContent>
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          {/* Attack Analysis */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Attack Types Distribution
                </Typography>
                <Box sx={{ height: 300 }}>
                  {attackDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={attackDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={120}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {attackDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                      <Typography variant="body2" color="textSecondary">
                        No attack data available
                      </Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Grid>

            <Grid item xs={12} md={6}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Severity Levels
                </Typography>
                <Box sx={{ height: 300 }}>
                  {severityDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={severityDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <RechartsTooltip />
                        <Bar 
                          dataKey="value" 
                          fill={(entry) => entry.color}
                          name="Count"
                        >
                          {severityDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                      <Typography variant="body2" color="textSecondary">
                        No severity data available
                      </Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          {/* Live Classifications Table */}
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Live Security Classifications
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Source IP</TableCell>
                    <TableCell>Destination IP</TableCell>
                    <TableCell>Protocol</TableCell>
                    <TableCell>Classification</TableCell>
                    <TableCell>Confidence</TableCell>
                    <TableCell>Severity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentClassifications
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="caption">
                            {new Date(item.timestamp).toLocaleTimeString()}
                          </Typography>
                        </TableCell>
                        <TableCell>{item.source_ip}</TableCell>
                        <TableCell>{item.destination_ip}</TableCell>
                        <TableCell>
                          <Chip label={item.protocol} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={item.predicted_class?.toUpperCase()} 
                            size="small"
                            sx={{
                              bgcolor: getAttackTypeColor(item.predicted_class),
                              color: 'white'
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {(item.confidence * 100)?.toFixed(1)}%
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={item.severity?.toUpperCase()} 
                            size="small"
                            sx={{
                              bgcolor: getSeverityColor(item.severity),
                              color: 'white'
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={recentClassifications.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </TableContainer>
          </CardContent>
        </TabPanel>
      </Card>

      {isLoading && (
        <Box display="flex" justifyContent="center" alignItems="center" sx={{ mt: 3 }}>
          <LinearProgress sx={{ width: '50%', mr: 2 }} />
          <Typography variant="body2" color="textSecondary">
            Loading real-time security data...
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default RealTimeSecurityDashboard; 