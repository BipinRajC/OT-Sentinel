/**
 * Mock Data Service
 * Provides synthetic data for demonstration purposes
 */

// Generate a random IP address
const randomIP = () => {
  return `192.168.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 255)}`;
};

// Generate a random timestamp within the last 24 hours
const randomTimestamp = (hoursBack = 24) => {
  const date = new Date();
  date.setHours(date.getHours() - Math.random() * hoursBack);
  return date.toISOString();
};

// Device types common in ICS environments
const deviceTypes = ['plc', 'hmi', 'rtu', 'gateway', 'historian', 'workstation', 'scada_server'];

// Common industrial protocols
const protocols = [
  { name: 'Modbus TCP', id: 1 },
  { name: 'EtherNet/IP', id: 2 },
  { name: 'Profinet', id: 3 },
  { name: 'DNP3', id: 4 },
  { name: 'OPC UA', id: 5 },
  { name: 'BACnet', id: 6 },
  { name: 'S7', id: 7 }
];

// Alert types
const alertTypes = [
  'Unauthorized Access',
  'Unusual Traffic Pattern',
  'Protocol Violation',
  'Device Configuration Change',
  'Firmware Modification',
  'Command Injection',
  'DDoS Attack',
  'Port Scan',
  'Malformed Packet'
];

// Alert severity levels
const severityLevels = ['low', 'medium', 'high', 'critical'];

// Create mock devices
const generateDevices = (count = 15) => {
  const devices = [];
  
  for (let i = 0; i < count; i++) {
    const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
    const isOnline = Math.random() > 0.2;
    const deviceProtocols = [];
    const protocolCount = Math.floor(Math.random() * 3) + 1;
    
    // Assign random protocols to this device
    const shuffledProtocols = [...protocols].sort(() => 0.5 - Math.random());
    for (let j = 0; j < protocolCount; j++) {
      if (j < shuffledProtocols.length) {
        deviceProtocols.push(shuffledProtocols[j]);
      }
    }
    
    devices.push({
      id: i + 1,
      ip_address: randomIP(),
      hostname: `${deviceType}-${i + 1}`,
      device_type: deviceType,
      protocols: deviceProtocols,
      is_online: isOnline,
      risk_score: Math.random() * 100,
      last_seen: randomTimestamp(isOnline ? 1 : 48)
    });
  }
  
  return devices;
};

// Create mock alerts
const generateAlerts = (devices, count = 20) => {
  const alerts = [];
  
  for (let i = 0; i < count; i++) {
    const severity = severityLevels[Math.floor(Math.random() * severityLevels.length)];
    const device = devices[Math.floor(Math.random() * devices.length)];
    const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    const acknowledged = Math.random() > 0.7;
    
    alerts.push({
      id: i + 1,
      device_id: device.id,
      device_ip: device.ip_address,
      alert_type: alertType,
      severity: severity,
      description: `${alertType} detected on ${device.device_type} (${device.ip_address})`,
      timestamp: randomTimestamp(24),
      acknowledged: acknowledged,
      acknowledged_by: acknowledged ? 'admin' : null
    });
  }
  
  // Sort by timestamp (newest first)
  return alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

// Create mock network connections
const generateNetworkMap = (devices) => {
  const connections = [];
  
  // Create a central switch/router
  const centralNode = {
    id: 'central-switch',
    ip_address: '192.168.1.1',
    hostname: 'central-switch',
    device_type: 'network',
    is_online: true,
    risk_score: 10
  };
  
  // Add central node to devices
  const allDevices = [...devices, centralNode];
  
  // Connect all devices to central node
  devices.forEach(device => {
    connections.push({
      source: 'central-switch',
      target: device.id,
      traffic_volume: Math.floor(Math.random() * 100) + 10
    });
    
    // Add some device-to-device connections
    if (Math.random() > 0.7) {
      const otherDevice = devices.find(d => d.id !== device.id && Math.random() > 0.5);
      if (otherDevice) {
        connections.push({
          source: device.id,
          target: otherDevice.id,
          traffic_volume: Math.floor(Math.random() * 50) + 5
        });
      }
    }
  });
  
  return { devices: allDevices, connections };
};

// Generate traffic data for the past 24 hours
const generateTrafficData = (hourCount = 24, pointsPerHour = 4) => {
  const data = [];
  const now = new Date();
  
  for (let hour = hourCount; hour >= 0; hour--) {
    for (let point = 0; point < pointsPerHour; point++) {
      const timestamp = new Date(now);
      timestamp.setHours(now.getHours() - hour);
      timestamp.setMinutes(Math.floor((point / pointsPerHour) * 60));
      
      // Create some patterns in the data
      const timeOfDay = timestamp.getHours();
      let multiplier = 1;
      
      // More traffic during work hours
      if (timeOfDay >= 8 && timeOfDay <= 17) {
        multiplier = 2.5;
      }
      
      // Add some randomness
      const randomFactor = 0.7 + Math.random() * 0.6;
      
      const packetCount = Math.floor(
        500 * multiplier * randomFactor + (Math.sin(timeOfDay / 3) * 200)
      );
      
      const byteCount = packetCount * (64 + Math.floor(Math.random() * 1000));
      
      data.push({
        timestamp: timestamp.toISOString(),
        packet_count: packetCount,
        byte_count: byteCount,
      });
    }
  }
  
  return data;
};

// Generate protocol statistics
const generateProtocolStats = () => {
  const stats = {};
  
  protocols.forEach(protocol => {
    stats[protocol.name] = Math.floor(Math.random() * 1000) + 100;
  });
  
  return stats;
};

// Main export
const mockData = {
  devices: generateDevices(15),
  get alerts() {
    return generateAlerts(this.devices, 20);
  },
  get networkMap() {
    return generateNetworkMap(this.devices);
  },
  trafficData: generateTrafficData(),
  protocolStats: generateProtocolStats()
};

export default mockData; 