import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
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
  PieChart as PieChartIcon,
  ExpandMore as ExpandMoreIcon,
  Fullscreen as FullscreenIcon,
  GetApp as ExportIcon,
  FilterList as FilterIcon,
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
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from 'recharts';

// Import network graph component (we'll create this next)
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

function RealTimeSecurityDashboard() {
  // State for simulation control
  const [isConnected, setIsConnected] = useState(false);
  const [simulationStatus, setSimulationStatus] = useState({
    is_running: false,
    is_paused: false,
    current_row: 0,
    total_rows: 0,
    progress_percent: 0,
    playback_speed: 1.0,
    attack_counts: {},
    recent_classifications_count: 0,
    active_connections: 0,
    random_mode: true,
    processed_packets: 0,
    remaining_packets: 0,
  });

  // State for data
  const [recentClassifications, setRecentClassifications] = useState([]);
  const [attackTimeline, setAttackTimeline] = useState([]);
  const [networkGraphData, setNetworkGraphData] = useState({ nodes: [], edges: [] });
  const [statistics, setStatistics] = useState({});

  // UI state
  const [currentTab, setCurrentTab] = useState(0);
  const [alertBanner, setAlertBanner] = useState(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    severity: 'all',
    attack_type: 'all',
    protocol: 'all',
  });

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // WebSocket connection
  const websocket = useRef(null);
  const reconnectAttempts = useRef(0);

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    try {
      const wsUrl = `ws://localhost:8000/api/realtime/ws`;
      websocket.current = new WebSocket(wsUrl);

      websocket.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      websocket.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      };

      websocket.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect
        if (reconnectAttempts.current < 5) {
          reconnectAttempts.current++;
          setTimeout(connectWebSocket, 2000 * reconnectAttempts.current);
        }
      };

      websocket.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('Error connecting WebSocket:', error);
      setIsConnected(false);
    }
  }, []);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message) => {
    switch (message.type) {
      case 'status':
        setSimulationStatus(message.data);
        break;
      case 'classification':
        const newClassification = message.data;
        setRecentClassifications(prev => {
          const updated = [newClassification, ...prev].slice(0, 1000);
          
          // Disable annoying alert banners for attacks - commented out
          // if (newClassification.attack_type && newClassification.severity !== 'normal') {
          //   setAlertBanner({
          //     type: 'attack',
          //     message: `${newClassification.attack_type.toUpperCase()} attack detected from ${newClassification.source_ip}`,
          //     severity: newClassification.severity,
          //     timestamp: newClassification.timestamp,
          //   });
          //   
          //   // Auto-hide banner after 5 seconds
          //   setTimeout(() => setAlertBanner(null), 5000);
          // }
          
          return updated;
        });
        break;
      case 'initial_data':
        setRecentClassifications(message.data);
        break;
      case 'attack_timeline':
        setAttackTimeline(message.data);
        break;
      case 'network_graph':
        setNetworkGraphData(message.data);
        break;
    }
  }, []);

  // Connect WebSocket on component mount
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (websocket.current) {
        websocket.current.close();
      }
    };
  }, [connectWebSocket]);

  // Request data updates periodically
  useEffect(() => {
    if (!isConnected || !websocket.current) return;

    const interval = setInterval(() => {
      websocket.current.send(JSON.stringify({ type: 'get_status' }));
      websocket.current.send(JSON.stringify({ type: 'get_timeline' }));
      websocket.current.send(JSON.stringify({ type: 'get_network_graph' }));
    }, 5000);

    return () => clearInterval(interval);
  }, [isConnected]);

  // API calls for simulation control
  const controlSimulation = async (action, speed = null) => {
    try {
      const response = await fetch('http://localhost:8000/api/realtime/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, speed }),
      });
      const result = await response.json();
      
      if (result.status === 'success') {
        setSimulationStatus(result.data);
      } else {
        console.error('Control action failed:', result.message);
      }
    } catch (error) {
      console.error('Error controlling simulation:', error);
    }
  };

  // Control random mode
  const toggleRandomMode = async (enabled) => {
    try {
      const response = await fetch('http://localhost:8000/api/realtime/random-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      const result = await response.json();
      
      if (result.status === 'success') {
        setSimulationStatus(result.data);
      } else {
        console.error('Random mode toggle failed:', result.message);
      }
    } catch (error) {
      console.error('Error toggling random mode:', error);
    }
  };

  // Reset random indices
  const resetRandomIndices = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/realtime/reset-random', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      
      if (result.status === 'success') {
        setSimulationStatus(result.data);
      } else {
        console.error('Reset random indices failed:', result.message);
      }
    } catch (error) {
      console.error('Error resetting random indices:', error);
    }
  };

  // Load statistics
  const loadStatistics = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/realtime/statistics');
      const result = await response.json();
      if (result.status === 'success') {
        setStatistics(result.data);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  useEffect(() => {
    const interval = setInterval(loadStatistics, 10000);
    loadStatistics();
    return () => clearInterval(interval);
  }, []);

  // Filter recent classifications
  const filteredClassifications = recentClassifications.filter(item => {
    if (filters.severity !== 'all' && item.severity !== filters.severity) return false;
    if (filters.attack_type !== 'all' && item.attack_type !== filters.attack_type) return false;
    if (filters.protocol !== 'all' && item.protocol !== filters.protocol) return false;
    return true;
  });

  // Prepare chart data
  const attackTimelineData = attackTimeline.reduce((acc, attack) => {
    const time = new Date(attack.timestamp).toLocaleTimeString();
    const existing = acc.find(item => item.time === time);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ time, count: 1, severity: attack.severity });
    }
    return acc;
  }, []);

  const attackDistributionData = Object.entries(simulationStatus.attack_counts || {}).map(([type, count]) => ({
    name: type,
    value: count,
    color: ATTACK_TYPE_COLORS[type] || '#666666',
  }));

  const severityDistributionData = Object.entries(statistics.severity_distribution || {}).map(([severity, count]) => ({
    name: severity,
    value: count,
    color: SEVERITY_COLORS[severity] || '#666666',
  }));

  return (
    <Box sx={{ p: 3 }}>
      {/* Alert Banner */}
      {alertBanner && (
        <Alert 
          severity={alertBanner.severity === 'critical' ? 'error' : 'warning'} 
          sx={{ mb: 2 }}
          onClose={() => setAlertBanner(null)}
          icon={<SecurityIcon />}
        >
          <Typography variant="h6">{alertBanner.message}</Typography>
          <Typography variant="caption">
            {new Date(alertBanner.timestamp).toLocaleString()}
          </Typography>
        </Alert>
      )}

      {/* Control Panel */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            {/* Connection Status */}
            <Grid item>
              <Chip
                icon={<NetworkCheckIcon />}
                label={isConnected ? 'Connected' : 'Disconnected'}
                color={isConnected ? 'success' : 'error'}
                variant="outlined"
              />
            </Grid>

            {/* Simulation Controls */}
            <Grid item>
              <Button
                variant="contained"
                startIcon={simulationStatus.is_running ? (simulationStatus.is_paused ? <PlayIcon /> : <PauseIcon />) : <PlayIcon />}
                onClick={() => controlSimulation(simulationStatus.is_running ? (simulationStatus.is_paused ? 'resume' : 'pause') : 'start')}
                disabled={!isConnected}
                color={simulationStatus.is_running && !simulationStatus.is_paused ? 'secondary' : 'primary'}
              >
                {simulationStatus.is_running ? (simulationStatus.is_paused ? 'Resume' : 'Pause') : 'Start'}
              </Button>
            </Grid>

            <Grid item>
              <Button
                variant="outlined"
                startIcon={<StopIcon />}
                onClick={() => controlSimulation('stop')}
                disabled={!isConnected || !simulationStatus.is_running}
              >
                Stop
              </Button>
            </Grid>

            <Grid item>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => controlSimulation('reset')}
                disabled={!isConnected}
              >
                Reset
              </Button>
            </Grid>

            {/* Random Mode Controls */}
            <Grid item>
              <FormControlLabel
                control={
                  <Switch
                    checked={simulationStatus.random_mode}
                    onChange={(e) => toggleRandomMode(e.target.checked)}
                    disabled={!isConnected}
                  />
                }
                label="Random Sampling"
              />
            </Grid>

            {simulationStatus.random_mode && (
              <Grid item>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={resetRandomIndices}
                  disabled={!isConnected}
                >
                  Shuffle
                </Button>
              </Grid>
            )}

            {/* Speed Control */}
            <Grid item xs={12} sm={3}>
              <Box>
                <Typography variant="body2" gutterBottom>
                  Playback Speed: {playbackSpeed}x
                </Typography>
                <Slider
                  value={playbackSpeed}
                  min={0.1}
                  max={5.0}
                  step={0.1}
                  onChange={(e, value) => setPlaybackSpeed(value)}
                  onChangeCommitted={(e, value) => controlSimulation('set_speed', value)}
                  disabled={!isConnected}
                  marks={[
                    { value: 0.5, label: '0.5x' },
                    { value: 1, label: '1x' },
                    { value: 2, label: '2x' },
                    { value: 5, label: '5x' },
                  ]}
                />
              </Box>
            </Grid>

            {/* Progress */}
            <Grid item xs={12} sm={4}>
              <Box>
                <Typography variant="body2" gutterBottom>
                  {simulationStatus.random_mode ? (
                    <>
                      Processed: {simulationStatus.processed_packets} / {simulationStatus.total_rows} 
                      ({simulationStatus.progress_percent.toFixed(1)}%) | Remaining: {simulationStatus.remaining_packets}
                    </>
                  ) : (
                    <>
                  Progress: {simulationStatus.current_row} / {simulationStatus.total_rows} 
                  ({simulationStatus.progress_percent.toFixed(1)}%)
                    </>
                  )}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={simulationStatus.progress_percent}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <Tabs 
          value={currentTab} 
          onChange={(e, newValue) => setCurrentTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Live Traffic" />
          <Tab label="Attack Timeline" />
          <Tab label="Network Graph" />
          <Tab label="Statistics" />
        </Tabs>

        {/* Live Traffic Tab */}
        <TabPanel value={currentTab} index={0}>
          <CardContent>
            {/* Filters */}
            <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => setShowFilters(!showFilters)}
              >
                Filters
              </Button>
              
              <FormControlLabel
                control={<Switch checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />}
                label="Auto-scroll"
              />

              <Typography variant="body2" color="textSecondary">
                Showing {filteredClassifications.length} of {recentClassifications.length} packets
              </Typography>
            </Box>

            {/* Filter Controls */}
            {showFilters && (
              <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Severity</InputLabel>
                      <Select
                        value={filters.severity}
                        onChange={(e) => setFilters({...filters, severity: e.target.value})}
                        label="Severity"
                      >
                        <MenuItem value="all">All Severities</MenuItem>
                        <MenuItem value="normal">Normal</MenuItem>
                        <MenuItem value="low">Low</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="high">High</MenuItem>
                        <MenuItem value="critical">Critical</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Attack Type</InputLabel>
                      <Select
                        value={filters.attack_type}
                        onChange={(e) => setFilters({...filters, attack_type: e.target.value})}
                        label="Attack Type"
                      >
                        <MenuItem value="all">All Types</MenuItem>
                        <MenuItem value="normal">Normal</MenuItem>
                        <MenuItem value="dos">DoS</MenuItem>
                        <MenuItem value="probe">Probe</MenuItem>
                        <MenuItem value="r2l">R2L</MenuItem>
                        <MenuItem value="u2r">U2R</MenuItem>
                        <MenuItem value="modbus_attack">Modbus Attack</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Protocol</InputLabel>
                      <Select
                        value={filters.protocol}
                        onChange={(e) => setFilters({...filters, protocol: e.target.value})}
                        label="Protocol"
                      >
                        <MenuItem value="all">All Protocols</MenuItem>
                        <MenuItem value="TCP">TCP</MenuItem>
                        <MenuItem value="UDP">UDP</MenuItem>
                        <MenuItem value="Modbus">Modbus</MenuItem>
                        <MenuItem value="ICMP">ICMP</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Paper>
            )}

            {/* Live Traffic Table */}
            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Source IP</TableCell>
                    <TableCell>Destination IP</TableCell>
                    <TableCell>Protocol</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Classification</TableCell>
                    <TableCell>Confidence</TableCell>
                    <TableCell>Severity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredClassifications
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row, index) => (
                    <TableRow 
                      key={row.packet_id} 
                      sx={{ 
                        backgroundColor: row.attack_type ? SEVERITY_COLORS[row.severity] + '20' : 'inherit',
                        '&:hover': { backgroundColor: 'action.hover' }
                      }}
                    >
                      <TableCell>
                        <Typography variant="caption">
                          {new Date(row.timestamp).toLocaleTimeString()}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.source_ip}</TableCell>
                      <TableCell>{row.destination_ip}</TableCell>
                      <TableCell>
                        <Chip label={row.protocol} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{row.packet_size} B</TableCell>
                      <TableCell>
                        <Chip
                          label={row.predicted_class}
                          size="small"
                          color={row.attack_type ? 'error' : 'success'}
                          variant={row.attack_type ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {(row.confidence * 100).toFixed(1)}%
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row.severity}
                          size="small"
                          sx={{
                            backgroundColor: SEVERITY_COLORS[row.severity],
                            color: 'white',
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={filteredClassifications.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </CardContent>
        </TabPanel>

        {/* Attack Timeline Tab */}
        <TabPanel value={currentTab} index={1}>
          <CardContent>
            <Grid container spacing={3}>
              {/* Timeline Chart */}
              <Grid item xs={12} lg={8}>
                <Typography variant="h6" gutterBottom>
                  Attack Activity Timeline (Last Hour)
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={attackTimelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <RechartsTooltip />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#f44336"
                      fill="#f44336"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Grid>

              {/* Attack Distribution */}
              <Grid item xs={12} lg={4}>
                <Typography variant="h6" gutterBottom>
                  Attack Type Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={attackDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {attackDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Grid>

              {/* Recent Attacks List */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Recent Attacks
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Time</TableCell>
                        <TableCell>Attack Type</TableCell>
                        <TableCell>Source IP</TableCell>
                        <TableCell>Target IP</TableCell>
                        <TableCell>Severity</TableCell>
                        <TableCell>Confidence</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {attackTimeline.slice(0, 10).map((attack, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="caption">
                              {new Date(attack.timestamp).toLocaleTimeString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={attack.attack_type}
                              size="small"
                              color="error"
                            />
                          </TableCell>
                          <TableCell>{attack.source_ip}</TableCell>
                          <TableCell>{attack.destination_ip}</TableCell>
                          <TableCell>
                            <Chip
                              label={attack.severity}
                              size="small"
                              sx={{
                                backgroundColor: SEVERITY_COLORS[attack.severity],
                                color: 'white',
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            {(attack.confidence * 100).toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </CardContent>
        </TabPanel>

        {/* Network Graph Tab */}
        <TabPanel value={currentTab} index={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Real-time Network Traffic Graph
            </Typography>
            <RealTimeNetworkGraph data={networkGraphData} />
          </CardContent>
        </TabPanel>

        {/* Statistics Tab */}
        <TabPanel value={currentTab} index={3}>
          <CardContent>
            <Grid container spacing={3}>
              {/* Overview Stats */}
              <Grid item xs={12} md={6} lg={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="primary">
                      Total Packets
                    </Typography>
                    <Typography variant="h3">
                      {statistics.total_packets_processed || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6} lg={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="error">
                      Attacks Detected
                    </Typography>
                    <Typography variant="h3">
                      {statistics.total_attacks || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6} lg={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="warning">
                      Attack Rate
                    </Typography>
                    <Typography variant="h3">
                      {(statistics.attack_rate_percent || 0).toFixed(1)}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6} lg={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="info">
                      Detection Rate
                    </Typography>
                    <Typography variant="h3">
                      {statistics.recent_attack_rate || 0}/min
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Severity Distribution Chart */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Severity Distribution
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={severityDistributionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <RechartsTooltip />
                        <Bar dataKey="value" fill="#2196f3" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Protocol Distribution Chart */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Protocol Distribution
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={Object.entries(statistics.protocol_distribution || {}).map(([protocol, count]) => ({
                            name: protocol,
                            value: count,
                          }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="value"
                          fill="#2196f3"
                        >
                          {Object.entries(statistics.protocol_distribution || {}).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`hsl(${index * 60}, 70%, 50%)`} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </TabPanel>
      </Card>
    </Box>
  );
}

export default RealTimeSecurityDashboard; 