import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Box, Typography, useTheme } from '@mui/material';

/**
 * Traffic volume chart visualization
 */
function TrafficChart({ data }) {
  const theme = useTheme();
  
  // Format data for chart
  const formattedData = data.map(point => ({
    name: new Date(point.timestamp).toLocaleTimeString(),
    packets: point.packet_count,
    bytes: point.byte_count / 1024, // Convert to KB
  }));
  
  if (!data || data.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="text.secondary">No traffic data available</Typography>
      </Box>
    );
  }
  
  return (
    <Box width="100%" height="100%">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={formattedData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis 
            dataKey="name" 
            stroke={theme.palette.text.secondary}
            style={{ 
              fontSize: '0.75rem',
              fontFamily: theme.typography.fontFamily
            }}
          />
          <YAxis 
            yAxisId="left" 
            stroke={theme.palette.primary.main}
            style={{ 
              fontSize: '0.75rem',
              fontFamily: theme.typography.fontFamily 
            }}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            stroke={theme.palette.secondary.main}
            style={{ 
              fontSize: '0.75rem',
              fontFamily: theme.typography.fontFamily
            }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: theme.shape.borderRadius,
              color: theme.palette.text.primary
            }}
          />
          <Legend 
            wrapperStyle={{ 
              fontFamily: theme.typography.fontFamily
            }}
          />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="packets" 
            name="Packets" 
            stroke={theme.palette.primary.main} 
            activeDot={{ r: 8, fill: theme.palette.primary.light }}
            strokeWidth={2}
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="bytes" 
            name="Volume (KB)" 
            stroke={theme.palette.secondary.main} 
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}

export default TrafficChart; 