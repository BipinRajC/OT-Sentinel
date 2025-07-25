import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Box, Typography, Grid, useTheme } from '@mui/material';

/**
 * Device Health Status component
 * Shows a pie chart of device health status
 */
function DeviceHealthStatus({ devices }) {
  const theme = useTheme();

  if (!devices || devices.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="text.secondary">No device data available</Typography>
      </Box>
    );
  }
  
  // Count devices by health status
  const statusCounts = {
    healthy: 0,
    warning: 0,
    critical: 0,
    offline: 0
  };
  
  devices.forEach(device => {
    if (!device.is_online) {
      statusCounts.offline++;
    } else if (device.risk_score > 70) {
      statusCounts.critical++;
    } else if (device.risk_score > 30) {
      statusCounts.warning++;
    } else {
      statusCounts.healthy++;
    }
  });
  
  // Prepare data for the pie chart with theme-aware colors
  const data = [
    { name: 'Healthy', value: statusCounts.healthy, color: theme.palette.success.main },
    { name: 'Warning', value: statusCounts.warning, color: theme.palette.warning.main },
    { name: 'Critical', value: statusCounts.critical, color: theme.palette.error.main },
    { name: 'Offline', value: statusCounts.offline, color: theme.palette.text.disabled }
  ].filter(item => item.value > 0);
  
  // Calculate total
  const totalDevices = devices.length;
  
  return (
    <Box>
      <Box sx={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value} devices`, 'Count']} />
          </PieChart>
        </ResponsiveContainer>
      </Box>
      
      <Grid container spacing={1} sx={{ mt: 2 }}>
        {data.map((status) => (
          <Grid item xs={6} key={status.name}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                p: 1,
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: theme.palette.action.hover
                }
              }}
            >
              <Box 
                sx={{ 
                  width: 12, 
                  height: 12, 
                  borderRadius: '50%', 
                  backgroundColor: status.color,
                  mr: 1 
                }} 
              />
              <Typography variant="body2" sx={{ flexGrow: 1 }}>
                {status.name}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mr: 1 }}>
                {status.value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {((status.value / totalDevices) * 100).toFixed(1)}%
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default DeviceHealthStatus; 