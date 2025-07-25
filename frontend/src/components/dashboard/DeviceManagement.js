import React, { useState } from 'react';
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
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';

const DEVICE_TYPE_COLORS = {
  'PLC': '#1976d2',
  'HMI': '#388e3c',
  'SCADA': '#f57c00',
  'RTU': '#7b1fa2',
  'Historian': '#d32f2f',
};

function DeviceManagement({ devices = [], onToggleDevice, onRefresh }) {
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuDevice, setMenuDevice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

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
      await onToggleDevice(deviceId);
      handleMenuClose();
    } catch (error) {
      console.error('Error toggling device:', error);
    }
  };

  const getDeviceStatusIcon = (device) => {
    if (!device.is_online) return <ErrorIcon color="error" />;
    if (device.risk_score > 70) return <WarningIcon color="warning" />;
    return <CheckCircleIcon color="success" />;
  };

  const getDeviceTypeIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'plc': return <ComputerIcon />;
      case 'hmi': return <NetworkCheckIcon />;
      case 'scada': return <SecurityIcon />;
      case 'rtu': return <MemoryIcon />;
      case 'historian': return <TimelineIcon />;
      default: return <ComputerIcon />;
    }
  };

  const getRiskColor = (score) => {
    if (score < 30) return 'success';
    if (score < 60) return 'warning';
    return 'error';
  };

  // Filter devices
  const filteredDevices = (devices || []).filter(device => {
    const matchesSearch = searchTerm === '' || 
      (device.hostname && device.hostname.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (device.ip_address && device.ip_address.includes(searchTerm)) ||
      (device.device_type && device.device_type.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === '' || device.device_type === filterType;
    const matchesStatus = filterStatus === '' || 
      (filterStatus === 'online' ? device.is_online : !device.is_online);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Device statistics
  const safeDevices = devices || [];
  const deviceStats = {
    total: safeDevices.length,
    online: safeDevices.filter(d => d.is_online).length,
    offline: safeDevices.filter(d => !d.is_online).length,
    highRisk: safeDevices.filter(d => (d.risk_score || 0) > 70).length,
    avgCpuUsage: safeDevices.length > 0 ? safeDevices.reduce((sum, d) => sum + (d.cpu_usage || 0), 0) / safeDevices.length : 0,
    avgMemoryUsage: safeDevices.length > 0 ? safeDevices.reduce((sum, d) => sum + (d.memory_usage || 0), 0) / safeDevices.length : 0,
  };

  // Device type distribution
  const deviceTypeData = Object.entries(
    safeDevices.reduce((acc, device) => {
      const deviceType = device.device_type || 'Unknown';
      acc[deviceType] = (acc[deviceType] || 0) + 1;
      return acc;
    }, {})
  ).map(([type, count]) => ({
    name: type,
    value: count,
    color: DEVICE_TYPE_COLORS[type] || '#757575'
  }));

  // Performance metrics
  const performanceData = safeDevices.map(device => ({
    name: device.hostname || 'Unknown',
    cpu: device.cpu_usage || 0,
    memory: device.memory_usage || 0,
    temperature: device.temperature || 0,
    risk: device.risk_score || 0,
  }));

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold" color="primary">
          Device Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={onRefresh}
          color="primary"
        >
          Refresh
        </Button>
      </Box>

      {/* Device Statistics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="h6">
                    Total Devices
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {deviceStats.total}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    All registered devices
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#2196f3', width: 60, height: 60 }}>
                  <ComputerIcon fontSize="large" />
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
                    Online Devices
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" color="success.main">
                    {deviceStats.online}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {((deviceStats.online / deviceStats.total) * 100).toFixed(1)}% uptime
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#4caf50', width: 60, height: 60 }}>
                  <CheckCircleIcon fontSize="large" />
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
                    High Risk
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" color="error.main">
                    {deviceStats.highRisk}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Risk score &gt; 70
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#f44336', width: 60, height: 60 }}>
                  <WarningIcon fontSize="large" />
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
                    Avg CPU Usage
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {deviceStats.avgCpuUsage.toFixed(1)}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={deviceStats.avgCpuUsage} 
                    sx={{ mt: 1, height: 6, borderRadius: 3 }}
                  />
                </Box>
                <Avatar sx={{ bgcolor: '#ff9800', width: 60, height: 60 }}>
                  <MemoryIcon fontSize="large" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} mb={4}>
        {/* Device Type Distribution */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Device Type Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={deviceTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {deviceTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Overview */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Performance Overview
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceData.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="cpu" fill="#2196f3" name="CPU %" />
                  <Bar dataKey="memory" fill="#ff9800" name="Memory %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search devices"
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                select
                label="Device Type"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                size="small"
              >
                <MenuItem value="">All Types</MenuItem>
                {Object.keys(DEVICE_TYPE_COLORS).map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                select
                label="Status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                size="small"
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="online">Online</MenuItem>
                <MenuItem value="offline">Offline</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Device Table */}
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Device</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>IP Address</TableCell>
                  <TableCell>Performance</TableCell>
                  <TableCell>Risk Score</TableCell>
                  <TableCell>Last Seen</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDevices
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((device) => (
                    <TableRow key={device.id} hover sx={{ cursor: 'pointer' }}>
                      <TableCell onClick={() => handleDeviceClick(device)}>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getDeviceStatusIcon(device)}
                          <Chip
                            label={device.is_online ? 'Online' : 'Offline'}
                            color={device.is_online ? 'success' : 'error'}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      </TableCell>
                      <TableCell onClick={() => handleDeviceClick(device)}>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar sx={{ bgcolor: DEVICE_TYPE_COLORS[device.device_type] }}>
                            {getDeviceTypeIcon(device.device_type)}
                          </Avatar>
                          <Box>
                            <Typography variant="body1" fontWeight="medium">
                              {device.hostname}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {device.vendor} {device.model}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell onClick={() => handleDeviceClick(device)}>
                        <Chip
                          label={device.device_type}
                          size="small"
                          sx={{ bgcolor: DEVICE_TYPE_COLORS[device.device_type], color: 'white' }}
                        />
                      </TableCell>
                      <TableCell onClick={() => handleDeviceClick(device)}>
                        <Typography variant="body2" fontFamily="monospace">
                          {device.ip_address}
                        </Typography>
                      </TableCell>
                      <TableCell onClick={() => handleDeviceClick(device)}>
                        <Box sx={{ minWidth: 120 }}>
                          <Box display="flex" justifyContent="space-between" mb={0.5}>
                            <Typography variant="caption">CPU</Typography>
                            <Typography variant="caption">{(device.cpu_usage || 0).toFixed(1)}%</Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={device.cpu_usage || 0} 
                            size="small"
                            sx={{ height: 4, borderRadius: 2, mb: 1 }}
                          />
                          <Box display="flex" justifyContent="space-between" mb={0.5}>
                            <Typography variant="caption">Memory</Typography>
                            <Typography variant="caption">{(device.memory_usage || 0).toFixed(1)}%</Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={device.memory_usage || 0} 
                            color="warning"
                            size="small"
                            sx={{ height: 4, borderRadius: 2 }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell onClick={() => handleDeviceClick(device)}>
                        <Chip
                          label={(device.risk_score || 0).toFixed(0)}
                          color={getRiskColor(device.risk_score || 0)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell onClick={() => handleDeviceClick(device)}>
                        <Typography variant="body2">
                          {new Date(device.last_seen).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton 
                          onClick={(e) => handleMenuOpen(e, device)}
                          size="small"
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
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredDevices.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
          />
        </CardContent>
      </Card>

      {/* Device Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleDeviceClick(menuDevice)}>
          <InfoIcon sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={() => handleToggleDevice(menuDevice?.id)}>
          <PowerIcon sx={{ mr: 1 }} />
          {menuDevice?.is_online ? 'Take Offline' : 'Bring Online'}
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <EditIcon sx={{ mr: 1 }} />
          Edit Configuration
        </MenuItem>
      </Menu>

      {/* Device Detail Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            {selectedDevice && (
              <Avatar sx={{ bgcolor: DEVICE_TYPE_COLORS[selectedDevice.device_type] }}>
                {getDeviceTypeIcon(selectedDevice.device_type)}
              </Avatar>
            )}
            Device Details - {selectedDevice?.hostname}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedDevice && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Basic Information</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">Hostname</Typography>
                  <Typography variant="body1">{selectedDevice.hostname}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">IP Address</Typography>
                  <Typography variant="body1" fontFamily="monospace">{selectedDevice.ip_address}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">Device Type</Typography>
                  <Typography variant="body1">{selectedDevice.device_type}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">Vendor</Typography>
                  <Typography variant="body1">{selectedDevice.vendor}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">Model</Typography>
                  <Typography variant="body1">{selectedDevice.model}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">Location</Typography>
                  <Typography variant="body1">{selectedDevice.location}</Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Status & Performance</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">Status</Typography>
                  <Chip
                    icon={getDeviceStatusIcon(selectedDevice)}
                    label={selectedDevice.is_online ? 'Online' : 'Offline'}
                    color={selectedDevice.is_online ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">Risk Score</Typography>
                  <Box display="flex" alignItems="center" gap={2}>
                    <LinearProgress 
                      variant="determinate" 
                      value={selectedDevice.risk_score || 0} 
                      sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="body1">{(selectedDevice.risk_score || 0).toFixed(0)}/100</Typography>
                  </Box>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">CPU Usage</Typography>
                  <Box display="flex" alignItems="center" gap={2}>
                    <LinearProgress 
                      variant="determinate" 
                      value={selectedDevice.cpu_usage || 0} 
                      sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="body1">{(selectedDevice.cpu_usage || 0).toFixed(1)}%</Typography>
                  </Box>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">Memory Usage</Typography>
                  <Box display="flex" alignItems="center" gap={2}>
                    <LinearProgress 
                      variant="determinate" 
                      value={selectedDevice.memory_usage || 0} 
                      color="warning"
                      sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="body1">{(selectedDevice.memory_usage || 0).toFixed(1)}%</Typography>
                  </Box>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">Temperature</Typography>
                  <Typography variant="body1">{(selectedDevice.temperature || 0).toFixed(1)}°C</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">Last Seen</Typography>
                  <Typography variant="body1">{new Date(selectedDevice.last_seen).toLocaleString()}</Typography>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Protocols</Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {(selectedDevice.protocols || []).map((protocol, index) => (
                    <Chip 
                      key={index}
                      label={`${protocol.name}${protocol.port ? ` (${protocol.port})` : ''}`}
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
          {selectedDevice && (
            <Button 
              onClick={() => handleToggleDevice(selectedDevice.id)}
              variant="contained"
              color={selectedDevice.is_online ? 'error' : 'success'}
            >
              {selectedDevice.is_online ? 'Take Offline' : 'Bring Online'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default DeviceManagement;
