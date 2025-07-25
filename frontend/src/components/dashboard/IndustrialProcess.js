import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, Switch, FormControlLabel,
  Alert, LinearProgress, IconButton, Tooltip
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as OkIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
         Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import ApiService from '../../services/ApiService';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const IndustrialProcess = () => {
  const [processData, setProcessData] = useState(null);
  const [processOverview, setProcessOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const loadProcessData = async () => {
    try {
      const [pointsResponse, overviewResponse] = await Promise.all([
        ApiService.getProcessPoints(),
        ApiService.getProcessOverview()
      ]);
      
      if (pointsResponse.data && pointsResponse.data.data) {
        setProcessData(pointsResponse.data.data);
      }
      
      if (overviewResponse.data && overviewResponse.data.data) {
        setProcessOverview(overviewResponse.data.data);
      }
      
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error loading process data:', error);
      setLoading(false);
    }
  };

  const handleProcessControl = async (pointId, action) => {
    try {
      await ApiService.controlProcessPoint(pointId, action);
      // Reload data after control action
      loadProcessData();
    } catch (error) {
      console.error('Error controlling process:', error);
    }
  };

  useEffect(() => {
    loadProcessData();
  }, []);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(loadProcessData, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  if (loading) {
    return <LinearProgress />;
  }

  if (!processData || !processOverview) {
    return (
      <Alert severity="warning">
        No industrial process data available
      </Alert>
    );
  }

  const { points } = processData;
  const overview = processOverview;

  // Separate data by type
  const valves = points.filter(p => p.type === 'valve_position');
  const flows = points.filter(p => p.type === 'flow_rate');
  const compositions = points.filter(p => p.type === 'composition');
  const physicalParams = points.filter(p => ['pressure', 'level'].includes(p.type));
  const runStatus = points.find(p => p.type === 'digital_control');

  const getAlarmIcon = (status) => {
    switch (status) {
      case 'critical': return <ErrorIcon color="error" />;
      case 'warning': return <WarningIcon color="warning" />;
      default: return <OkIcon color="success" />;
    }
  };

  const getAlarmColor = (status) => {
    switch (status) {
      case 'critical': return 'error';
      case 'warning': return 'warning';
      default: return 'success';
    }
  };

  // Prepare chart data
  const valveChartData = valves.map(v => ({
    name: v.name,
    value: v.value,
    fill: v.alarm_status === 'normal' ? '#00C49F' : '#FF8042'
  }));

  const flowChartData = flows.map(f => ({
    name: f.name,
    value: f.value,
    unit: f.unit
  }));

  const compositionChartData = compositions.map(c => ({
    name: c.name,
    value: c.value
  }));

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {processData.process_name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch 
                checked={autoRefresh} 
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            }
            label="Auto Refresh"
          />
          <Tooltip title="Refresh Data">
            <IconButton onClick={loadProcessData}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          {lastUpdate && (
            <Typography variant="caption" color="textSecondary">
              Last update: {lastUpdate.toLocaleTimeString()}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Process Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Process Status
                  </Typography>
                  <Typography variant="h6">
                    {overview.process_status ? 'RUNNING' : 'STOPPED'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {runStatus && (
                    <>
                      <Button
                        variant="contained"
                        color={runStatus.value ? "error" : "success"}
                        size="small"
                        startIcon={runStatus.value ? <StopIcon /> : <StartIcon />}
                        onClick={() => handleProcessControl(runStatus.id, { value: !runStatus.value })}
                      >
                        {runStatus.value ? 'STOP' : 'START'}
                      </Button>
                    </>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Alarms
              </Typography>
              <Typography variant="h4" color={overview.alarm_count > 0 ? "error.main" : "success.main"}>
                {overview.alarm_count}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {overview.critical_alarms} Critical, {overview.warning_alarms} Warning
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Flow Rate
              </Typography>
              <Typography variant="h4">
                {overview.total_flow_rate.toFixed(1)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                kMol/h
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                System Pressure
              </Typography>
              <Typography variant="h4" color={overview.pressure > 900 ? "error.main" : "textPrimary"}>
                {overview.pressure.toFixed(1)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                kPa
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Valve Positions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Valve Positions
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={valveChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip formatter={(value) => [`${value}%`, 'Position']} />
                  <Bar dataKey="value" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Flow Rates */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Flow Rates
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={flowChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip formatter={(value) => [`${value} kMol/h`, 'Flow Rate']} />
                  <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Compositions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Component Concentrations
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={compositionChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {compositionChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Physical Parameters */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Physical Parameters
              </Typography>
              <Box sx={{ mt: 2 }}>
                {physicalParams.map((param) => (
                  <Box key={param.id} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body1">
                        {param.description}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getAlarmIcon(param.alarm_status)}
                        <Typography variant="h6">
                          {param.value.toFixed(1)} {param.unit}
                        </Typography>
                      </Box>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={param.type === 'pressure' ? (param.value / 1000) * 100 : param.value}
                      color={getAlarmColor(param.alarm_status)}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Process Points Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Process Points Detail
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Point Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Current Value</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Register</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {points.map((point) => (
                  <TableRow key={point.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {point.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{point.description}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {typeof point.value === 'boolean' 
                          ? (point.value ? 'ON' : 'OFF')
                          : point.value.toFixed(2)
                        }
                      </Typography>
                    </TableCell>
                    <TableCell>{point.unit}</TableCell>
                    <TableCell>
                      <Chip 
                        label={point.type.replace('_', ' ').toUpperCase()} 
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={point.alarm_status.toUpperCase()}
                        color={getAlarmColor(point.alarm_status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{point.register}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default IndustrialProcess;
