import React from 'react';
import { 
  Alert, 
  Box, 
  Button, 
  Typography, 
  Chip, 
  Stack, 
  Divider
} from '@mui/material';

/**
 * Displays security alerts in a panel
 */
function AlertPanel({ alerts, onAcknowledge }) {
  if (!alerts || alerts.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="text.secondary">No active alerts</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2} sx={{ maxHeight: 400, overflowY: 'auto' }}>
      {alerts.map((alert) => (
        <Alert 
          key={alert.id} 
          severity={getSeverity(alert.severity)}
          sx={{
            '& .MuiAlert-message': { width: '100%' }
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Chip 
              label={alert.severity.toUpperCase()} 
              size="small" 
              color={getSeverity(alert.severity)}
            />
            <Typography variant="caption" color="text.secondary">
              {new Date(alert.timestamp).toLocaleString()}
            </Typography>
          </Box>
          
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            {alert.alert_type}
          </Typography>
          
          <Typography variant="body2" sx={{ mb: 1 }}>
            {alert.description}
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            {!alert.acknowledged ? (
              <Button 
                size="small" 
                variant="outlined"
                onClick={() => onAcknowledge && onAcknowledge(alert.id)}
              >
                Acknowledge
              </Button>
            ) : (
              <Chip 
                size="small" 
                label={`Acknowledged by ${alert.acknowledged_by}`} 
                color="default"
                variant="outlined"
              />
            )}
          </Box>
        </Alert>
      ))}
      
      {alerts.length > 5 && (
        <>
          <Divider />
          <Box sx={{ textAlign: 'center' }}>
            <Button size="small">
              View {alerts.length - 5} more alerts
            </Button>
          </Box>
        </>
      )}
    </Stack>
  );
}

/**
 * Get Material UI severity value from our alert severity
 */
function getSeverity(severity) {
  switch (severity.toLowerCase()) {
    case 'critical':
      return 'error';
    case 'high':
      return 'warning';
    case 'medium':
      return 'info';
    case 'low':
      return 'success';
    default:
      return 'info';
  }
}

export default AlertPanel; 