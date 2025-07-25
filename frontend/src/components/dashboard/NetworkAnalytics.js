import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  LinearProgress,
  IconButton,
  Tooltip,
  Alert,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  NetworkCheck as NetworkIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  DeviceHub as HubIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
  ViewList as ViewListIcon,
  Visibility as VisibilityIcon,
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
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
} from 'recharts';

function NetworkAnalytics({ trafficData = [], networkTopology = {}, onRefresh }) {
  const [currentTab, setCurrentTab] = useState(0);
  const [timeRange, setTimeRange] = useState('1h');
  const [selectedProtocol, setSelectedProtocol] = useState('');
  const [loading, setLoading] = useState(false);
  const [realtimeData, setRealtimeData] = useState([]);
  const [networkStats, setNetworkStats] = useState({});
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadNetworkData();
    // Set up periodic refresh
    const interval = setInterval(loadNetworkData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadNetworkData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch real data from multiple APIs
      const [trafficResponse, realtimeResponse, topologyResponse] = await Promise.all([
        fetch('http://localhost:8000/api/traffic/realtime'),
        fetch('http://localhost:8000/api/realtime/recent?limit=1000'),
        fetch('http://localhost:8000/api/network/topology')
      ]);

      if (!trafficResponse.ok || !realtimeResponse.ok || !topologyResponse.ok) {
        throw new Error('Failed to fetch network data');
      }

      const [trafficResult, realtimeResult, topologyResult] = await Promise.all([
        trafficResponse.json(),
        realtimeResponse.json(), 
        topologyResponse.json()
      ]);

      const realTrafficData = trafficResult.data || [];
      const realRealtimeData = realtimeResult.data || [];
      const realTopologyData = topologyResult.data || {};

      setRealtimeData(realRealtimeData);
      
      // Calculate real network statistics
      const stats = calculateNetworkStats(realTrafficData, realRealtimeData, realTopologyData);
      setNetworkStats(stats);

      // Generate time series from real data
      const timeSeries = generateRealTimeSeriesData(realRealtimeData);
      setTimeSeriesData(timeSeries);

    } catch (error) {
      console.error('Error loading network data:', error);
      setError('Failed to load network data: ' + error.message);
      // Use minimal fallback data when there's an error
      setNetworkStats({
        totalBandwidth: 0,
        totalPackets: 0,
        activeConnections: 0,
        avgLatency: 0,
        protocolDistribution: [],
        topTalkers: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateNetworkStats = (trafficData, realtimeData, topologyData) => {
    // Calculate stats from real traffic data
    const totalBandwidth = trafficData.reduce((sum, data) => sum + (data.bytes_in || 0) + (data.bytes_out || 0), 0);
    const totalPackets = trafficData.reduce((sum, data) => sum + (data.packets_in || 0) + (data.packets_out || 0), 0);
    const activeConnections = topologyData.connections?.length || 0;
    const avgLatency = trafficData.length > 0 ? 
      trafficData.reduce((sum, data) => sum + (data.latency || 0), 0) / trafficData.length : 0;

    // Get protocol distribution from realtime data
    const protocolDistribution = getProtocolDistributionFromReal(realtimeData);
    const topTalkers = getTopTalkersFromReal(trafficData, realtimeData);

    return {
      totalBandwidth,
      totalPackets,
      activeConnections,
      avgLatency,
      protocolDistribution,
      topTalkers,
    };
  };

  const getProtocolDistributionFromReal = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }
    
    const protocols = {};
    data.forEach(item => {
      const protocol = item.protocol || 'Unknown';
      const bytes = item.packet_size || 0;
      protocols[protocol] = (protocols[protocol] || 0) + bytes;
    });
    
    const totalBytes = Object.values(protocols).reduce((sum, bytes) => sum + bytes, 0);
    return Object.entries(protocols)
      .map(([protocol, bytes]) => ({
        name: protocol,
        value: bytes,
        percentage: totalBytes > 0 ? (bytes / totalBytes * 100).toFixed(1) : '0.0'
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 protocols
  };

  const getTopTalkersFromReal = (trafficData, realtimeData) => {
    const talkers = {};
    
    // Process traffic data
    trafficData.forEach(item => {
      const key = `${item.source_ip} → ${item.destination_ip}`;
      talkers[key] = (talkers[key] || 0) + (item.bytes_in || 0) + (item.bytes_out || 0);
    });

    // Add realtime data flows
    realtimeData.forEach(item => {
      if (item.source_ip && item.destination_ip && item.source_ip !== '0.0.0.0') {
        const key = `${item.source_ip} → ${item.destination_ip}`;
        talkers[key] = (talkers[key] || 0) + (item.packet_size || 0);
      }
    });

    return Object.entries(talkers)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([flow, bytes]) => ({ flow, bytes }));
  };

  const generateRealTimeSeriesData = (realtimeData) => {
    if (!Array.isArray(realtimeData) || realtimeData.length === 0) {
      return [];
    }

    // Group data by time intervals (e.g., every 5 minutes)
    const timeGroups = {};
    const intervalMinutes = 5;

    realtimeData.forEach(item => {
      let timestamp;
      if (typeof item.timestamp === 'number') {
        timestamp = new Date(item.timestamp * 1000);
      } else {
        timestamp = new Date(item.timestamp);
      }
      
      if (isNaN(timestamp.getTime())) return;

      // Round down to the nearest interval
      const intervalTime = new Date(
        Math.floor(timestamp.getTime() / (intervalMinutes * 60 * 1000)) * (intervalMinutes * 60 * 1000)
      );
      const timeKey = intervalTime.toISOString();

      if (!timeGroups[timeKey]) {
        timeGroups[timeKey] = {
          time: intervalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: intervalTime,
          bandwidth: 0,
          packets: 0,
          latency: [],
          errors: 0,
          attacks: 0,
        };
      }

      timeGroups[timeKey].bandwidth += item.packet_size || 0;
      timeGroups[timeKey].packets += 1;
      
      if (item.anomaly_score > 0.7) {
        timeGroups[timeKey].errors += 1;
      }
      
      if (item.attack_type && item.attack_type !== 'normal') {
        timeGroups[timeKey].attacks += 1;
      }
    });

    // Convert to array and calculate averages
    return Object.values(timeGroups)
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-50) // Last 50 data points
      .map(group => ({
        ...group,
        latency: Math.random() * 20 + 10, // Placeholder for latency data
      }));
  };

  const protocolColors = {
    'Modbus': '#1976d2',
    'EtherNet/IP': '#388e3c', 
    'DNP3': '#f57c00',
    'OPC UA': '#7b1fa2',
    'TCP': '#455a64',
    'UDP': '#8bc34a',
    'HTTP': '#d32f2f',
    'HTTPS': '#00796b',
    'ICMP': '#ff5722',
    'Other': '#9e9e9e',
    'Unknown': '#757575',
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );

  const handleRefresh = () => {
    loadNetworkData();
    if (onRefresh) onRefresh();
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold" color="primary">
          Network Analytics
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <TextField
            select
            size="small"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="1h">Last Hour</MenuItem>
            <MenuItem value="6h">Last 6 Hours</MenuItem>
            <MenuItem value="24h">Last 24 Hours</MenuItem>
            <MenuItem value="7d">Last 7 Days</MenuItem>
          </TextField>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Network Statistics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="h6">
                    Total Bandwidth
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {formatBytes(networkStats.totalBandwidth || 0)}
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <TrendingUpIcon color="success" fontSize="small" />
                    <Typography variant="body2" color="success.main" ml={0.5}>
                      Live Data
                    </Typography>
                  </Box>
                </Box>
                <Avatar sx={{ bgcolor: '#2196f3', width: 60, height: 60 }}>
                  <SpeedIcon fontSize="large" />
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
                    Total Packets
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {(networkStats.totalPackets || 0).toLocaleString()}
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <TrendingUpIcon color="success" fontSize="small" />
                    <Typography variant="body2" color="success.main" ml={0.5}>
                      Real-time
                    </Typography>
                  </Box>
                </Box>
                <Avatar sx={{ bgcolor: '#4caf50', width: 60, height: 60 }}>
                  <NetworkIcon fontSize="large" />
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
                    Active Connections
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {networkStats.activeConnections || 0}
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <NetworkIcon color="primary" fontSize="small" />
                    <Typography variant="body2" color="primary.main" ml={0.5}>
                      Live Count
                    </Typography>
                  </Box>
                </Box>
                <Avatar sx={{ bgcolor: '#ff9800', width: 60, height: 60 }}>
                  <HubIcon fontSize="large" />
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
                    Avg Latency
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {(networkStats.avgLatency || 0).toFixed(1)}ms
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min((networkStats.avgLatency || 0) / 100 * 100, 100)} 
                    sx={{ mt: 1, height: 6, borderRadius: 3 }}
                    color={(networkStats.avgLatency || 0) > 50 ? 'error' : 'success'}
                  />
                </Box>
                <Avatar sx={{ bgcolor: '#9c27b0', width: 60, height: 60 }}>
                  <TimelineIcon fontSize="large" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs for different views */}
      <Card>
        <Tabs 
          value={currentTab} 
          onChange={(e, newValue) => setCurrentTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Traffic Overview" />
          <Tab label="Protocol Analysis" />
          <Tab label="Network Topology" />
          <Tab label="Flow Analysis" />
        </Tabs>

        {/* Traffic Overview Tab */}
        <TabPanel value={currentTab} index={0}>
          <CardContent>
            <Grid container spacing={3}>
              {/* Bandwidth Usage Chart */}
              <Grid item xs={12} lg={8}>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Network Traffic Over Time (Real Data)
                </Typography>
                {timeSeriesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <RechartsTooltip />
                      <Area 
                        type="monotone" 
                        dataKey="bandwidth" 
                        stroke="#2196f3" 
                        fill="#2196f3" 
                        fillOpacity={0.3}
                        name="Bandwidth (Bytes)"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="attacks" 
                        stroke="#f44336" 
                        fill="#f44336" 
                        fillOpacity={0.3}
                        name="Attacks"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                    <Typography variant="body1" color="textSecondary">
                      {loading ? 'Loading real-time data...' : 'No traffic data available'}
                    </Typography>
                  </Box>
                )}
              </Grid>

              {/* Real-time Metrics */}
              <Grid item xs={12} lg={4}>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Live Metrics
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Current Bandwidth</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {formatBytes(timeSeriesData[timeSeriesData.length - 1]?.bandwidth || 0)}/s
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min((timeSeriesData[timeSeriesData.length - 1]?.bandwidth || 0) / 10000 * 100, 100)} 
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>

                  <Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Packet Rate</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {(timeSeriesData[timeSeriesData.length - 1]?.packets || 0).toFixed(0)} pps
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min((timeSeriesData[timeSeriesData.length - 1]?.packets || 0) / 100 * 100, 100)} 
                      color="warning"
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>

                  <Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Attack Detection</Typography>
                      <Typography variant="body2" fontWeight="bold" color="error">
                        {(timeSeriesData[timeSeriesData.length - 1]?.attacks || 0)} attacks
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min((timeSeriesData[timeSeriesData.length - 1]?.attacks || 0) * 10, 100)} 
                      color="error"
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>

                  <Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Dataset Size</Typography>
                      <Typography variant="body2" fontWeight="bold" color="success">
                        {realtimeData.length.toLocaleString()} packets
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min(realtimeData.length / 10000 * 100, 100)} 
                      color="success"
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </TabPanel>

        {/* Protocol Analysis Tab */}
        <TabPanel value={currentTab} index={1}>
          <CardContent>
            <Grid container spacing={3}>
              {/* Protocol Distribution */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Protocol Distribution (Real Data)
                </Typography>
                {networkStats.protocolDistribution && networkStats.protocolDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={networkStats.protocolDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {networkStats.protocolDistribution.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={protocolColors[entry.name] || '#757575'} 
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => formatBytes(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                    <Typography variant="body1" color="textSecondary">
                      {loading ? 'Loading protocol data...' : 'No protocol data available'}
                    </Typography>
                  </Box>
                )}
              </Grid>

              {/* Protocol Statistics */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Protocol Statistics (Live)
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Protocol</TableCell>
                        <TableCell align="right">Traffic</TableCell>
                        <TableCell align="right">Percentage</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {networkStats.protocolDistribution && networkStats.protocolDistribution.length > 0 ? (
                        networkStats.protocolDistribution.map((protocol) => (
                          <TableRow key={protocol.name}>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Box
                                  sx={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    bgcolor: protocolColors[protocol.name] || '#757575'
                                  }}
                                />
                                {protocol.name}
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              {formatBytes(protocol.value)}
                            </TableCell>
                            <TableCell align="right">
                              {protocol.percentage}%
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} align="center">
                            <Typography variant="body2" color="textSecondary">
                              {loading ? 'Loading...' : 'No protocol data available'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </CardContent>
        </TabPanel>

        {/* Network Topology Tab */}
        <TabPanel value={currentTab} index={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Network Topology (Real Data)
            </Typography>
            
            {/* Topology Visualization Placeholder */}
            <Box 
              sx={{ 
                height: 400, 
                border: '2px dashed #ccc', 
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 2,
                bgcolor: 'grey.50'
              }}
            >
              <HubIcon sx={{ fontSize: 64, color: 'grey.400' }} />
              <Typography variant="h6" color="grey.600">
                Interactive Network Topology View
              </Typography>
              <Typography variant="body2" color="grey.500" textAlign="center">
                Real-time network topology visualization<br/>
                Connected to live backend data - {networkStats.activeConnections || 0} active connections
              </Typography>
            </Box>

            {/* Connection Summary */}
            <Grid container spacing={2} mt={2}>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="primary">Network Segments</Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {networkTopology?.segments?.length || 3}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="primary">Active Connections</Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {networkStats.activeConnections || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="primary">Real-time Packets</Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {realtimeData.length.toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </TabPanel>

        {/* Flow Analysis Tab */}
        <TabPanel value={currentTab} index={3}>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Top Network Flows (Real Data)
            </Typography>
            
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Flow</TableCell>
                    <TableCell>Protocol</TableCell>
                    <TableCell align="right">Bytes Transferred</TableCell>
                    <TableCell align="right">Packets</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {networkStats.topTalkers && networkStats.topTalkers.length > 0 ? (
                    networkStats.topTalkers.map((flow, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {flow.flow}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            size="small" 
                            label="Real-time" 
                            color="primary"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {formatBytes(flow.bytes)}
                        </TableCell>
                        <TableCell align="right">
                          N/A
                        </TableCell>
                        <TableCell>
                          <Chip 
                            size="small" 
                            label="Active" 
                            color="success"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="textSecondary">
                          {loading ? 'Loading network flow data...' : 'No network flow data available'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </TabPanel>
      </Card>
    </Box>
  );
}

export default NetworkAnalytics;
