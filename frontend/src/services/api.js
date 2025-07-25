/**
 * API Service for ICS Security Monitoring System
 * Handles all communication with the backend API
 */
import mockData from './mockData';

// API base URL - use backend URL directly for development
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3000/ws';

// Flag to enable mock data mode (for demo purposes)
const USE_MOCK_DATA = false; // Use real API data

// WebSocket connection
let socket = null;
let isConnecting = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 2000; // 2 seconds
const callbacks = new Map();

/**
 * Performs a fetch request with error handling and JSON parsing
 * @param {string} endpoint - API endpoint to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} - Parsed JSON response
 */
const fetchApi = async (endpoint, options = {}) => {
  // If mock data mode is enabled, simulate API response
  if (USE_MOCK_DATA) {
    console.log(`Using mock data for: ${endpoint}`);
    return simulateFetch(endpoint, options);
  }
  
  try {
    // Set default headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    // Make the request
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });
    
    // Handle non-2xx responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API error: ${response.status} ${response.statusText}`);
    }
    
    // Parse and return JSON response for non-204 responses
    if (response.status !== 204) {
      return await response.json();
    }
    
    return null;
  } catch (error) {
    console.error(`API Error: ${error.message}`, error);
    // If real API fails, fall back to mock data in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Falling back to mock data for: ${endpoint}`);
      return simulateFetch(endpoint, options);
    }
    throw error;
  }
};

/**
 * Connects to WebSocket server and sets up event handlers
 * @returns {WebSocket} - WebSocket connection
 */
const connectWebSocket = () => {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket;
  }
  
  if (isConnecting) return null;
  
  isConnecting = true;
  console.log('Connecting to WebSocket server...');
  
  try {
    socket = new WebSocket(WS_URL);
    
    socket.onopen = () => {
      console.log('WebSocket connected');
      isConnecting = false;
      reconnectAttempts = 0;
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Route messages to registered callbacks by type
        if (data.type) {
          const handlers = callbacks.get(data.type) || [];
          handlers.forEach(callback => {
            try {
              callback(data);
            } catch (err) {
              console.error(`Error in WebSocket callback for ${data.type}:`, err);
            }
          });
        }
        
        // Also notify generic 'message' handlers
        const messageHandlers = callbacks.get('message') || [];
        messageHandlers.forEach(callback => {
          try {
            callback(data);
          } catch (err) {
            console.error('Error in WebSocket message callback:', err);
          }
        });
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };
    
    socket.onclose = (event) => {
      console.log(`WebSocket closed: ${event.code} ${event.reason}`);
      isConnecting = false;
      socket = null;
      
      // Attempt to reconnect if not a normal closure
      if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        console.log(`Reconnecting (${reconnectAttempts}/${maxReconnectAttempts}) in ${reconnectDelay}ms...`);
        setTimeout(connectWebSocket, reconnectDelay);
      }
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      isConnecting = false;
    };
    
    return socket;
  } catch (err) {
    console.error('Failed to create WebSocket connection:', err);
    isConnecting = false;
    return null;
  }
};

/**
 * Simulates a fetch request using mock data
 * @param {string} endpoint - API endpoint to simulate
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} - Mock response data
 */
const simulateFetch = async (endpoint, options = {}) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Handle different endpoints
  if (endpoint === '/devices') {
    return mockData.devices;
  } else if (endpoint.match(/\/devices\/\d+/)) {
    const id = parseInt(endpoint.split('/').pop());
    return mockData.devices.find(d => d.id === id) || null;
  } else if (endpoint === '/devices/scan') {
    return { status: 'success', message: 'Scan initiated' };
  } else if (endpoint === '/alerts') {
    return mockData.alerts;
  } else if (endpoint.match(/\/alerts\/\d+/)) {
    const id = parseInt(endpoint.split('/').pop());
    if (options.method === 'PATCH') {
      // Acknowledge alert simulation
      return { id, acknowledged: true, acknowledged_by: 'current_user' };
    } else {
      return mockData.alerts.find(a => a.id === id) || null;
    }
  } else if (endpoint === '/network/map') {
    return mockData.networkMap;
  } else if (endpoint === '/traffic/protocols') {
    return mockData.protocolStats;
  } else if (endpoint.match(/\/traffic\/volume/)) {
    return mockData.trafficData;
  } else if (endpoint === '/detection/analyze') {
    return { analysis_id: 'mock-analysis-123', status: 'in_progress' };
  } else if (endpoint.match(/\/detection\/results/)) {
    return {
      id: 'mock-analysis-123',
      status: 'completed',
      findings: [
        { type: 'anomaly', severity: 'medium', description: 'Unusual traffic pattern detected' },
        { type: 'vulnerability', severity: 'high', description: 'Outdated protocol version' }
      ]
    };
  }
  
  // Default empty response
  return {};
};

/**
 * API service object
 */
