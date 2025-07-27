import React, { useState, useEffect } from 'react';
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
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Avatar,
  LinearProgress,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Divider,
  Paper,
} from '@mui/material';
import {
  Computer as ComputerIcon,
  Memory as MemoryIcon,
  NetworkCheck as NetworkCheckIcon,
  Security as SecurityIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  PowerSettingsNew as PowerIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Timeline as TimelineIcon,
  Search as SearchIcon,
  Storage as StorageIcon,
  Router as RouterIcon,
  Devices as DevicesIcon,
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, LineChart, Line } from 'recharts';

const DEVICE_TYPE_COLORS = {
  'plc': '#1976d2',
  'hmi': '#388e3c',
  'scada': '#f57c00',
  'rtu': '#7b1fa2',
  'historian': '#d32f2f',
  'default': '#757575'
};

const DARK_COLORS = ['#00ffff', '#ffab00', '#ff1744', '#00e676', '#7c4dff', '#ff6f00'];

function DeviceManagement({ devices = [], onToggleDevice, onRefresh }) {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deviceMetrics, setDeviceMetrics] = useState({});
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [deviceStats, setDeviceStats] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuDevice, setMenuDevice] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);

  useEffect(() => {
    loadDeviceData();
    const interval = setInterval(loadDeviceData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDeviceData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Calculate device metrics
      const metrics = calculateDeviceMetrics(devices);
      setDeviceMetrics(metrics);
      setFilteredDevices(devices);

      // Generate device type statistics
      const typeStats = {};
      devices.forEach(device => {
        const type = device.type || device.device_type || 'Unknown';
        typeStats[type] = (typeStats[type] || 0) + 1;
      });

      const statsData = Object.entries(typeStats).map(([type, count], index) => ({
        type: type.toUpperCase(),
        count,
        color: DARK_COLORS[index % DARK_COLORS.length]
      }));
      setDeviceStats(statsData);

    } catch (error) {
      console.error('Error loading device data:', error);
      setError('Failed to load device data');
    } finally {
      setLoading(false);
    }
  };

  const calculateDeviceMetrics = (deviceList) => {
    const total = deviceList.length;
    const online = deviceList.filter(d => d.status === 'online').length;
    const offline = deviceList.filter(d => d.status === 'offline').length;
    const warning = deviceList.filter(d => d.status === 'warning').length;
    
    return {
      total,
      online,
      offline,
      warning,
      healthScore: total > 0 ? Math.round((online / total) * 100) : 0
    };
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const filterDevices = (search, status, type) => {
    let filtered = devices;
    
    if (search) {
      filtered = filtered.filter(device => 
        device.name?.toLowerCase().includes(search.toLowerCase()) ||
        device.hostname?.toLowerCase().includes(search.toLowerCase()) ||
        device.type?.toLowerCase().includes(search.toLowerCase()) ||
        device.device_type?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (status !== 'all') {
      filtered = filtered.filter(device => 
        device.status === status || 
        (status === 'online' && device.is_online) ||
        (status === 'offline' && !device.is_online)
      );
    }

    if (type !== 'all') {
      filtered = filtered.filter(device => 
        device.type === type || device.device_type === type
      );
    }
    
    setFilteredDevices(filtered);
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    filterDevices(event.target.value, filterStatus, filterType);
  };

  const handleFilterChange = (event) => {
    setFilterStatus(event.target.value);
    filterDevices(searchTerm, event.target.value, filterType);
  };

  const handleTypeFilterChange = (event) => {
    setFilterType(event.target.value);
    filterDevices(searchTerm, filterStatus, event.target.value);
  };

  const handleDeviceClick = (device) => {
    setSelectedDevice(device);
    setDialogOpen(true);
  };

  const handleMenuOpen = (event, device) => {
    setAnchorEl(event.currentTarget);
    setMenuDevice(device);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuDevice(null);
  };

  const handleToggleDevice = async (deviceId) => {
    try {
      if (onToggleDevice) {
        await onToggleDevice(deviceId);
      }
      handleMenuClose();
    } catch (error) {
      console.error('Error toggling device:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#00e676';
      case 'offline': return '#ff1744';
      case 'warning': return '#ffab00';
      default: return '#9e9e9e';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online': return <CheckCircleIcon />;
      case 'offline': return <ErrorIcon />;
      case 'warning': return <WarningIcon />;
      default: return <DevicesIcon />;
    }
  };

  const getDeviceStatusIcon = (device) => {
    if (!device.is_online) return <ErrorIcon sx={{ color: '#f44336' }} />;
    if ((device.risk_score || 0) > 70) return <WarningIcon sx={{ color: '#ff9800' }} />;
    return <CheckCircleIcon sx={{ color: '#4caf50' }} />;
  };

  const getDeviceTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'plc': return <ComputerIcon />;
      case 'hmi': return <NetworkCheckIcon />;
      case 'scada': return <SecurityIcon />;
      case 'rtu': return <MemoryIcon />;
      case 'historian': return <TimelineIcon />;
      default: return <StorageIcon />;
    }
  };

  const getRiskColor = (riskScore) => {
    if (riskScore > 70) return '#f44336';
    if (riskScore > 40) return '#ff9800';
    return '#4caf50';
  };

  const getUptimeColor = (uptime) => {
    if (uptime >= 99) return '#4caf50';
    if (uptime >= 95) return '#ff9800';
    return '#f44336';
  };

  // Filter devices
  const paginatedDevices = filteredDevices.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ 
      background: 'linear-gradient(135deg, #020508 0%, #0a0f1a 50%, #0f1322 100%)',
      minHeight: '100vh',
      p: 3
    }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold" sx={{ 
          background: 'linear-gradient(45deg, #00e676 30%, #4caf50 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Device Management Center
        </Typography>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={() => {
            onRefresh?.();
            loadDeviceData();
          }}
          sx={{
            background: 'linear-gradient(135deg, #00e676 0%, #4caf50 100%)',
            color: '#000000',
            fontWeight: 600,
            '&:hover': {
              background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)'
            }
          }}
        >
          Refresh
        </Button>
      </Box>

      {/* Device Metrics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #1e2a4a 0%, #2d3561 100%)',
            border: '1px solid #00bcd4',
            color: 'white'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="#00bcd4">
                    {deviceMetrics.total}
                  </Typography>
                  <Typography variant="body2" color="rgba(255,255,255,0.7)">
                    Total Devices
                  </Typography>
                </Box>
                <ComputerIcon sx={{ fontSize: 40, color: '#00bcd4' }} />
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
                    {deviceMetrics.online}
                  </Typography>
                  <Typography variant="body2" color="rgba(255,255,255,0.7)">
                    Online
                  </Typography>
                </Box>
                <CheckCircleIcon sx={{ fontSize: 40, color: '#4caf50' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #bf360c 0%, #d84315 100%)',
            border: '1px solid #f44336',
            color: 'white'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="#f44336">
                    {deviceMetrics.warning}
                  </Typography>
                  <Typography variant="body2" color="rgba(255,255,255,0.7)">
                    Warning
                  </Typography>
                </Box>
                <WarningIcon sx={{ fontSize: 40, color: '#f44336' }} />
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
                    {deviceMetrics.healthScore}%
                  </Typography>
                  <Typography variant="body2" color="rgba(255,255,255,0.7)">
                    Health Score
                  </Typography>
                </Box>
                <SecurityIcon sx={{ fontSize: 40, color: '#9c27b0' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Device Analytics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #1a1f3a 0%, #2a2d5a 100%)',
            border: '1px solid #ff9800',
            color: 'white'
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold" color="#ff9800">
                Device Type Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={deviceStats}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ type, count }) => `${type}: ${count}`}
                  >
                    {deviceStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{
                      backgroundColor: '#1a1f3a',
                      border: '1px solid #ff9800',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #1a1f3a 0%, #2a2d5a 100%)',
            border: '1px solid #4caf50',
            color: 'white'
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold" color="#4caf50">
                System Health Overview
              </Typography>
              <Box sx={{ mt: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="body2" color="white">Network Uptime</Typography>
                  <Typography variant="body2" color="#4caf50" fontWeight="bold">
                    {deviceMetrics.uptime}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={deviceMetrics.uptime}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getUptimeColor(deviceMetrics.uptime),
                      borderRadius: 4
                    }
                  }}
                />

                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} mt={3}>
                  <Typography variant="body2" color="white">Device Health</Typography>
                  <Typography variant="body2" color="#00bcd4" fontWeight="bold">
                    {Math.round(((deviceMetrics.online || 0) / Math.max(deviceMetrics.total, 1)) * 100)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={((deviceMetrics.online || 0) / Math.max(deviceMetrics.total, 1)) * 100}
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

                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} mt={3}>
                  <Typography variant="body2" color="white">Security Level</Typography>
                  <Typography variant="body2" color="#ff9800" fontWeight="bold">
                    {100 - deviceMetrics.avgRiskScore}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={100 - deviceMetrics.avgRiskScore}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getRiskColor(deviceMetrics.avgRiskScore),
                      borderRadius: 4
                    }
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Device Table */}
      <Card sx={{ 
        background: 'linear-gradient(135deg, #1a1f3a 0%, #2a2d5a 100%)',
        border: '1px solid #00bcd4',
        color: 'white'
      }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold" color="#00bcd4">
            Device Inventory
          </Typography>

          {/* Filters */}
          <Box mb={3}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Search devices..."
                  value={searchTerm}
                  onChange={handleSearch}
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
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Device Type</InputLabel>
                  <Select
                    value={filterType}
                    onChange={handleTypeFilterChange}
                    sx={{
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00ffff' }
                    }}
                  >
                    <MenuItem value="all">All Types</MenuItem>
                    <MenuItem value="PLC">PLC</MenuItem>
                    <MenuItem value="HMI">HMI</MenuItem>
                    <MenuItem value="SCADA">SCADA</MenuItem>
                    <MenuItem value="Sensor">Sensor</MenuItem>
                    <MenuItem value="Actuator">Actuator</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Status</InputLabel>
                  <Select
                    value={filterStatus}
                    onChange={handleFilterChange}
                    sx={{
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00bcd4' }
                    }}
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="online">Online</MenuItem>
                    <MenuItem value="offline">Offline</MenuItem>
                    <MenuItem value="warning">Warning</MenuItem>
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
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Device</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Type</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Risk Score</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Last Seen</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedDevices.map((device, index) => (
                  <TableRow 
                    key={device.id || index}
                    sx={{ 
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
                      cursor: 'pointer'
                    }}
                    onClick={() => handleDeviceClick(device)}
                  >
                    <TableCell sx={{ color: 'white' }}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ 
                          bgcolor: DEVICE_TYPE_COLORS[device.device_type] || DEVICE_TYPE_COLORS.default,
                          width: 32,
                          height: 32
                        }}>
                          {getDeviceTypeIcon(device.device_type)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="bold" color="white">
                            {device.hostname}
                          </Typography>
                          <Typography variant="caption" color="rgba(255,255,255,0.7)">
                            {device.ip_address}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: 'white' }}>
                      <Chip
                        label={device.device_type?.toUpperCase() || 'UNKNOWN'}
                        size="small"
                        sx={{
                          backgroundColor: DEVICE_TYPE_COLORS[device.device_type] || DEVICE_TYPE_COLORS.default,
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getDeviceStatusIcon(device)}
                        <Chip
                          label={device.is_online ? 'ONLINE' : 'OFFLINE'}
                          size="small"
                          sx={{
                            backgroundColor: device.is_online ? '#4caf50' : '#f44336',
                            color: 'white',
                            fontWeight: 'bold'
                          }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Typography variant="body2" color="white" fontWeight="bold">
                          {device.risk_score || 0}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={device.risk_score || 0}
                          sx={{
                            width: 60,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: getRiskColor(device.risk_score || 0),
                              borderRadius: 3
                            }
                          }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: 'white' }}>
                      {device.last_seen ? new Date(device.last_seen).toLocaleString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMenuOpen(e, device);
                        }}
                        sx={{ color: 'rgba(255,255,255,0.7)' }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filteredDevices.length}
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
        </CardContent>
      </Card>

      {/* Device Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #1a1f3a 0%, #2a2d5a 100%)',
            border: '1px solid #00bcd4',
            color: 'white'
          }
        }}
      >
        <MenuItem onClick={() => handleDeviceClick(menuDevice)}>
          <InfoIcon sx={{ mr: 2 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={() => handleToggleDevice(menuDevice?.id)}>
          <PowerIcon sx={{ mr: 2 }} />
          {menuDevice?.is_online ? 'Disconnect' : 'Connect'}
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <EditIcon sx={{ mr: 2 }} />
          Edit Configuration
        </MenuItem>
      </Menu>

      {/* Device Detail Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
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
          Device Details
        </DialogTitle>
        <DialogContent>
          {selectedDevice && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Box mb={2}>
                  <Typography variant="body2" color="rgba(255,255,255,0.7)">Hostname</Typography>
                  <Typography variant="body1" color="white" fontWeight="bold">
                    {selectedDevice.hostname}
                  </Typography>
                </Box>
                <Box mb={2}>
                  <Typography variant="body2" color="rgba(255,255,255,0.7)">IP Address</Typography>
                  <Typography variant="body1" color="white" fontWeight="bold">
                    {selectedDevice.ip_address}
                  </Typography>
                </Box>
                <Box mb={2}>
                  <Typography variant="body2" color="rgba(255,255,255,0.7)">Device Type</Typography>
                  <Chip
                    label={selectedDevice.device_type?.toUpperCase() || 'UNKNOWN'}
                    sx={{
                      backgroundColor: DEVICE_TYPE_COLORS[selectedDevice.device_type] || DEVICE_TYPE_COLORS.default,
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box mb={2}>
                  <Typography variant="body2" color="rgba(255,255,255,0.7)">Status</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getDeviceStatusIcon(selectedDevice)}
                    <Typography variant="body1" color="white" fontWeight="bold">
                      {selectedDevice.is_online ? 'Online' : 'Offline'}
                    </Typography>
                  </Box>
                </Box>
                <Box mb={2}>
                  <Typography variant="body2" color="rgba(255,255,255,0.7)">Risk Score</Typography>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="h6" color={getRiskColor(selectedDevice.risk_score || 0)} fontWeight="bold">
                      {selectedDevice.risk_score || 0}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={selectedDevice.risk_score || 0}
                      sx={{
                        width: 100,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: getRiskColor(selectedDevice.risk_score || 0),
                          borderRadius: 4
                        }
                      }}
                    />
                  </Box>
                </Box>
                <Box mb={2}>
                  <Typography variant="body2" color="rgba(255,255,255,0.7)">Last Seen</Typography>
                  <Typography variant="body1" color="white" fontWeight="bold">
                    {selectedDevice.last_seen ? new Date(selectedDevice.last_seen).toLocaleString() : 'Never'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 2 }} />
                <Typography variant="h6" color="#00bcd4" gutterBottom>
                  Protocols
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {selectedDevice.protocols?.map((protocol, index) => (
                    <Chip
                      key={index}
                      label={protocol.name}
                      size="small"
                      sx={{
                        backgroundColor: DARK_COLORS[index % DARK_COLORS.length],
                        color: 'white'
                      }}
                    />
                  )) || (
                    <Typography variant="body2" color="rgba(255,255,255,0.7)">
                      No protocols configured
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDialogOpen(false)}
            sx={{ color: 'rgba(255,255,255,0.7)' }}
          >
            Close
          </Button>
          <Button 
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #00bcd4 0%, #0288d1 100%)',
              color: 'white'
            }}
          >
            Edit Device
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default DeviceManagement;
