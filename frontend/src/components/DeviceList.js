import React from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  useTheme
} from '@mui/material';

/**
 * Component to display a list of discovered ICS devices
 */
function DeviceList({ devices }) {
  const theme = useTheme();

  if (!devices || devices.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="text.secondary">No devices discovered yet</Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 350 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>IP Address</TableCell>
            <TableCell>Hostname</TableCell>
            <TableCell>Device Type</TableCell>
            <TableCell>Protocols</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Risk Score</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {devices.map((device) => (
            <TableRow key={device.id} hover>
              <TableCell>{device.ip_address}</TableCell>
              <TableCell>{device.hostname || 'Unknown'}</TableCell>
              <TableCell>{device.device_type || 'Unknown'}</TableCell>
              <TableCell>
                {device.protocols ? 
                  device.protocols.map(p => p.name).join(', ') : 
                  'Unknown'
                }
              </TableCell>
              <TableCell>
                <Chip 
                  label={device.is_online ? 'Online' : 'Offline'} 
                  color={device.is_online ? 'success' : 'error'} 
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: '100%', mr: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={device.risk_score}
                      sx={{ 
                        height: 10, 
                        borderRadius: 5,
                        backgroundColor: theme.palette.grey[200],
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: getRiskColor(device.risk_score, theme),
                        }
                      }}
                    />
                  </Box>
                  <Box sx={{ minWidth: 35 }}>
                    <Typography variant="body2" color="text.secondary">
                      {device.risk_score.toFixed(1)}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/**
 * Get color for risk score
 */
function getRiskColor(score, theme) {
  if (score < 30) return theme.palette.success.main;
  if (score < 70) return theme.palette.warning.main;
  return theme.palette.error.main;
}

export default DeviceList; 