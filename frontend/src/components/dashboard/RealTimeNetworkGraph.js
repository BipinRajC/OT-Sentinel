import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Paper,
  Chip,
  Avatar,
  Grid,
  Alert,
  IconButton,
  Tooltip,
  Zoom,
  useTheme
} from '@mui/material';
import {
  Router as RouterIcon,
  Computer as ComputerIcon,
  Security as SecurityIcon,
  NetworkCheck as NetworkCheckIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

// Error Boundary Component
class NetworkGraphErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Network Graph Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert severity="error" sx={{ m: 2 }}>
          <Typography variant="h6">Network Graph Error</Typography>
          <Typography variant="body2">
            Unable to load network visualization. Please refresh the page.
          </Typography>
        </Alert>
      );
    }

    return this.props.children;
  }
}

const RealTimeNetworkGraph = ({ data = [], width = 800, height = 600 }) => {
  const theme = useTheme();
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [error, setError] = useState(null);

  // Memoized network topology generation
  const generateNetworkTopology = useCallback(() => {
    try {
      setError(null);
      
      // Scale coordinates based on container size
      const baseWidth = 800;
      const baseHeight = 600;
      const scaleX = (width || baseWidth) / baseWidth;
      const scaleY = (height || baseHeight) / baseHeight;

      const networkNodes = [
        {
          id: 'router-1',
          type: 'router',
          label: 'Core Router',
          x: 400 * scaleX,
          y: 150 * scaleY,
          status: 'online',
          ip: '192.168.1.1',
          connections: 15
        },
        {
          id: 'switch-1',
          type: 'switch',
          label: 'Switch A',
          x: 200 * scaleX,
          y: 300 * scaleY,
          status: 'online',
          ip: '192.168.1.10',
          connections: 8
        },
        {
          id: 'switch-2',
          type: 'switch',
          label: 'Switch B',
          x: 600 * scaleX,
          y: 300 * scaleY,
          status: 'online',
          ip: '192.168.1.11',
          connections: 6
        },
        {
          id: 'firewall-1',
          type: 'security',
          label: 'Firewall',
          x: 400 * scaleX,
          y: 50 * scaleY,
          status: 'online',
          ip: '192.168.1.2',
          connections: 2
        },
        {
          id: 'server-1',
          type: 'server',
          label: 'HMI Server',
          x: 100 * scaleX,
          y: 450 * scaleY,
          status: 'online',
          ip: '192.168.1.100',
          connections: 3
        },
        {
          id: 'server-2',
          type: 'server',
          label: 'Historian',
          x: 300 * scaleX,
          y: 450 * scaleY,
          status: 'online',
          ip: '192.168.1.101',
          connections: 2
        },
        {
          id: 'plc-1',
          type: 'device',
          label: 'PLC-1',
          x: 500 * scaleX,
          y: 450 * scaleY,
          status: 'online',
          ip: '192.168.1.200',
          connections: 4
        },
        {
          id: 'plc-2',
          type: 'device',
          label: 'PLC-2',
          x: 700 * scaleX,
          y: 450 * scaleY,
          status: 'online',
          ip: '192.168.1.201',
          connections: 3
        }
      ];

      // Safely check for attacks in data
      if (Array.isArray(data) && data.length > 0) {
        const attackIPs = new Set();
        data.forEach(item => {
          if (item && typeof item === 'object' && 
              item.predicted_class && 
              item.predicted_class !== 'normal' && 
              item.predicted_class !== 'clean') {
            if (item.source_ip) attackIPs.add(item.source_ip);
            if (item.destination_ip) attackIPs.add(item.destination_ip);
          }
        });

        networkNodes.forEach(node => {
          if (attackIPs.has(node.ip)) {
            node.status = 'attack';
          }
        });
      }

      const networkConnections = [
        { from: 'firewall-1', to: 'router-1', type: 'secure' },
        { from: 'router-1', to: 'switch-1', type: 'normal' },
        { from: 'router-1', to: 'switch-2', type: 'normal' },
        { from: 'switch-1', to: 'server-1', type: 'normal' },
        { from: 'switch-1', to: 'server-2', type: 'normal' },
        { from: 'switch-2', to: 'plc-1', type: 'normal' },
        { from: 'switch-2', to: 'plc-2', type: 'normal' }
      ];

      setNodes(networkNodes);
      setConnections(networkConnections);
    } catch (err) {
      console.error('Error generating network topology:', err);
      setError('Failed to generate network topology');
    }
  }, [data, width, height]);

  useEffect(() => {
    generateNetworkTopology();
  }, [generateNetworkTopology]);

  const getNodeIcon = useCallback((type) => {
    const iconProps = { sx: { fontSize: '1.5rem', color: 'white' } };
    switch (type) {
      case 'router':
        return <RouterIcon {...iconProps} />;
      case 'switch':
        return <NetworkCheckIcon {...iconProps} />;
      case 'security':
        return <SecurityIcon {...iconProps} />;
      case 'server':
        return <ComputerIcon {...iconProps} />;
      case 'device':
        return <ComputerIcon {...iconProps} />;
      default:
        return <ComputerIcon {...iconProps} />;
    }
  }, []);

  const getNodeColor = useCallback((status) => {
    switch (status) {
      case 'online':
        return '#4caf50';
      case 'attack':
        return '#f44336';
      case 'offline':
        return '#757575';
      default:
        return '#2196f3';
    }
  }, []);

  const getStatusIcon = useCallback((status) => {
    const iconProps = { sx: { fontSize: '1.2rem' } };
    switch (status) {
      case 'online':
        return <CheckCircleIcon color="success" {...iconProps} />;
      case 'attack':
        return <WarningIcon color="error" {...iconProps} />;
      default:
        return <CheckCircleIcon color="disabled" {...iconProps} />;
    }
  }, []);

  // Zoom and pan handlers
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 1.2, 0.5));
  }, []);

  const handleCenter = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (e.target.tagName === 'svg' || e.target.closest('.network-container')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add event listeners for pan functionality
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        container.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [handleMouseDown, handleMouseMove, handleMouseUp]);

  // Memoized transformed coordinates
  const transformedNodes = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      transformedX: (node.x + pan.x) * zoom,
      transformedY: (node.y + pan.y) * zoom
    }));
  }, [nodes, pan, zoom]);

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        <Typography variant="h6">Network Graph Error</Typography>
        <Typography variant="body2">{error}</Typography>
        <IconButton onClick={generateNetworkTopology} size="small">
          <RefreshIcon />
        </IconButton>
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        {/* Network Visualization */}
        <Grid item xs={12} lg={8}>
          <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              {/* Controls */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: 2 
              }}>
                <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1.25rem' }}>
                  Interactive Network Topology
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="Zoom In">
                    <IconButton onClick={handleZoomIn} size="small">
                      <ZoomInIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Zoom Out">
                    <IconButton onClick={handleZoomOut} size="small">
                      <ZoomOutIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Center View">
                    <IconButton onClick={handleCenter} size="small">
                      <CenterIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Refresh">
                    <IconButton onClick={generateNetworkTopology} size="small">
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* Network Container with Scrolling */}
              <Box
                ref={containerRef}
                className="network-container"
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: 'calc(100% - 60px)',
                  border: `2px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                  backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#fafafa',
                  overflow: 'auto', // Enable scrolling
                  cursor: isDragging ? 'grabbing' : 'grab',
                  '&::-webkit-scrollbar': {
                    width: '8px',
                    height: '8px'
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: 'rgba(0,0,0,0.1)'
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    borderRadius: '4px'
                  }
                }}
              >
                {/* SVG for connections */}
                <svg
                  ref={svgRef}
                  width="100%"
                  height="100%"
                  style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    zIndex: 1,
                    minWidth: 800 * zoom,
                    minHeight: 600 * zoom
                  }}
                >
                  {connections.map((conn, index) => {
                    const fromNode = transformedNodes.find(n => n.id === conn.from);
                    const toNode = transformedNodes.find(n => n.id === conn.to);
                    if (!fromNode || !toNode) return null;

                    return (
                      <line
                        key={`connection-${index}`}
                        x1={fromNode.transformedX}
                        y1={fromNode.transformedY}
                        x2={toNode.transformedX}
                        y2={toNode.transformedY}
                        stroke={conn.type === 'secure' ? '#00bcd4' : theme.palette.text.secondary}
                        strokeWidth={conn.type === 'secure' ? 4 : 3}
                        strokeDasharray={conn.type === 'secure' ? '8,4' : 'none'}
                        opacity={0.8}
                      />
                    );
                  })}
                </svg>

                {/* Network nodes */}
                {transformedNodes.map((node) => (
                  <Box
                    key={node.id}
                    sx={{
                      position: 'absolute',
                      left: node.transformedX - 35,
                      top: node.transformedY - 35,
                      width: 70,
                      height: 70,
                      zIndex: 2,
                      cursor: 'pointer',
                      transform: selectedNode === node.id ? 'scale(1.1)' : 'scale(1)',
                      transition: 'transform 0.2s ease',
                      '&:hover': {
                        transform: 'scale(1.05)'
                      }
                    }}
                    onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                  >
                    <Avatar
                      sx={{
                        bgcolor: getNodeColor(node.status),
                        width: 70,
                        height: 70,
                        border: selectedNode === node.id ? 
                          `4px solid ${theme.palette.primary.main}` : 
                          `3px solid ${theme.palette.background.paper}`,
                        boxShadow: node.status === 'attack' ? 
                          '0 0 20px rgba(244, 67, 54, 0.7)' : 
                          theme.shadows[4],
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {getNodeIcon(node.type)}
                    </Avatar>
                    <Typography
                      variant="body2"
                      sx={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        mt: 1,
                        textAlign: 'center',
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        whiteSpace: 'nowrap',
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        backdropFilter: 'blur(4px)'
                      }}
                    >
                      {node.label}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Zoom indicator */}
              <Typography 
                variant="caption" 
                sx={{ 
                  position: 'absolute', 
                  bottom: 8, 
                  left: 8,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: '0.75rem'
                }}
              >
                Zoom: {(zoom * 100).toFixed(0)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Node Details */}
        <Grid item xs={12} lg={4}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent sx={{ height: '100%', overflow: 'auto' }}>
              <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ fontSize: '1.25rem' }}>
                {selectedNode ? 'Device Details' : 'Network Overview'}
              </Typography>
              
              {selectedNode ? (
                (() => {
                  const node = nodes.find(n => n.id === selectedNode);
                  if (!node) return null;
                  
                  return (
                    <Box>
                      <Box display="flex" alignItems="center" gap={2} mb={3}>
                        <Avatar sx={{ 
                          bgcolor: getNodeColor(node.status),
                          width: 60,
                          height: 60
                        }}>
                          {getNodeIcon(node.type)}
                        </Avatar>
                        <Box>
                          <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1.1rem' }}>
                            {node.label}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getStatusIcon(node.status)}
                            <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.9rem' }}>
                              {node.status.toUpperCase()}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.9rem' }}>
                          IP Address
                        </Typography>
                        <Typography variant="body1" fontWeight="bold" sx={{ 
                          fontSize: '1rem',
                          fontFamily: 'monospace',
                          backgroundColor: theme.palette.action.hover,
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          mt: 0.5
                        }}>
                          {node.ip}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.9rem' }}>
                          Active Connections
                        </Typography>
                        <Typography variant="body1" fontWeight="bold" sx={{ fontSize: '1rem' }}>
                          {node.connections}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.9rem' }}>
                          Device Type
                        </Typography>
                        <Chip 
                          label={node.type.toUpperCase()} 
                          size="medium" 
                          color="primary" 
                          variant="outlined"
                          sx={{ mt: 0.5, fontSize: '0.8rem' }}
                        />
                      </Box>
                      
                      {node.status === 'attack' && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                          <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.9rem' }}>
                            ⚠️ Security Alert
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.8rem' }}>
                            Suspicious activity detected on this device. Immediate attention required.
                          </Typography>
                        </Alert>
                      )}
                    </Box>
                  );
                })()
              ) : (
                <Box>
                  <Typography variant="body1" color="textSecondary" gutterBottom sx={{ fontSize: '1rem' }}>
                    Click on any network device to view detailed information
                  </Typography>
                  
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem' }}>
                      Network Statistics
                    </Typography>
                    
                    <Box display="flex" justifyContent="space-between" mb={2}>
                      <Typography variant="body2" sx={{ fontSize: '0.95rem' }}>Total Devices</Typography>
                      <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.95rem' }}>
                        {nodes.length}
                      </Typography>
                    </Box>
                    
                    <Box display="flex" justifyContent="space-between" mb={2}>
                      <Typography variant="body2" sx={{ fontSize: '0.95rem' }}>Online Devices</Typography>
                      <Typography variant="body2" fontWeight="bold" color="success.main" sx={{ fontSize: '0.95rem' }}>
                        {nodes.filter(n => n.status === 'online').length}
                      </Typography>
                    </Box>
                    
                    <Box display="flex" justifyContent="space-between" mb={2}>
                      <Typography variant="body2" sx={{ fontSize: '0.95rem' }}>Under Attack</Typography>
                      <Typography variant="body2" fontWeight="bold" color="error.main" sx={{ fontSize: '0.95rem' }}>
                        {nodes.filter(n => n.status === 'attack').length}
                      </Typography>
                    </Box>
                    
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" sx={{ fontSize: '0.95rem' }}>Total Connections</Typography>
                      <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.95rem' }}>
                        {connections.length}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem' }}>
                      Legend
                    </Typography>
                    
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <Avatar sx={{ bgcolor: '#4caf50', width: 24, height: 24 }}>
                        <CheckCircleIcon sx={{ fontSize: 16 }} />
                      </Avatar>
                      <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>Online & Secure</Typography>
                    </Box>
                    
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <Avatar sx={{ bgcolor: '#f44336', width: 24, height: 24 }}>
                        <WarningIcon sx={{ fontSize: 16 }} />
                      </Avatar>
                      <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>Under Attack</Typography>
                    </Box>
                    
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box sx={{ 
                        width: 24, 
                        height: 3, 
                        backgroundColor: '#00bcd4',
                        borderRadius: 1
                      }} />
                      <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>Secure Connection</Typography>
                    </Box>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// Export wrapped with error boundary
const WrappedRealTimeNetworkGraph = (props) => (
  <NetworkGraphErrorBoundary>
    <RealTimeNetworkGraph {...props} />
  </NetworkGraphErrorBoundary>
);

export default WrappedRealTimeNetworkGraph; 