import React, { useState, useEffect, useRef } from 'react';
import './ARFFDataViewer.css';
import api from '../services/api';
import ApiService from '../services/ApiService';

const ARFFDataViewer = () => {
    const [currentData, setCurrentData] = useState(null);
    const [dataHistory, setDataHistory] = useState([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [systemHealth, setSystemHealth] = useState(0);
    const [connectionError, setConnectionError] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [summary, setSummary] = useState(null);
    const [connectionStart, setConnectionStart] = useState(Date.now());
    const wsRef = useRef(null);
    const chartCanvasRef = useRef(null);
    const healthCheckInterval = useRef(null);
    const lastDataReceived = useRef(null);

    useEffect(() => {
        // Initialize connection
        initializeConnection();
        
        // Set up periodic health checks
        healthCheckInterval.current = setInterval(checkConnectionHealth, 5000);
        
        return () => {
            cleanup();
        };
    }, []);

    const initializeConnection = async () => {
        try {
            // Check if ARFF service is running
            const connectionStatus = await ApiService.checkARFFConnection();
            
            if (connectionStatus.connected) {
                setIsConnected(true);
                setConnectionError(null);
                setConnectionStart(Date.now());
                
                // Fetch initial data
                await fetchInitialData();
                
                // Start WebSocket if backend is connected
                startWebSocketConnection();
            } else {
                setIsConnected(false);
                setIsStreaming(false);
                setConnectionError(connectionStatus.error || 'ARFF service not running');
                
                // Try to start the service
                await attemptServiceStart();
            }
        } catch (error) {
            console.error('Error initializing connection:', error);
            setIsConnected(false);
            setIsStreaming(false);
            setConnectionError(error.message);
        }
    };

    const checkConnectionHealth = async () => {
        try {
            const connectionStatus = await ApiService.checkARFFConnection();
            const wasConnected = isConnected;
            
            setIsConnected(connectionStatus.connected);
            
            if (connectionStatus.connected) {
                setConnectionError(null);
                
                // If we weren't connected before but are now, restart WebSocket
                if (!wasConnected) {
                    setConnectionStart(Date.now());
                    startWebSocketConnection();
                }
                
                // Check if data is fresh (received within last 10 seconds)
                const now = Date.now();
                const dataAge = lastDataReceived.current ? now - lastDataReceived.current : Infinity;
                const isDataFresh = dataAge < 10000; // 10 seconds
                
                setIsStreaming(connectionStatus.connected && isDataFresh);
                
                // Update system health based on connection and data freshness
                calculateSystemHealth(connectionStatus.connected, isDataFresh);
                
            } else {
                setIsStreaming(false);
                setConnectionError(connectionStatus.error || 'Service disconnected');
                setSystemHealth(0);
            }
        } catch (error) {
            console.error('Error checking connection health:', error);
            setIsConnected(false);
            setIsStreaming(false);
            setConnectionError(error.message);
            setSystemHealth(0);
        }
    };

    const attemptServiceStart = async () => {
        try {
            console.log('Attempting to start ARFF service...');
            const result = await ApiService.startARFFStreaming();
            
            if (result.status === 'success') {
                // Wait a moment for service to start
                setTimeout(async () => {
                    await checkConnectionHealth();
                }, 2000);
            }
        } catch (error) {
            console.error('Error starting ARFF service:', error);
            setConnectionError('Failed to start ARFF service');
        }
    };

    const fetchInitialData = async () => {
        try {
            const [dataResponse, summaryResponse] = await Promise.all([
                ApiService.getARFFData(),
                ApiService.getARFFSummary()
            ]);
            
            if (dataResponse.data) {
                updateData(dataResponse.data);
            }
            
            if (summaryResponse) {
                setSummary(summaryResponse);
            }
        } catch (error) {
            console.error('Error fetching initial data:', error);
        }
    };

    const startWebSocketConnection = () => {
        // Clean up existing connection
        if (wsRef.current) {
            wsRef.current.close();
        }
        
        try {
            const ws = new WebSocket(`ws://${window.location.host}/ws`);
            
            ws.onopen = () => {
                console.log('WebSocket connected for ARFF data');
                setIsStreaming(true);
                setConnectionError(null);
            };
            
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === 'arff_data_update' && data.data) {
                        updateData(data.data);
                        lastDataReceived.current = Date.now();
                    } else if (data.type === 'initial_arff_data' && data.data) {
                        updateData(data.data);
                        setSummary(data.summary);
                        lastDataReceived.current = Date.now();
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };
            
            ws.onclose = () => {
                console.log('WebSocket disconnected');
                setIsStreaming(false);
                
                // Attempt to reconnect if we're supposed to be connected
                if (isConnected) {
                    setTimeout(() => {
                        if (isConnected && (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED)) {
                            startWebSocketConnection();
                        }
                    }, 3000);
                }
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                setIsStreaming(false);
                setConnectionError('WebSocket connection failed');
            };
            
            wsRef.current = ws;
        } catch (error) {
            console.error('Error starting WebSocket connection:', error);
            setIsStreaming(false);
            setConnectionError('Failed to create WebSocket connection');
        }
    };

    const calculateSystemHealth = (connected, dataFresh) => {
        if (!connected) {
            setSystemHealth(0);
            return;
        }
        
        let health = 0;
        
        if (dataFresh) {
            // Calculate health based on recent data quality
            const recentData = dataHistory.slice(0, 10);
            
            if (recentData.length > 0) {
                const normalStateCount = recentData.filter(
                    d => d?.system_state?.code === '0'
                ).length;
                health = Math.round((normalStateCount / recentData.length) * 100);
            } else {
                // If no recent data but connected, assume good health
                health = 85;
            }
        } else {
            // Connected but no fresh data - calculate based on connection stability
            const connectionUptime = Date.now() - connectionStart;
            const uptimeMinutes = connectionUptime / (1000 * 60);
            
            if (uptimeMinutes > 5) {
                health = 85; // Good connection stability
            } else if (uptimeMinutes > 2) {
                health = 75; // Moderate connection stability
            } else {
                health = 65; // Recently connected
            }
        }
        
        setSystemHealth(health);
    };

    const updateData = (newData) => {
        setCurrentData(newData);
        
        // Update history (keep last 60 data points = 1 minute)
        setDataHistory(prev => {
            const updated = [newData, ...prev].slice(0, 60);
            return updated;
        });
        
        // Update alerts
        if (newData.alerts && newData.alerts.length > 0) {
            setAlerts(prev => [...newData.alerts, ...prev].slice(0, 20));
        }
        
        // Update chart if canvas is available
        updateChart();
    };

    const cleanup = () => {
        if (healthCheckInterval.current) {
            clearInterval(healthCheckInterval.current);
        }
        
        if (wsRef.current) {
            wsRef.current.close();
        }
    };

    const updateChart = () => {
        const canvas = chartCanvasRef.current;
        if (!canvas || dataHistory.length === 0) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, width, height);
        
        // Draw grid
        ctx.strokeStyle = '#2a2a3e';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < width; i += 50) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, height);
            ctx.stroke();
        }
        
        for (let i = 0; i < height; i += 30) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(width, i);
            ctx.stroke();
        }
        
        // Plot measurement data
        if (dataHistory.length > 1) {
            const maxPoints = Math.min(dataHistory.length, 50);
            const stepX = width / maxPoints;
            
            ctx.strokeStyle = '#00bcd4';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            dataHistory.slice(0, maxPoints).forEach((data, index) => {
                const measurement = data?.raw_data?.AValve || 0;
                const normalizedY = height - (measurement * height / 100); // Normalize to canvas height (0-100%)
                const x = width - (index * stepX);
                
                if (index === 0) {
                    ctx.moveTo(x, normalizedY);
                } else {
                    ctx.lineTo(x, normalizedY);
                }
            });
            
            ctx.stroke();
            
            // Plot system states as colored dots
            dataHistory.slice(0, maxPoints).forEach((data, index) => {
                const stateCode = data?.raw_data?.RunStatus ? '0' : '1';
                const color = getStateColor(stateCode);
                const x = width - (index * stepX);
                const y = height - 20;
                
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, 2 * Math.PI);
                ctx.fill();
            });
        }
        
        // Draw labels
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.fillText('Process Measurement', 10, 20);
        ctx.fillText('Time →', width - 60, height - 5);
    };

    const getStateColor = (stateCode) => {
        const colors = {
            '0': '#4CAF50', // Normal
            '1': '#FF9800', // Minor Deviation  
            '2': '#FF5722', // Communication Issue
            '3': '#FF5722', // Control Anomaly
            '4': '#F44336', // Process Warning
            '5': '#E91E63', // Security Alert
            '6': '#F44336', // System Error
            '7': '#B71C1C'  // Critical Failure
        };
        return colors[stateCode] || '#9E9E9E';
    };

    const getStateName = (stateCode) => {
        const states = {
            '0': 'Normal Operation',
            '1': 'Minor Deviation',
            '2': 'Communication Issue', 
            '3': 'Control Anomaly',
            '4': 'Process Warning',
            '5': 'Security Alert',
            '6': 'System Error',
            '7': 'Critical Failure'
        };
        return states[stateCode] || 'Unknown';
    };

    const formatValue = (value, unit) => {
        if (typeof value === 'number') {
            return value.toFixed(3) + ' ' + (unit || '');
        }
        return value;
    };

    const getConnectionStatusText = () => {
        if (!isConnected) {
            return 'Disconnected';
        }
        if (isStreaming) {
            return 'Live Data';
        }
        return 'Connected';
    };

    const getHealthColor = (health) => {
        if (health > 80) return '#4CAF50';
        if (health > 50) return '#FF9800';
        return '#F44336';
    };

    return (
        <div className="arff-data-viewer">
            <div className="arff-header">
                <h2>Industrial Process Data Stream</h2>
                <div className="arff-status">
                    <div className={`streaming-indicator ${isStreaming ? 'active' : 'inactive'}`}>
                        <span className="indicator-dot"></span>
                        {getConnectionStatusText()}
                    </div>
                    <div className="system-health">
                        <span>System Health: </span>
                        <span 
                            className="health-value"
                            style={{ color: getHealthColor(systemHealth) }}
                        >
                            {systemHealth}%
                        </span>
                    </div>
                    {connectionError && (
                        <div className="connection-error">
                            <span>Error: {connectionError}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="arff-content">
                <div className="left-panel">
                    {/* Current Data Display */}
                    <div className="current-data-panel">
                        <h3>Current Process State</h3>
                        {currentData ? (
                            <div className="data-grid">
                                <div className="data-section">
                                    <h4>System Status</h4>
                                    <div className="status-row">
                                        <span>State:</span>
                                        <span 
                                            className="state-badge"
                                            style={{ 
                                                backgroundColor: getStateColor('0'),
                                                color: '#ffffff',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontSize: '11px'
                                            }}
                                        >
                                            {currentData.raw_data?.RunStatus ? 'RUNNING' : 'STOPPED'}
                                        </span>
                                    </div>
                                    <div className="status-row">
                                        <span>Data Point:</span>
                                        <span>{Object.keys(currentData.raw_data || {}).length} / {currentData.attributes?.length || 0}</span>
                                    </div>
                                </div>

                                <div className="data-section">
                                    <h4>Process Values</h4>
                                    <div className="status-row">
                                        <span>Measurement:</span>
                                        <span>{formatValue(currentData.raw_data?.AValve, '%')}</span>
                                    </div>
                                    <div className="status-row">
                                        <span>Setpoint:</span>
                                        <span>{formatValue(currentData.raw_data?.BValve, '%')}</span>
                                    </div>
                                    <div className="status-row">
                                        <span>Control Mode:</span>
                                        <span>{currentData.raw_data?.RunStatus ? 'AUTO' : 'MANUAL'}</span>
                                    </div>
                                </div>

                                <div className="data-section">
                                    <h4>Equipment Status</h4>
                                    <div className="status-row">
                                        <span>Pump:</span>
                                        <span className={currentData.raw_data?.RunStatus ? 'status-on' : 'status-off'}>
                                            {currentData.raw_data?.RunStatus ? 'ON' : 'OFF'}
                                        </span>
                                    </div>
                                    <div className="status-row">
                                        <span>Solenoid:</span>
                                        <span className={(currentData.raw_data?.AValve > 50) ? 'status-on' : 'status-off'}>
                                            {(currentData.raw_data?.AValve > 50) ? 'OPEN' : 'CLOSED'}
                                        </span>
                                    </div>
                                </div>

                                <div className="data-section">
                                    <h4>Communication</h4>
                                    <div className="status-row">
                                        <span>CRC Rate:</span>
                                        <span>Good</span>
                                    </div>
                                    <div className="status-row">
                                        <span>Command Addr:</span>
                                        <span>192.168.95.2:502</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="no-data">
                                <p>{isConnected ? 'Waiting for data stream...' : 'Service disconnected'}</p>
                                {!isConnected && (
                                    <button onClick={initializeConnection} className="retry-button">
                                        Retry Connection
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Alerts Panel */}
                    <div className="alerts-panel">
                        <h3>Recent Alerts</h3>
                        <div className="alerts-list">
                            {alerts.length > 0 ? (
                                alerts.slice(0, 5).map((alert, index) => (
                                    <div key={index} className={`alert-item severity-${alert.severity}`}>
                                        <div className="alert-header">
                                            <span className="alert-type">{alert.type}</span>
                                            <span className="alert-time">
                                                {new Date(alert.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <div className="alert-message">{alert.message}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="no-alerts">No recent alerts</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="right-panel">
                    {/* Real-time Chart */}
                    <div className="chart-panel">
                        <h3>Process Trend</h3>
                        <canvas 
                            ref={chartCanvasRef}
                            width={500}
                            height={300}
                            className="trend-chart"
                        />
                    </div>

                    {/* Dataset Info */}
                    {summary && (
                        <div className="dataset-info">
                            <h3>Dataset Information</h3>
                            <div className="info-grid">
                                <div className="info-row">
                                    <span>Source:</span>
                                    <span>University of Alabama</span>
                                </div>
                                <div className="info-row">
                                    <span>Dataset:</span>
                                    <span>{summary.relation}</span>
                                </div>
                                <div className="info-row">
                                    <span>Total Records:</span>
                                    <span>{summary.total_rows?.toLocaleString()}</span>
                                </div>
                                <div className="info-row">
                                    <span>Update Rate:</span>
                                    <span>{summary.fetch_interval}s intervals</span>
                                </div>
                                <div className="info-row">
                                    <span>Attributes:</span>
                                    <span>{summary.attributes?.length}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ARFFDataViewer; 