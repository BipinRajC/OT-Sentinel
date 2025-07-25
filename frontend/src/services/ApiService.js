/**
 * Enhanced API Service for OT Security Monitoring System
 * Handles all communication with the backend API
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

class ApiService {
  
  // Dashboard Overview
  static async getDashboardOverview() {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/overview`);
      if (!response.ok) {
        // Return mock data if endpoint is not available
        return {
          totalDevices: 12,
          onlineDevices: 10,
          criticalAlerts: 3,
          systemHealth: 'Good'
        };
      }
      const result = await response.json();
      return result.data || result; // Handle API response format
    } catch (error) {
      console.error('Error fetching dashboard overview:', error);
      // Return mock data as fallback
      return {
        totalDevices: 12,
        onlineDevices: 10,
        criticalAlerts: 3,
        systemHealth: 'Good'
      };
    }
  }

  // Device Management
  static async getDevices() {
    try {
      const response = await fetch(`${API_BASE_URL}/devices`);
      if (!response.ok) {
        // Return mock devices if endpoint is not available
        return this.getMockDevices();
      }
      const result = await response.json();
      return result.data || result; // Handle API response format
    } catch (error) {
      console.error('Error fetching devices:', error);
      // Return mock data as fallback
      return this.getMockDevices();
    }
  }

  static getMockDevices() {
    return [
      {
        id: 1,
        hostname: 'plc-001',
        ip_address: '192.168.1.10',
        device_type: 'plc',
        is_online: true,
        risk_score: 25.5,
        last_seen: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        protocols: [{ name: 'Modbus TCP', id: 1 }]
      },
      {
        id: 2,
        hostname: 'hmi-001',
        ip_address: '192.168.1.20',
        device_type: 'hmi',
        is_online: true,
        risk_score: 15.2,
        last_seen: new Date(Date.now() - 180000).toISOString(), // 3 minutes ago
        protocols: [{ name: 'EtherNet/IP', id: 2 }]
      },
      {
        id: 3,
        hostname: 'scada-server',
        ip_address: '192.168.1.30',
        device_type: 'scada_server',
        is_online: false,
        risk_score: 78.9,
        last_seen: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        protocols: [{ name: 'OPC UA', id: 5 }]
      },
      {
        id: 4,
        hostname: 'rtu-005',
        ip_address: '192.168.1.40',
        device_type: 'rtu',
        is_online: true,
        risk_score: 42.3,
        last_seen: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
        protocols: [{ name: 'DNP3', id: 4 }]
      },
      {
        id: 5,
        hostname: 'historian-01',
        ip_address: '192.168.1.50',
        device_type: 'historian',
        is_online: true,
        risk_score: 8.7,
        last_seen: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
        protocols: [{ name: 'OPC UA', id: 5 }]
      },
      {
        id: 6,
        hostname: 'gateway-west',
        ip_address: '192.168.1.60',
        device_type: 'gateway',
        is_online: false,
        risk_score: 65.4,
        last_seen: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        protocols: [{ name: 'Modbus TCP', id: 1 }, { name: 'EtherNet/IP', id: 2 }]
      },
      {
        id: 7,
        hostname: 'workstation-eng',
        ip_address: '192.168.1.70',
        device_type: 'workstation',
        is_online: true,
        risk_score: 55.1,
        last_seen: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
        protocols: [{ name: 'OPC UA', id: 5 }]
      },
      {
        id: 8,
        hostname: 'plc-002',
        ip_address: '192.168.1.80',
        device_type: 'plc',
        is_online: true,
        risk_score: 32.8,
        last_seen: new Date(Date.now() - 240000).toISOString(), // 4 minutes ago
        protocols: [{ name: 'Profinet', id: 3 }]
      }
    ];
  }

  static async getDevice(deviceId) {
    try {
      const response = await fetch(`${API_BASE_URL}/devices/${deviceId}`);
      if (!response.ok) throw new Error('Failed to fetch device');
      const result = await response.json();
      return result.data || result; // Handle API response format
    } catch (error) {
      console.error('Error fetching device:', error);
      throw error;
    }
  }

  static async toggleDeviceStatus(deviceId) {
    try {
      const response = await fetch(`${API_BASE_URL}/devices/${deviceId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to toggle device status');
      const result = await response.json();
      return result.data || result; // Handle API response format
    } catch (error) {
      console.error('Error toggling device status:', error);
      throw error;
    }
  }

  // Alert Management
  static async getAlerts(options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit);
      if (options.severity) params.append('severity', options.severity);
      if (options.acknowledged !== undefined) params.append('acknowledged', options.acknowledged);

      const response = await fetch(`${API_BASE_URL}/alerts?${params}`);
      if (!response.ok) {
        // Return mock alerts if endpoint is not available
        return this.getMockAlerts();
      }
      const result = await response.json();
      return result.data || result; // Handle API response format
    } catch (error) {
      console.error('Error fetching alerts:', error);
      // Return mock data as fallback
      return this.getMockAlerts();
    }
  }

  static getMockAlerts() {
    return [
      {
        id: 1,
        device_id: 3,
        device_ip: '192.168.1.30',
        alert_type: 'Unauthorized Access',
        severity: 'critical',
        description: 'Multiple failed login attempts detected on SCADA server',
        timestamp: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
        acknowledged: false,
        acknowledged_by: null
      },
      {
        id: 2,
        device_id: 6,
        device_ip: '192.168.1.60',
        alert_type: 'Device Configuration Change',
        severity: 'high',
        description: 'Unexpected configuration modification detected on gateway',
        timestamp: new Date(Date.now() - 1200000).toISOString(), // 20 minutes ago
        acknowledged: false,
        acknowledged_by: null
      },
      {
        id: 3,
        device_id: 1,
        device_ip: '192.168.1.10',
        alert_type: 'Unusual Traffic Pattern',
        severity: 'medium',
        description: 'Abnormal Modbus traffic pattern detected',
        timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        acknowledged: true,
        acknowledged_by: 'admin'
      },
      {
        id: 4,
        device_id: 7,
        device_ip: '192.168.1.70',
        alert_type: 'Protocol Violation',
        severity: 'medium',
        description: 'Invalid OPC UA command received',
        timestamp: new Date(Date.now() - 2400000).toISOString(), // 40 minutes ago
        acknowledged: false,
        acknowledged_by: null
      },
      {
        id: 5,
        device_id: 4,
        device_ip: '192.168.1.40',
        alert_type: 'Port Scan',
        severity: 'low',
        description: 'Network scan detected from external source',
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        acknowledged: true,
        acknowledged_by: 'admin'
      }
    ];
  }

  static async acknowledgeAlert(alertId) {
    try {
      const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to acknowledge alert');
      const result = await response.json();
      return result.data || result; // Handle API response format
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      throw error;
    }
  }

  // Network Analytics
  static async getNetworkTopology() {
    try {
      const response = await fetch(`${API_BASE_URL}/network/topology`);
      if (!response.ok) throw new Error('Failed to fetch network topology');
      const result = await response.json();
      return result.data || result; // Handle API response format
    } catch (error) {
      console.error('Error fetching network topology:', error);
      // Return minimal fallback only if necessary
      return {
        connections: [],
        segments: ['Production', 'Control', 'Management'],
        avgHops: 0
      };
    }
  }

  static async getRealtimeTraffic() {
    try {
      const response = await fetch(`${API_BASE_URL}/traffic/realtime`);
      if (!response.ok) throw new Error('Failed to fetch realtime traffic');
      const result = await response.json();
      return result.data || result; // Handle API response format
    } catch (error) {
      console.error('Error fetching realtime traffic:', error);
      return []; // Return empty array instead of throwing
    }
  }

  static async getProtocolStatistics() {
    try {
      const response = await fetch(`${API_BASE_URL}/traffic/protocols`);
      if (!response.ok) throw new Error('Failed to fetch protocol statistics');
      const result = await response.json();
      
      // The endpoint returns data in format: {"Modbus":450,"EtherNet/IP":230,...}
      // Convert it to the expected format
      if (result && typeof result === 'object' && !result.data) {
        // Direct object format from API
        return Object.entries(result).map(([protocol, count]) => ({
          name: protocol,
          value: count
        }));
      }
      
      return result.data || result; // Handle API response format
    } catch (error) {
      console.error('Error fetching protocol statistics:', error);
      return []; // Return empty array instead of throwing
    }
  }

  static async getTrafficData() {
    try {
      const response = await fetch(`${API_BASE_URL}/traffic/realtime`);
      if (!response.ok) throw new Error('Failed to fetch traffic data');
      const result = await response.json();
      return result.data || result; // Handle API response format
    } catch (error) {
      console.error('Error fetching traffic data:', error);
      // Return empty array instead of mock data
      return [];
    }
  }

  static async getSystemMetrics() {
    try {
      const response = await fetch(`${API_BASE_URL}/system/metrics`);
      if (!response.ok) throw new Error('Failed to fetch system metrics');
      const result = await response.json();
      return result.data || result; // Handle API response format
    } catch (error) {
      console.error('Error fetching system metrics:', error);
      // Return empty metrics instead of throwing
      return {
        cpu_usage: 0,
        memory_usage: 0,
        disk_usage: 0,
        network_throughput: 0,
        uptime: "0 days, 00:00:00",
        load_average: [0, 0, 0]
      };
    }
  }

  // Industrial Process APIs
  static async getProcessPoints() {
    try {
      const response = await axios.get(`${API_BASE_URL}/process/points`);
      return response;
    } catch (error) {
      console.error('Error fetching process points:', error);
      return {
        data: {
          status: 'success',
          data: {
            process_name: 'TenEast Chemical Process',
            data_source: {
              name: 'TenEast',
              type: 'MODBUS_IP',
              host: '192.168.95.2',
              port: 502
            },
            points: [
              {
                id: 'DP_909767',
                name: 'AValve',
                description: 'Feed1 Control Valve A',
                value: 45.2,
                unit: '%',
                type: 'valve_position',
                alarm_status: 'normal',
                register: 0
              },
              {
                id: 'DP_253175',
                name: 'AFlow',
                description: 'Feed1 Flow Rate',
                value: 203.5,
                unit: 'kMol/h',
                type: 'flow_rate',
                alarm_status: 'normal',
                register: 1
              }
            ]
          }
        }
      };
    }
  }

  static async getProcessOverview() {
    try {
      const response = await axios.get(`${API_BASE_URL}/process/overview`);
      return response;
    } catch (error) {
      console.error('Error fetching process overview:', error);
      return {
        data: {
          status: 'success',
          data: {
            process_status: true,
            total_points: 14,
            alarm_count: 0,
            critical_alarms: 0,
            warning_alarms: 0,
            average_valve_position: 45.2,
            total_flow_rate: 203.5,
            pressure: 150.0,
            level: 65.0
          }
        }
      };
    }
  }

  static async controlProcessPoint(pointId, action) {
    try {
      const response = await axios.post(`${API_BASE_URL}/process/control/${pointId}`, action);
      return response;
    } catch (error) {
      console.error('Error controlling process point:', error);
      throw error;
    }
  }

  // ARFF Data Stream APIs
  static async checkARFFConnection() {
    try {
      const response = await fetch(`${API_BASE_URL}/arff/status`);
      if (!response.ok) {
        return { connected: false, updateRate: 0, error: 'API unavailable' };
      }
      const data = await response.json();
      return {
        connected: data.streaming || false,
        updateRate: data.fetch_interval || 1.0,
        totalRows: data.total_rows || 0,
        currentIndex: data.current_index || 0,
        relation: data.relation || 'Unknown'
      };
    } catch (error) {
      console.error('Error checking ARFF connection:', error);
      return { connected: false, updateRate: 0, error: error.message };
    }
  }

  static async getARFFData() {
    try {
      const response = await fetch(`${API_BASE_URL}/arff/data`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching ARFF data:', error);
      throw error;
    }
  }

  static async getARFFSummary() {
    try {
      const response = await fetch(`${API_BASE_URL}/arff/summary`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching ARFF summary:', error);
      throw error;
    }
  }

  static async startARFFStreaming() {
    try {
      const response = await fetch(`${API_BASE_URL}/arff/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error starting ARFF streaming:', error);
      throw error;
    }
  }

  static async stopARFFStreaming() {
    try {
      const response = await fetch(`${API_BASE_URL}/arff/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error stopping ARFF streaming:', error);
      throw error;
    }
  }

  // WebSocket Connection
  static createWebSocketConnection(onMessage, onOpen, onClose, onError) {
    const ws = new WebSocket('ws://localhost:8000/ws');
    
    ws.onopen = (event) => {
      console.log('WebSocket connected');
      if (onOpen) onOpen(event);
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (onMessage) onMessage(data);
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket disconnected');
      if (onClose) onClose(event);
    };
    
    ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      if (onError) onError(event);
    };
    
    return ws;
  }

  // Utility methods
  static async healthCheck() {
    try {
      const response = await fetch('http://localhost:8000/');
      if (!response.ok) throw new Error('Health check failed');
      const result = await response.json();
      return result.data || result; // Handle API response format
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }
}

export default ApiService;