const api = {
  /**
   * Connect to the WebSocket server
   * @returns {WebSocket} - WebSocket connection
   */
  connectWebSocket: () => {
    return connectWebSocket();
  },
  
  /**
   * Register a callback for WebSocket messages
   * @param {string} messageType - Type of message to listen for (or 'message' for all)
   * @param {Function} callback - Callback function to handle the message
   * @returns {Function} - Function to unregister the callback
   */
  onWebSocketMessage: (messageType, callback) => {
    if (!callbacks.has(messageType)) {
      callbacks.set(messageType, []);
    }
    
    callbacks.get(messageType).push(callback);
    
    // Return a function to unregister this callback
    return () => {
      const handlers = callbacks.get(messageType) || [];
      const index = handlers.indexOf(callback);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    };
  },
  
  /**
   * Send a message over WebSocket
   * @param {Object} data - Data to send
   * @returns {boolean} - True if sent successfully
   */
  sendWebSocketMessage: (data) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      connectWebSocket();
      console.warn('WebSocket not connected. Message not sent.');
      return false;
    }
    
    try {
      socket.send(JSON.stringify(data));
      return true;
    } catch (err) {
      console.error('Error sending WebSocket message:', err);
      return false;
    }
  },
  
  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket: () => {
    if (socket) {
      socket.close(1000, 'User initiated disconnect');
      socket = null;
    }
  },

  /**
   * Get all devices
   * @returns {Promise<Array>} - List of devices
   */
  getDevices: async () => {
    return await fetchApi('/devices');
  },
  
  /**
   * Get a specific device by ID
   * @param {number} id - Device ID
   * @returns {Promise<Object>} - Device data
   */
  getDevice: async (id) => {
    return await fetchApi(`/devices/${id}`);
  },
  
  /**
   * Scan network for devices
   * @param {Object} params - Scan parameters
   * @returns {Promise<Object>} - Scan response
   */
  scanDevices: async (params) => {
    return await fetchApi('/devices/scan', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },
  
  /**
   * Get all alerts
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} - List of alerts
   */
  getAlerts: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.offset) queryParams.append('offset', params.offset);
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/alerts?${queryString}` : '/alerts';
    
    return await fetchApi(endpoint);
  },
  
  /**
   * Get a specific alert by ID
   * @param {number} id - Alert ID
   * @returns {Promise<Object>} - Alert data
   */
  getAlert: async (id) => {
    return await fetchApi(`/alerts/${id}`);
  },
  
  /**
   * Acknowledge an alert
   * @param {number} id - Alert ID
   * @returns {Promise<Object>} - Updated alert data
   */
  acknowledgeAlert: async (id) => {
    return await fetchApi(`/alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        acknowledged: true,
        acknowledged_by: 'current_user' // In a real app, this would be the actual user
      })
    });
  },
  
  /**
   * Get network topology map
   * @returns {Promise<Object>} - Network map data
   */
  getNetworkMap: async () => {
    return await fetchApi('/network/map');
  },
  
  /**
   * Get protocol statistics
   * @returns {Promise<Object>} - Protocol stats
   */
  getProtocolStats: async () => {
    return await fetchApi('/traffic/protocols');
  },
  
  /**
   * Get traffic volume data
   * @param {number} hours - Number of hours to get data for
   * @returns {Promise<Array>} - Traffic volume data points
   */
  getTrafficVolume: async (hours = 24) => {
    return await fetchApi(`/traffic/volume?hours=${hours}`);
  },
  
  /**
   * Request traffic analysis
   * @param {Object} params - Analysis parameters
   * @returns {Promise<Object>} - Analysis response
   */
  analyzeTraffic: async (params) => {
    return await fetchApi('/detection/analyze', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },
  
  /**
   * Get analysis results
   * @param {string} analysisId - Analysis ID
   * @returns {Promise<Object>} - Analysis results
   */
  getAnalysisResults: async (analysisId) => {
    return await fetchApi(`/detection/results/${analysisId}`);
  },
  
  /**
   * Get ARFF data
   * @returns {Promise<Object>} - ARFF data
   */
  getARFFData: async () => {
    return await fetchApi('/arff/data');
  },
  
  /**
   * Get ARFF summary
   * @returns {Promise<Object>} - ARFF summary
   */
  getARFFSummary: async () => {
    return await fetchApi('/arff/summary');
  },
  
  /**
   * Start ARFF data streaming
   * @returns {Promise<Object>} - Response
   */
  startARFFStreaming: async () => {
    return await fetchApi('/arff/start', {
      method: 'POST'
    });
  },
  
  /**
   * Stop ARFF data streaming
   * @returns {Promise<Object>} - Response
   */
  stopARFFStreaming: async () => {
    return await fetchApi('/arff/stop', {
      method: 'POST'
    });
  },
  
  /**
   * Get Modbus data
   * @returns {Promise<Object>} - Modbus data
   */
  getModbusData: async () => {
    return await fetchApi('/modbus/data');
  },
  
  /**
   * Get health check
   * @returns {Promise<Object>} - Health status
   */
  getHealthCheck: async () => {
    return await fetchApi('/health');
  }
};

export default api; 