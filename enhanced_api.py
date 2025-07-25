#!/usr/bin/env python3
"""
Enhanced FastAPI server for OT Security Monitoring System.
Comprehensive API with real-time monitoring capabilities.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import random
import threading
import time
import uuid

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('enhanced_ot_api')

# Pydantic models for API validation
class Device(BaseModel):
    id: int
    ip_address: str
    hostname: str
    device_type: str
    vendor: str
    model: str
    protocols: List[Dict[str, Any]]
    is_online: bool
    risk_score: float
    last_seen: str
    cpu_usage: float
    memory_usage: float
    temperature: float
    location: str
    firmware_version: str

class Alert(BaseModel):
    id: int
    device_id: int
    device_ip: str
    alert_type: str
    severity: str
    description: str
    timestamp: str
    acknowledged: bool
    details: Dict[str, Any]

class NetworkConnection(BaseModel):
    id: int
    source_id: int
    target_id: int
    protocol: str
    port: int
    is_active: bool
    traffic_volume: int
    latency: float

class TrafficData(BaseModel):
    timestamp: str
    protocol: str
    packets_per_second: int
    bytes_per_second: int
    connections_count: int

class SystemMetrics(BaseModel):
    timestamp: str
    cpu_usage: float
    memory_usage: float
    network_io: Dict[str, float]
    disk_usage: float

# Create FastAPI app
app = FastAPI(
    title="Enhanced OT Security Monitoring System",
    description="Comprehensive Industrial Control System Security Monitoring API",
    version="2.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active WebSocket connections
active_connections: List[WebSocket] = []

# Enhanced mock data
devices_data = [
    {
        "id": 1,
        "ip_address": "192.168.95.2",
        "hostname": "PLC-MAIN-01",
        "device_type": "PLC",
        "vendor": "Siemens",
        "model": "S7-1500",
        "protocols": [{"name": "Modbus TCP", "port": 502}, {"name": "S7comm", "port": 102}],
        "is_online": True,
        "risk_score": 85.0,
        "last_seen": datetime.utcnow().isoformat(),
        "cpu_usage": 45.2,
        "memory_usage": 67.8,
        "temperature": 42.5,
        "location": "Production Floor A",
        "firmware_version": "V2.8.3"
    },
    {
        "id": 2,
        "ip_address": "192.168.95.3",
        "hostname": "HMI-STATION-01",
        "device_type": "HMI",
        "vendor": "Allen-Bradley",
        "model": "PanelView Plus 7",
        "protocols": [{"name": "EtherNet/IP", "port": 44818}, {"name": "HTTP", "port": 80}],
        "is_online": True,
        "risk_score": 45.0,
        "last_seen": datetime.utcnow().isoformat(),
        "cpu_usage": 23.1,
        "memory_usage": 34.5,
        "temperature": 38.2,
        "location": "Control Room",
        "firmware_version": "V12.00.00"
    },
    {
        "id": 3,
        "ip_address": "192.168.95.4",
        "hostname": "SCADA-SERVER-01",
        "device_type": "SCADA",
        "vendor": "Schneider Electric",
        "model": "Citect SCADA",
        "protocols": [{"name": "DNP3", "port": 20000}, {"name": "Modbus TCP", "port": 502}],
        "is_online": True,
        "risk_score": 32.0,
        "last_seen": datetime.utcnow().isoformat(),
        "cpu_usage": 78.9,
        "memory_usage": 82.3,
        "temperature": 55.7,
        "location": "Server Room",
        "firmware_version": "V8.20"
    },
    {
        "id": 4,
        "ip_address": "192.168.95.5",
        "hostname": "RTU-FIELD-01",
        "device_type": "RTU",
        "vendor": "ABB",
        "model": "RTU560",
        "protocols": [{"name": "DNP3", "port": 20000}, {"name": "IEC 61850", "port": 102}],
        "is_online": False,
        "risk_score": 90.0,
        "last_seen": (datetime.utcnow() - timedelta(hours=2)).isoformat(),
        "cpu_usage": 0.0,
        "memory_usage": 0.0,
        "temperature": 0.0,
        "location": "Remote Station Alpha",
        "firmware_version": "V1.4.2"
    },
    {
        "id": 5,
        "ip_address": "192.168.95.6",
        "hostname": "HISTORIAN-01",
        "device_type": "Historian",
        "vendor": "OSIsoft",
        "model": "PI System",
        "protocols": [{"name": "OPC-UA", "port": 4840}, {"name": "HTTPS", "port": 443}],
        "is_online": True,
        "risk_score": 25.0,
        "last_seen": datetime.utcnow().isoformat(),
        "cpu_usage": 89.2,
        "memory_usage": 76.4,
        "temperature": 48.1,
        "location": "Data Center",
        "firmware_version": "V2019.3"
    }
]

alerts_data = []
connections_data = []
traffic_history = []
system_metrics_history = []

def initialize_mock_data():
    """Initialize mock alerts, connections, and historical data."""
    global alerts_data, connections_data, traffic_history, system_metrics_history
    
    # Generate initial alerts
    alert_types = [
        "Buffer Overflow Attempt", "Unauthorized Access", "Malicious Traffic",
        "Protocol Anomaly", "Suspicious Command", "Failed Authentication",
        "Port Scan Detected", "DDoS Attack", "Man-in-the-Middle"
    ]
    
    severities = ["critical", "high", "medium", "low"]
    
    for i in range(25):
        device = random.choice(devices_data)
        alert = {
            "id": i + 1,
            "device_id": device["id"],
            "device_ip": device["ip_address"],
            "alert_type": random.choice(alert_types),
            "severity": random.choice(severities),
            "description": f"Security threat detected on {device['hostname']}",
            "timestamp": (datetime.utcnow() - timedelta(hours=random.randint(0, 72))).isoformat(),
            "acknowledged": random.choice([True, False]),
            "details": {
                "source_ip": f"192.168.{random.randint(1, 255)}.{random.randint(1, 255)}",
                "target_port": random.choice([80, 443, 502, 102, 20000, 44818]),
                "attack_vector": random.choice(["Network", "Application", "Physical"]),
                "confidence": random.uniform(0.7, 1.0)
            }
        }
        alerts_data.append(alert)
    
    # Generate network connections
    for i in range(8):
        source = random.choice(devices_data)
        target = random.choice([d for d in devices_data if d["id"] != source["id"]])
        connection = {
            "id": i + 1,
            "source_id": source["id"],
            "target_id": target["id"],
            "protocol": random.choice(["Modbus TCP", "EtherNet/IP", "DNP3", "OPC-UA"]),
            "port": random.choice([502, 44818, 20000, 4840]),
            "is_active": random.choice([True, False]),
            "traffic_volume": random.randint(50, 500),
            "latency": random.uniform(1.0, 50.0)
        }
        connections_data.append(connection)
    
    # Generate traffic history (last 24 hours)
    protocols = ["Modbus TCP", "EtherNet/IP", "DNP3", "OPC-UA", "HTTP", "HTTPS"]
    for hour in range(24):
        timestamp = datetime.utcnow() - timedelta(hours=hour)
        for protocol in protocols:
            traffic_data.append({
                "timestamp": timestamp.isoformat(),
                "protocol": protocol,
                "packets_per_second": random.randint(10, 200),
                "bytes_per_second": random.randint(1000, 50000),
                "connections_count": random.randint(1, 10)
            })
    
    # Generate system metrics history
    for minute in range(60):
        timestamp = datetime.utcnow() - timedelta(minutes=minute)
        system_metrics_history.append({
            "timestamp": timestamp.isoformat(),
            "cpu_usage": random.uniform(20, 90),
            "memory_usage": random.uniform(30, 85),
            "network_io": {
                "bytes_in": random.uniform(1000, 10000),
                "bytes_out": random.uniform(500, 5000)
            },
            "disk_usage": random.uniform(40, 80)
        })

# Initialize data on startup
initialize_mock_data()

# Background task for generating real-time events
def generate_realtime_events():
    """Generate comprehensive real-time events."""
    global devices_data, alerts_data, traffic_history, system_metrics_history
    
    while True:
        try:
            time.sleep(random.randint(10, 30))  # Generate events every 10-30 seconds
            
            event_type = random.choice([
                'device_status', 'new_alert', 'risk_update', 
                'traffic_spike', 'system_metrics', 'connection_change'
            ])
            
            if event_type == 'device_status':
                device = random.choice(devices_data)
                device['is_online'] = not device['is_online']
                device['last_seen'] = datetime.utcnow().isoformat()
                
                if device['is_online']:
                    device['cpu_usage'] = random.uniform(20, 90)
                    device['memory_usage'] = random.uniform(30, 85)
                    device['temperature'] = random.uniform(35, 60)
                else:
                    device['cpu_usage'] = 0.0
                    device['memory_usage'] = 0.0
                    device['temperature'] = 0.0
                
                event = {
                    "type": "device_status_changed",
                    "device": device
                }
                
                logger.info(f"Device {device['hostname']} is now {'online' if device['is_online'] else 'offline'}")
                
            elif event_type == 'new_alert':
                alert_types = [
                    "Buffer Overflow Attempt", "Unauthorized Access", "Malicious Traffic",
                    "Protocol Anomaly", "Suspicious Command", "Failed Authentication"
                ]
                severities = ["critical", "high", "medium", "low"]
                device = random.choice(devices_data)
                
                new_alert = {
                    "id": len(alerts_data) + 1,
                    "device_id": device['id'],
                    "device_ip": device['ip_address'],
                    "alert_type": random.choice(alert_types),
                    "severity": random.choice(severities),
                    "description": f"Security threat detected on {device['hostname']}",
                    "timestamp": datetime.utcnow().isoformat(),
                    "acknowledged": False,
                    "details": {
                        "source_ip": f"192.168.{random.randint(1, 255)}.{random.randint(1, 255)}",
                        "target_port": random.choice([80, 443, 502, 102, 20000, 44818]),
                        "attack_vector": random.choice(["Network", "Application", "Physical"]),
                        "confidence": random.uniform(0.7, 1.0)
                    }
                }
                
                alerts_data.insert(0, new_alert)
                
                event = {
                    "type": "new_alert",
                    "alert": new_alert
                }
                
                logger.warning(f"New {new_alert['severity']} alert: {new_alert['alert_type']}")
                
            elif event_type == 'traffic_spike':
                protocols = ["Modbus TCP", "EtherNet/IP", "DNP3", "OPC-UA"]
                protocol = random.choice(protocols)
                
                traffic_point = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "protocol": protocol,
                    "packets_per_second": random.randint(200, 1000),
                    "bytes_per_second": random.randint(50000, 200000),
                    "connections_count": random.randint(10, 50)
                }
                
                traffic_history.insert(0, traffic_point)
                traffic_history = traffic_history[:100]  # Keep last 100 points
                
                event = {
                    "type": "traffic_spike",
                    "data": traffic_point
                }
                
                logger.info(f"Traffic spike detected: {protocol}")
            
            # Broadcast event to all connected clients
            if active_connections:
                asyncio.run(broadcast_event(event))
                
        except Exception as e:
            logger.error(f"Error generating event: {e}")

async def broadcast_event(event: dict):
    """Broadcast event to all connected WebSocket clients."""
    if not active_connections:
        return
        
    message = json.dumps(event)
    disconnected_connections = []
    
    for connection in active_connections:
        try:
            await connection.send_text(message)
        except Exception as e:
            disconnected_connections.append(connection)
    
    # Remove disconnected connections
    for connection in disconnected_connections:
        if connection in active_connections:
            active_connections.remove(connection)

# Enhanced API Routes
@app.get("/api/dashboard/overview")
async def get_dashboard_overview():
    """Get comprehensive dashboard overview."""
    total_devices = len(devices_data)
    online_devices = len([d for d in devices_data if d['is_online']])
    total_alerts = len(alerts_data)
    critical_alerts = len([a for a in alerts_data if a['severity'] == 'critical'])
    unacknowledged_alerts = len([a for a in alerts_data if not a['acknowledged']])
    
    avg_risk_score = sum(d['risk_score'] for d in devices_data) / total_devices if total_devices > 0 else 0
    
    return {
        "total_devices": total_devices,
        "online_devices": online_devices,
        "offline_devices": total_devices - online_devices,
        "total_alerts": total_alerts,
        "critical_alerts": critical_alerts,
        "unacknowledged_alerts": unacknowledged_alerts,
        "average_risk_score": round(avg_risk_score, 1),
        "system_health": "Good" if avg_risk_score < 50 else "Warning" if avg_risk_score < 75 else "Critical",
        "last_updated": datetime.utcnow().isoformat()
    }

@app.get("/api/devices")
async def get_devices():
    """Get all devices with detailed information."""
    return devices_data

@app.get("/api/devices/{device_id}")
async def get_device(device_id: int):
    """Get specific device details."""
    device = next((d for d in devices_data if d['id'] == device_id), None)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device

@app.post("/api/devices/{device_id}/toggle")
async def toggle_device_status(device_id: int):
    """Toggle device online/offline status."""
    device = next((d for d in devices_data if d['id'] == device_id), None)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    device['is_online'] = not device['is_online']
    device['last_seen'] = datetime.utcnow().isoformat()
    
    if active_connections:
        await broadcast_event({
            "type": "device_status_changed",
            "device": device
        })
    
    return {"message": f"Device {device['hostname']} is now {'online' if device['is_online'] else 'offline'}"}

@app.get("/api/alerts")
async def get_alerts(limit: int = 50, severity: Optional[str] = None, acknowledged: Optional[bool] = None):
    """Get alerts with filtering options."""
    filtered_alerts = alerts_data
    
    if severity:
        filtered_alerts = [a for a in filtered_alerts if a['severity'] == severity]
    
    if acknowledged is not None:
        filtered_alerts = [a for a in filtered_alerts if a['acknowledged'] == acknowledged]
    
    return filtered_alerts[:limit]

@app.post("/api/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: int):
    """Acknowledge an alert."""
    alert = next((a for a in alerts_data if a['id'] == alert_id), None)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert['acknowledged'] = True
    return {"message": f"Alert {alert_id} acknowledged"}

@app.get("/api/network/topology")
async def get_network_topology():
    """Get network topology data."""
    return {
        "nodes": [
            {
                "id": d['id'],
                "label": d['hostname'],
                "type": d['device_type'],
                "ip": d['ip_address'],
                "status": "online" if d['is_online'] else "offline",
                "risk_score": d['risk_score'],
                "x": random.randint(50, 950),
                "y": random.randint(50, 550)
            } for d in devices_data
        ],
        "edges": [
            {
                "id": c['id'],
                "source": c['source_id'],
                "target": c['target_id'],
                "protocol": c['protocol'],
                "active": c['is_active'],
                "traffic": c['traffic_volume']
            } for c in connections_data
        ]
    }

@app.get("/api/traffic/realtime")
async def get_realtime_traffic():
    """Get real-time traffic data."""
    return traffic_history[:20]  # Last 20 data points

@app.get("/api/traffic/protocols")
async def get_protocol_statistics():
    """Get protocol distribution statistics."""
    protocol_stats = {}
    for traffic in traffic_history:
        protocol = traffic['protocol']
        if protocol not in protocol_stats:
            protocol_stats[protocol] = {'packets': 0, 'bytes': 0, 'connections': 0}
        protocol_stats[protocol]['packets'] += traffic['packets_per_second']
        protocol_stats[protocol]['bytes'] += traffic['bytes_per_second']
        protocol_stats[protocol]['connections'] += traffic['connections_count']
    
    return protocol_stats

@app.get("/api/system/metrics")
async def get_system_metrics():
    """Get system performance metrics."""
    return system_metrics_history[:60]  # Last hour of data

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Enhanced WebSocket endpoint for real-time updates."""
    await websocket.accept()
    active_connections.append(websocket)
    logger.info(f"Client connected. Total connections: {len(active_connections)}")
    
    try:
        # Send initial comprehensive data
        initial_data = {
            "type": "initial_data",
            "devices": devices_data,
            "alerts": alerts_data[:10],
            "traffic": traffic_history[:10],
            "overview": await get_dashboard_overview()
        }
        await websocket.send_text(json.dumps(initial_data))
        
        # Keep connection alive and handle client messages
        while True:
            try:
                message = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                # Handle client commands if needed
                client_data = json.loads(message)
                if client_data.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except asyncio.TimeoutError:
                # Send keepalive ping
                await websocket.send_text(json.dumps({"type": "ping"}))
                
    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if websocket in active_connections:
            active_connections.remove(websocket)
        logger.info(f"Client removed. Total connections: {len(active_connections)}")

# Start background event generator
if __name__ == "__main__":
    # Start the background event generator
    event_thread = threading.Thread(target=generate_realtime_events, daemon=True)
    event_thread.start()
    
    logger.info("Starting Enhanced OT Security Monitoring System")
    logger.info("API running on http://localhost:8000")
    logger.info("API Documentation: http://localhost:8000/docs")
    
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
