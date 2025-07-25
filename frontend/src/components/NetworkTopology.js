import React, { useState, useEffect, useRef } from 'react';
import './NetworkTopology.css';
import api from '../services/api';

const NetworkTopology = () => {
    const [nodes, setNodes] = useState([]);
    const [connections, setConnections] = useState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const svgRef = useRef(null);

    useEffect(() => {
        fetchNetworkData();
    }, []);

    // Normalize a node to ensure it has consistent position properties
    const normalizeNode = (node) => {
        // Make sure node has a position object with x and y coordinates
        if (!node.position) {
            node.position = {
                x: node.x || 0,
                y: node.y || 0
            };
        } else {
            // Ensure position has x and y properties
            node.position.x = node.position.x || node.x || 0;
            node.position.y = node.position.y || node.y || 0;
        }
        
        // Also keep x and y coordinates for backward compatibility
        node.x = node.position.x;
        node.y = node.position.y;
        
        return node;
    };

    const fetchNetworkData = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const networkMapData = await api.getNetworkMap();
            
            // Make sure all nodes have proper position format
            const normalizedNodes = networkMapData.nodes.map(node => normalizeNode(node));
            
            setNodes(normalizedNodes);
            setConnections(networkMapData.connections || []);
            
            // Select a node if none is selected
            if (!selectedNode && normalizedNodes.length > 0) {
                setSelectedNode(normalizedNodes[0]);
            }
            
            setLoading(false);
        } catch (err) {
            console.error("Error fetching network data:", err);
            setError("Failed to load network map. Please try again.");
            setLoading(false);
        }
    };

    const handleNodeClick = (node) => {
        setSelectedNode(node);
    };

    const getNodeIcon = (type) => {
        const icons = {
            'scada': '🖥️',
            'hmi': '💻',
            'plc': '🔧',
            'rtu': '📡',
            'workstation': '🖥️',
            'historian': '💾',
            'firewall': '🛡️',
            'switch': '🔌',
            'pump': '⚙️',
            'valve': '🔄',
            'sensor': '📊',
            'server': '🖥️',
            'router': '📡'
        };
        return icons[type] || '⚪';
    };

    const getStatusColor = (status) => {
        const colors = {
            'online': '#4CAF50',
            'offline': '#F44336',
            'warning': '#FF9800',
            'standby': '#2196F3',
            'running': '#8BC34A',
            'active': '#4CAF50'
        };
        return colors[status] || '#9E9E9E';
    };

    const drawConnections = () => {
        return connections.map((conn, index) => {
            const sourceNode = nodes.find(n => n.id === conn.source);
            const targetNode = nodes.find(n => n.id === conn.target);
            
            if (!sourceNode || !targetNode) return null;
            
            // Get coordinates with fallbacks
            const getX = (node) => node.position?.x ?? node.x ?? 0;
            const getY = (node) => node.position?.y ?? node.y ?? 0;
            
            const x1 = getX(sourceNode);
            const y1 = getY(sourceNode);
            const x2 = getX(targetNode);
            const y2 = getY(targetNode);

            const strokeColor = conn.status === 'active' ? '#00BCD4' : 
                               conn.status === 'warning' ? '#FF9800' : '#9E9E9E';

            return (
                <g key={`connection-${index}`}>
                    <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={strokeColor}
                        strokeWidth="2"
                        strokeDasharray={conn.status === 'standby' ? '5,5' : 'none'}
                        className="network-connection"
                    />
                    <text
                        x={(x1 + x2) / 2}
                        y={(y1 + y2) / 2 - 10}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#888"
                        className="connection-label"
                    >
                        {conn.protocol}
                    </text>
                </g>
            );
        });
    };

    if (loading) {
        return (
            <div className="network-topology-loading">
                <div className="loading-spinner"></div>
                <p>Loading Network Topology...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="network-topology-error">
                <div className="error-icon">⚠️</div>
                <p>{error}</p>
                <button onClick={fetchNetworkData} className="refresh-btn">
                    Try Again
                </button>
            </div>
        );
    }

    // Helper functions to get coordinates consistently
    const getX = (node) => node.position?.x ?? node.x ?? 0;
    const getY = (node) => node.position?.y ?? node.y ?? 0;

    return (
        <div className="network-topology">
            <div className="topology-header">
                <h2>Network Topology</h2>
                <div className="topology-stats">
                    <span>Nodes: {nodes.length}</span>
                    <span>Connections: {connections.length}</span>
                    <button onClick={fetchNetworkData} className="refresh-btn">
                        🔄 Refresh
                    </button>
                </div>
            </div>

            <div className="topology-container">
                <div className="topology-main">
                    <svg
                        ref={svgRef}
                        width="100%"
                        height="650"
                        viewBox="0 0 800 700"
                        className="topology-svg"
                    >
                        {/* Background grid */}
                        <defs>
                            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#2a2a2a" strokeWidth="1" opacity="0.3"/>
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />

                        {/* Draw connections first (behind nodes) */}
                        {drawConnections()}

                        {/* Draw nodes */}
                        {nodes.map((node) => (
                            <g
                                key={node.id}
                                className={`network-node ${selectedNode?.id === node.id ? 'selected' : ''}`}
                                onClick={() => handleNodeClick(node)}
                                style={{ cursor: 'pointer' }}
                            >
                                <circle
                                    cx={getX(node)}
                                    cy={getY(node)}
                                    r="25"
                                    fill={node.color || getStatusColor(node.status)}
                                    stroke="#ffffff"
                                    strokeWidth="2"
                                    className="node-circle"
                                />
                                <text
                                    x={getX(node)}
                                    y={getY(node) + 5}
                                    textAnchor="middle"
                                    fontSize="20"
                                    className="node-icon"
                                >
                                    {getNodeIcon(node.type)}
                                </text>
                                <text
                                    x={getX(node)}
                                    y={getY(node) + 45}
                                    textAnchor="middle"
                                    fontSize="12"
                                    fill="#ffffff"
                                    className="node-label"
                                >
                                    {node.name}
                                </text>
                                <text
                                    x={getX(node)}
                                    y={getY(node) + 60}
                                    textAnchor="middle"
                                    fontSize="10"
                                    fill="#cccccc"
                                    className="node-ip"
                                >
                                    {node.ip}
                                </text>
                            </g>
                        ))}
                    </svg>
                </div>

                {/* Node details panel */}
                {selectedNode && (
                    <div className="node-details-panel">
                        <div className="panel-header">
                            <h3>{selectedNode.name}</h3>
                            <button 
                                onClick={() => setSelectedNode(null)}
                                className="close-btn"
                            >
                                ×
                            </button>
                        </div>
                        <div className="panel-content">
                            <div className="detail-row">
                                <span className="detail-label">Type:</span>
                                <span className="detail-value">{selectedNode.type.toUpperCase()}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">IP Address:</span>
                                <span className="detail-value">{selectedNode.ip}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Status:</span>
                                <span 
                                    className="detail-value status-badge"
                                    style={{ 
                                        backgroundColor: getStatusColor(selectedNode.status),
                                        color: '#ffffff',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        fontSize: '11px'
                                    }}
                                >
                                    {selectedNode.status.toUpperCase()}
                                </span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Category:</span>
                                <span className="detail-value">{selectedNode.category}</span>
                            </div>
                            
                            {/* Show connections for this node */}
                            <div className="connections-section">
                                <h4>Connections</h4>
                                {connections
                                    .filter(conn => conn.source === selectedNode.id || conn.target === selectedNode.id)
                                    .map((conn, index) => {
                                        const otherNodeId = conn.source === selectedNode.id ? conn.target : conn.source;
                                        const otherNode = nodes.find(n => n.id === otherNodeId);
                                        return (
                                            <div key={index} className="connection-item">
                                                <span className="connection-name">
                                                    {otherNode?.name || otherNodeId}
                                                </span>
                                                <span className="connection-protocol">
                                                    {conn.protocol}
                                                </span>
                                                <span 
                                                    className="connection-status"
                                                    style={{ color: getStatusColor(conn.status) }}
                                                >
                                                    {conn.status}
                                                </span>
                                            </div>
                                        );
                                    })
                                }
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="topology-legend">
                <h4>Legend</h4>
                <div className="legend-items">
                    <div className="legend-item">
                        <div className="legend-color" style={{ backgroundColor: '#4CAF50' }}></div>
                        <span>Online</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color" style={{ backgroundColor: '#FF9800' }}></div>
                        <span>Warning</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color" style={{ backgroundColor: '#F44336' }}></div>
                        <span>Offline</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color" style={{ backgroundColor: '#2196F3' }}></div>
                        <span>Standby</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NetworkTopology; 