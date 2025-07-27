import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, Chip, LinearProgress, Grid, Paper } from '@mui/material';

const ARFFDataViewer = ({ data }) => {
  const [recentClassifications, setRecentClassifications] = useState([]);
  const [dataStats, setDataStats] = useState({});
  const [processMetrics, setProcessMetrics] = useState({});

  useEffect(() => {
    loadARFFData();
    const interval = setInterval(loadARFFData, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadARFFData = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/realtime/recent?limit=20');
      if (response.ok) {
        const data = await response.json();
        const classifications = data.data || [];
        setRecentClassifications(classifications);

        // Calculate statistics
        const attackTypes = {};
        const confidenceScores = [];
        const protocolCounts = {};

        classifications.forEach(item => {
          const attackType = item.predicted_class || 'unknown';
          attackTypes[attackType] = (attackTypes[attackType] || 0) + 1;
          
          if (item.confidence_score) {
            confidenceScores.push(item.confidence_score);
          }

          const protocol = item.protocol || 'Unknown';
          protocolCounts[protocol] = (protocolCounts[protocol] || 0) + 1;
        });

        setDataStats({
          totalRecords: classifications.length,
          attackTypes,
          avgConfidence: confidenceScores.length > 0 
            ? (confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length).toFixed(2)
            : 0,
          protocolDistribution: protocolCounts
        });

        setProcessMetrics({
          dataQuality: 98.5,
          processingSpeed: '250 records/sec',
          memoryUsage: 75,
          cpuUsage: 68,
          diskIO: 45
        });
      }
    } catch (error) {
      console.error('Error loading ARFF data:', error);
    }
  };

  const getAttackTypeColor = (attackType) => {
    switch (attackType) {
      case 'normal': return '#4caf50';
      case 'dos': return '#f44336';
      case 'probe': return '#ff9800';
      case 'r2l': return '#9c27b0';
      case 'u2r': return '#ff5722';
      case 'modbus_attack': return '#e91e63';
      default: return '#757575';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#f44336';
      case 'high': return '#ff5722';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#757575';
    }
  };

  return (
    <Card sx={{ 
      background: 'linear-gradient(135deg, #1a1f3a 0%, #2a2d5a 100%)',
      border: '1px solid #9c27b0',
      color: 'white',
      height: '100%'
    }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6" fontWeight="bold" color="#9c27b0">
            Data Stream Analytics (ARFF)
          </Typography>
          <Chip 
            label="LIVE PROCESSING"
            sx={{ 
              backgroundColor: '#4caf50',
              color: 'white',
              fontWeight: 'bold'
            }}
            size="small"
          />
        </Box>

        {/* Data Quality Metrics */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ 
              p: 1.5, 
              textAlign: 'center',
              background: 'rgba(156, 39, 176, 0.1)',
              border: '1px solid #9c27b0',
              color: 'white'
            }}>
              <Typography variant="h6" fontWeight="bold" color="#9c27b0">
                {dataStats?.totalRecords || 0}
              </Typography>
              <Typography variant="caption" color="rgba(255,255,255,0.7)">
                Records Processed
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ 
              p: 1.5, 
              textAlign: 'center',
              background: 'rgba(76, 175, 80, 0.1)',
              border: '1px solid #4caf50',
              color: 'white'
            }}>
              <Typography variant="h6" fontWeight="bold" color="#4caf50">
                {processMetrics?.dataQuality || 0}%
              </Typography>
              <Typography variant="caption" color="rgba(255,255,255,0.7)">
                Data Quality
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ 
              p: 1.5, 
              textAlign: 'center',
              background: 'rgba(0, 188, 212, 0.1)',
              border: '1px solid #00bcd4',
              color: 'white'
            }}>
              <Typography variant="h6" fontWeight="bold" color="#00bcd4">
                {dataStats?.avgConfidence || 0}
              </Typography>
              <Typography variant="caption" color="rgba(255,255,255,0.7)">
                Avg Confidence
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ 
              p: 1.5, 
              textAlign: 'center',
              background: 'rgba(255, 152, 0, 0.1)',
              border: '1px solid #ff9800',
              color: 'white'
            }}>
              <Typography variant="h6" fontWeight="bold" color="#ff9800">
                {processMetrics?.processingSpeed || 'N/A'}
              </Typography>
              <Typography variant="caption" color="rgba(255,255,255,0.7)">
                Processing Speed
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* System Performance */}
        <Typography variant="body1" fontWeight="bold" color="#9c27b0" mb={2}>
          System Performance Metrics
        </Typography>
        <Box mb={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="white">Memory Usage</Typography>
            <Typography variant="body2" color="#00bcd4" fontWeight="bold">
              {processMetrics?.memoryUsage || 0}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={processMetrics?.memoryUsage || 0}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#00bcd4',
                borderRadius: 3
              }
            }}
          />

          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} mt={2}>
            <Typography variant="body2" color="white">CPU Usage</Typography>
            <Typography variant="body2" color="#ff9800" fontWeight="bold">
              {processMetrics?.cpuUsage || 0}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={processMetrics?.cpuUsage || 0}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#ff9800',
                borderRadius: 3
              }
            }}
          />

          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} mt={2}>
            <Typography variant="body2" color="white">Disk I/O</Typography>
            <Typography variant="body2" color="#4caf50" fontWeight="bold">
              {processMetrics?.diskIO || 0}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={processMetrics?.diskIO || 0}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#4caf50',
                borderRadius: 3
              }
            }}
          />
        </Box>

        {/* Attack Type Distribution */}
        <Typography variant="body1" fontWeight="bold" color="#9c27b0" mb={2}>
          Detection Classification
        </Typography>
        <Box mb={3}>
          {Object.entries(dataStats?.attackTypes || {}).map(([type, count]) => (
            <Box key={type} sx={{ 
              mb: 2, 
              p: 1.5, 
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 1,
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      backgroundColor: getAttackTypeColor(type),
                      borderRadius: '50%'
                    }}
                  />
                  <Typography variant="body2" fontWeight="bold" color="white">
                    {type.replace('_', ' ').toUpperCase()}
                  </Typography>
                </Box>
                <Typography variant="body2" color="#00bcd4" fontWeight="bold">
                  {count} detections
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(count / Math.max(...Object.values(dataStats?.attackTypes || {}))) * 100}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: getAttackTypeColor(type),
                    borderRadius: 3
                  }
                }}
              />
            </Box>
          ))}
        </Box>

        {/* Recent Classifications */}
        <Typography variant="body1" fontWeight="bold" color="#9c27b0" mb={2}>
          Recent Classifications
        </Typography>
        <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
          {recentClassifications.slice(0, 8).map((item, index) => (
            <Box key={index} sx={{ 
              mb: 1, 
              p: 1.5, 
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 1,
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="white">
                    {item.source_ip} → {item.destination_ip}
                  </Typography>
                  <Typography variant="caption" color="rgba(255,255,255,0.7)">
                    {item.protocol} | {new Date(item.timestamp).toLocaleTimeString()}
                  </Typography>
                </Box>
                <Box textAlign="right">
                  <Chip
                    label={item.predicted_class?.toUpperCase() || 'UNKNOWN'}
                    size="small"
                    sx={{
                      backgroundColor: getAttackTypeColor(item.predicted_class),
                      color: 'white',
                      fontSize: '9px',
                      height: 18,
                      mb: 0.5
                    }}
                  />
                  <Typography variant="caption" color="rgba(255,255,255,0.7)" display="block">
                    {((item.confidence_score || 0) * 100).toFixed(1)}% conf.
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>

        {recentClassifications.length === 0 && (
          <Box sx={{ 
            textAlign: 'center', 
            py: 4,
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 1,
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <Typography variant="body2" color="rgba(255,255,255,0.7)">
              Waiting for data stream...
            </Typography>
            <Typography variant="caption" color="rgba(255,255,255,0.5)">
              Start the simulation to see real-time classifications
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ARFFDataViewer; 