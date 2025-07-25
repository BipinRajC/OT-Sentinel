#!/usr/bin/env python3
"""
Simple FastAPI server for OT Security Monitoring System demo.
"""

import asyncio
import json
import logging
import math
import os
import random
import threading
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import redis
import requests
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Configure logging first
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('ot_api')

# Import industrial data
from industrial_data import industrial_generator, INDUSTRIAL_CONFIG, INDUSTRIAL_DATA

from fastapi.responses import HTMLResponse

# Import real-time simulation service
try:
    from services.realtime_api import router as realtime_router
    REALTIME_AVAILABLE = True
except ImportError:
    logger.warning("Real-time simulation service not available")
    REALTIME_AVAILABLE = False

# Add ML imports
import joblib
import numpy as np
import pandas as pd
from pathlib import Path

# Create FastAPI app
app = FastAPI(
    title="OT Security Monitoring System",
    description="Real-time Industrial Control System Security Monitoring",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include real-time simulation router if available
if REALTIME_AVAILABLE:
    app.include_router(realtime_router)
    logger.info("Real-time simulation endpoints enabled")

# Active WebSocket connections
active_connections: List[WebSocket] = []

# Mock data
devices_data = [
    {
        "id": 1,
        "name": "TenEast Process Controller",
        "ip_address": "192.168.95.2",
        "device_type": "PLC",
        "protocol": "Modbus TCP",
        "port": 502,
        "status": "online",
        "last_seen": datetime.utcnow().isoformat(),
        "firmware_version": "2.1.4",
        "manufacturer": "ScadaBR",
        "model": "Industrial Process Controller",
        "location": "TenEast Chemical Plant",
        "cpu_usage": 45.2,
        "memory_usage": 67.8,
        "temperature": 42.1,
        "uptime": "15 days, 3 hours",
        "network_latency": 12.5,
        "process_points": len(INDUSTRIAL_CONFIG["process_points"]),
        "active_alarms": 0
    },
    {
        "id": 2, 
        "name": "HMI Station",
        "ip_address": "192.168.95.3",
        "device_type": "HMI",
        "protocol": "Ethernet/IP",
        "port": 44818,
        "status": "online",
        "last_seen": datetime.utcnow().isoformat(),
        "firmware_version": "3.2.1",
        "manufacturer": "Rockwell",
        "model": "PanelView Plus",
        "location": "Control Room",
        "cpu_usage": 23.4,
        "memory_usage": 45.6,
        "temperature": 38.9,
        "uptime": "8 days, 12 hours",
        "network_latency": 8.2,
        "process_points": 0,
        "active_alarms": 0
    },
    {
        "id": 3,
        "name": "SCADA Server",
        "ip_address": "192.168.95.4", 
        "device_type": "SCADA",
        "protocol": "DNP3",
        "port": 20000,
        "status": "online",
        "last_seen": datetime.utcnow().isoformat(),
        "firmware_version": "1.8.7",
        "manufacturer": "Schneider Electric",
        "model": "Citect SCADA",
        "location": "Server Room",
        "cpu_usage": 67.1,
        "memory_usage": 82.3,
        "temperature": 51.2,
        "uptime": "32 days, 7 hours",
        "network_latency": 5.8,
        "process_points": 150,
        "active_alarms": 3
    },
    {
        "id": 4,
        "name": "Remote Terminal Unit",
        "ip_address": "192.168.95.5",
        "device_type": "RTU",
        "protocol": "Modbus RTU",
        "port": 502,
        "status": "warning",
        "last_seen": (datetime.utcnow() - timedelta(minutes=2)).isoformat(),
        "firmware_version": "1.4.2",
        "manufacturer": "Siemens",
        "model": "SICAM RTU",
        "location": "Remote Substation",
        "cpu_usage": 78.9,
        "memory_usage": 91.2,
        "temperature": 56.8,
        "uptime": "4 days, 18 hours",
        "network_latency": 45.3,
        "process_points": 25,
        "active_alarms": 1
    },
    {
        "id": 5,
        "name": "Historian Server",
        "ip_address": "192.168.95.6",
        "device_type": "Historian",
        "protocol": "OPC UA",
        "port": 4840,
        "status": "online",
        "last_seen": datetime.utcnow().isoformat(),
        "firmware_version": "2.3.5",
        "manufacturer": "OSIsoft",
        "model": "PI System",
        "location": "Data Center",
        "cpu_usage": 52.3,
        "memory_usage": 74.1,
        "temperature": 38.4,
        "uptime": "45 days, 2 hours",
        "network_latency": 3.2,
        "process_points": 500,
        "active_alarms": 0
    },
    {
        "id": 6,
        "name": "Safety PLC",
        "ip_address": "192.168.95.7",
        "device_type": "Safety PLC",
        "protocol": "EtherNet/IP",
        "port": 44818,
        "status": "online",
        "last_seen": datetime.utcnow().isoformat(),
        "firmware_version": "1.9.3",
        "manufacturer": "Allen Bradley",
        "model": "GuardLogix 5570",
        "location": "Safety System",
        "cpu_usage": 34.7,
        "memory_usage": 58.2,
        "temperature": 41.9,
        "uptime": "28 days, 16 hours",
        "network_latency": 6.8,
        "process_points": 75,
        "active_alarms": 0
    },
    {
        "id": 7,
        "name": "Field Switch",
        "ip_address": "192.168.95.8",
        "device_type": "Network Switch",
        "protocol": "SNMP",
        "port": 161,
        "status": "online",
        "last_seen": datetime.utcnow().isoformat(),
        "firmware_version": "3.2.1",
        "manufacturer": "Cisco",
        "model": "IE 3400",
        "location": "Field Cabinet",
        "cpu_usage": 15.4,
        "memory_usage": 32.6,
        "temperature": 35.2,
        "uptime": "67 days, 8 hours",
        "network_latency": 2.1,
        "process_points": 0,
        "active_alarms": 0
    },
    {
        "id": 8,
        "name": "Operator Workstation",
        "ip_address": "192.168.95.9",
        "device_type": "Workstation",
        "protocol": "RDP",
        "port": 3389,
        "status": "online",
        "last_seen": datetime.utcnow().isoformat(),
        "firmware_version": "Windows 10",
        "manufacturer": "Dell",
        "model": "OptiPlex 7090",
        "location": "Control Room",
        "cpu_usage": 42.1,
        "memory_usage": 65.8,
        "temperature": 39.7,
        "uptime": "12 days, 4 hours",
        "network_latency": 1.8,
        "process_points": 0,
        "active_alarms": 0
    },
    {
        "id": 9,
        "name": "Firewall",
        "ip_address": "192.168.95.10",
        "device_type": "Firewall",
        "protocol": "HTTPS",
        "port": 443,
        "status": "online",
        "last_seen": datetime.utcnow().isoformat(),
        "firmware_version": "9.1.4",
        "manufacturer": "Palo Alto",
        "model": "PA-220",
        "location": "Network Perimeter",
        "cpu_usage": 28.9,
        "memory_usage": 47.3,
        "temperature": 44.6,
        "uptime": "89 days, 12 hours",
        "network_latency": 1.2,
        "process_points": 0,
        "active_alarms": 0
    },
    {
        "id": 10,
        "name": "I/O Module Rack 1",
        "ip_address": "192.168.95.11",
        "device_type": "I/O Module",
        "protocol": "Modbus TCP",
        "port": 502,
        "status": "online",
        "last_seen": datetime.utcnow().isoformat(),
        "firmware_version": "1.7.2",
        "manufacturer": "Phoenix Contact",
        "model": "AXL F BK ETH",
        "location": "Process Area A",
        "cpu_usage": 22.5,
        "memory_usage": 38.9,
        "temperature": 42.3,
        "uptime": "156 days, 7 hours",
        "network_latency": 8.4,
        "process_points": 32,
        "active_alarms": 0
    },
    {
        "id": 11,
        "name": "VFD Panel",
        "ip_address": "192.168.95.12",
        "device_type": "VFD",
        "protocol": "Modbus RTU",
        "port": 502,
        "status": "online",
        "last_seen": datetime.utcnow().isoformat(),
        "firmware_version": "2.1.8",
        "manufacturer": "ABB",
        "model": "ACS880",
        "location": "Motor Control Center",
        "cpu_usage": 31.2,
        "memory_usage": 45.7,
        "temperature": 48.1,
        "uptime": "203 days, 14 hours",
        "network_latency": 12.6,
        "process_points": 18,
        "active_alarms": 0
    },
    {
        "id": 12,
        "name": "Engineering Workstation",
        "ip_address": "192.168.95.13",
        "device_type": "Engineering Workstation",
        "protocol": "SSH",
        "port": 22,
        "status": "offline",
        "last_seen": (datetime.utcnow() - timedelta(hours=2)).isoformat(),
        "firmware_version": "Ubuntu 20.04",
        "manufacturer": "HP",
        "model": "Z4 G4",
        "location": "Engineering Office",
        "cpu_usage": 0,
        "memory_usage": 0,
        "temperature": 25.0,
        "uptime": "0 days, 0 hours",
        "network_latency": 0,
        "process_points": 0,
        "active_alarms": 1,
        "is_online": False
    }
]

alerts_data = [
    {
        "id": 1,
        "device_id": 1,
        "device_ip": "192.168.95.2",
        "alert_type": "Buffer Overflow Attempt",
        "severity": "critical",
        "description": "Potential exploitation of libmodbus vulnerability",
        "timestamp": datetime.utcnow().isoformat(),
        "acknowledged": False
    },
    {
        "id": 2,
        "device_id": 2,
        "device_ip": "192.168.95.3",
        "alert_type": "Unauthorized Access",
        "severity": "high",
        "description": "Failed authentication attempts detected on HMI station",
        "timestamp": (datetime.utcnow() - timedelta(minutes=10)).isoformat(),
        "acknowledged": True
    },
    {
        "id": 3,
        "device_id": 3,
        "device_ip": "192.168.95.4",
        "alert_type": "Network Anomaly",
        "severity": "medium",
        "description": "Unusual traffic pattern detected on SCADA network",
        "timestamp": (datetime.utcnow() - timedelta(minutes=25)).isoformat(),
        "acknowledged": False
    },
    {
        "id": 4,
        "device_id": 1,
        "device_ip": "192.168.95.2",
        "alert_type": "Protocol Violation",
        "severity": "low",
        "description": "Modbus function code violation detected",
        "timestamp": (datetime.utcnow() - timedelta(hours=1)).isoformat(),
        "acknowledged": True
    },
    {
        "id": 5,
        "device_id": 4,
        "device_ip": "192.168.95.5",
        "alert_type": "Device Offline",
        "severity": "medium",
        "description": "RTU device lost connection for extended period",
        "timestamp": (datetime.utcnow() - timedelta(minutes=5)).isoformat(),
        "acknowledged": False
    }
]

# Background task for generating real-time events
def generate_realtime_events():
    """Generate real-time events in background."""
    global devices_data, alerts_data
    
    logger.info("Starting real-time event generation...")
    
    while True:
        try:
            # Generate different types of events
            event_types = ['device_status', 'new_alert', 'risk_update', 'industrial_process']
            event_type = random.choice(event_types)
            
            if event_type == 'device_status':
                # Toggle device status
                device = random.choice(devices_data)
                device['status'] = 'online' if device['status'] == 'offline' else 'offline'
                device['last_seen'] = datetime.utcnow().isoformat()
                
                event = {
                    "type": "device_status_changed",
                    "device_id": device['id'],
                    "ip_address": device['ip_address'],
                    "status": device['status'],
                    "timestamp": device['last_seen']
                }
                
                logger.info(f"Device {device['name']} is now {device['status']}")
                
            elif event_type == 'new_alert':
                # Generate new alert
                alert_types = [
                    "Buffer Overflow Attempt",
                    "Unauthorized Access",
                    "Malware Detected",
                    "Network Anomaly",
                    "Protocol Violation",
                    "Suspicious Activity"
                ]
                severities = ["low", "medium", "high", "critical"]
                
                device = random.choice(devices_data)
                new_alert = {
                    "id": len(alerts_data) + 1,
                    "device_id": device['id'],
                    "device_ip": device['ip_address'],
                    "alert_type": random.choice(alert_types),
                    "severity": random.choice(severities),
                    "description": f"Security threat detected on {device['name']}",
                    "timestamp": datetime.utcnow().isoformat(),
                    "acknowledged": False
                }
                
                alerts_data.append(new_alert)
                
                event = {
                    "type": "new_alert",
                    "alert": new_alert
                }
                
                logger.info(f"New {new_alert['severity']} alert: {new_alert['alert_type']}")
                
            elif event_type == 'risk_update':
                # Update risk score
                device = random.choice(devices_data)
                old_score = device['cpu_usage']
                device['cpu_usage'] = max(0, min(100, old_score + random.randint(-15, 20)))
                
                event = {
                    "type": "risk_score_updated",
                    "device_id": device['id'],
                    "ip_address": device['ip_address'],
                    "risk_score": device['cpu_usage'],
                    "timestamp": datetime.utcnow().isoformat()
                }
                
                if abs(device['cpu_usage'] - old_score) > 5:
                    logger.info(f"Risk score updated for {device['name']}: {old_score} -> {device['cpu_usage']}")
                    
            elif event_type == 'industrial_process':
                # Generate industrial process events
                process_alerts = industrial_generator.generate_alerts()
                if process_alerts:
                    # Add to alerts data
                    for alert in process_alerts:
                        alerts_data.append(alert)
                    
                    event = {
                        "type": "process_alert",
                        "alerts": process_alerts,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    
                    logger.info(f"Generated {len(process_alerts)} industrial process alerts")
                else:
                    # Send process data update
                    process_data = industrial_generator.get_current_data()
                    event = {
                        "type": "process_data_update",
                        "process_data": process_data,
                        "timestamp": datetime.utcnow().isoformat()
                    }
            
            # Broadcast event to all connected clients
            if active_connections:
                disconnected = []
                for connection in active_connections:
                    try:
                        asyncio.run_coroutine_threadsafe(
                            connection.send_text(json.dumps(event, default=str)),
                            asyncio.get_event_loop()
                        )
                    except Exception as e:
                        logger.error(f"Failed to send event to client: {e}")
                        disconnected.append(connection)
                
                # Remove disconnected clients
                for conn in disconnected:
                    active_connections.remove(conn)
            
            time.sleep(random.randint(5, 15))  # Wait 5-15 seconds between events
            
        except Exception as e:
            logger.error(f"Error in real-time event generation: {e}")
            time.sleep(5)

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
            logger.warning(f"Failed to send message to client: {e}")
            disconnected_connections.append(connection)
    
    # Remove disconnected connections
    for connection in disconnected_connections:
        if connection in active_connections:
            active_connections.remove(connection)

# API Routes
@app.get("/")
async def root():
    """Root endpoint with system information."""
    return {
        "name": "OT Security Monitoring System",
        "version": "1.0.0",
        "status": "online",
        "devices": len(devices_data),
        "alerts": len(alerts_data),
        "active_connections": len(active_connections),
        "endpoints": {
            "websocket": "/ws",
            "ai_chat": "/api/ai/chat",
            "health": "/api/health",
            "devices": "/api/devices",
            "alerts": "/api/alerts"
        }
    }

# Gemini AI Chat endpoint
@app.post("/api/ai/chat")
async def chat_with_ai(request: dict):
    """Chat with Gemini AI Assistant using environment variable for API key."""
    api_key = os.getenv('GOOGLE_GEMINI_API_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    
    try:
        # Use the correct Gemini API endpoint
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={api_key}"
        
        message = request.get('message', '')
        
        payload = {
            "contents": [{
                "parts": [{
                    "text": f"""You are an expert Industrial Control Systems (ICS) and Operational Technology (OT) security specialist. You have deep knowledge of:
                    - SCADA systems, PLCs, HMIs, and RTUs
                    - Industrial protocols (Modbus, DNP3, EtherNet/IP, OPC UA)
                    - OT cybersecurity threats and vulnerabilities
                    - Industrial process optimization
                    - Network monitoring and anomaly detection
                    - Incident response for industrial environments
                    
                    Current context: You're helping with a TenEast process control system that monitors:
                    - Valve positions (AValve, BValve, ProductValve, PurgeValve)
                    - Flow rates (AFlow, BFlow, ProductFlow, PurgeFlow) in kMol/h
                    - Pressure readings in kPa
                    - Level measurements in %
                    - Component compositions (AComp, BComp, CComp)
                    - System run status
                    
                    User question: {message}
                    
                    Please provide a detailed, professional response focused on industrial security and process control."""
                }]
            }]
        }
        
        response = requests.post(url, json=payload, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            ai_response = data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', 'Sorry, I could not generate a response.')
            return {"status": "success", "response": ai_response}
        else:
            logger.error(f"Gemini API error: {response.status_code} - {response.text}")
            raise HTTPException(status_code=500, detail=f"AI service error: {response.status_code}")
            
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="AI service timeout")
    except Exception as e:
        logger.error(f"Error calling Gemini API: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "active_websockets": len(active_connections),
        "environment": {
            "has_gemini_key": bool(os.getenv('GOOGLE_GEMINI_API_KEY')),
            "redis_host": os.getenv('REDIS_HOST', 'localhost'),
            "modbus_host": os.getenv('MODBUS_HOST', '192.168.95.2')
        },
        "system": {
            "active_devices": len([d for d in devices_data if d["status"] == "online"]),
            "total_alerts": len(alerts_data),
            "unacknowledged_alerts": len([a for a in alerts_data if not a["acknowledged"]])
        }
    }

@app.get("/api/devices")
async def get_devices():
    """Get all devices."""
    return devices_data

@app.get("/api/alerts")
async def get_alerts():
    """Get all alerts."""
    return alerts_data

@app.get("/api/network/map")
async def get_network_map():
    """Get network map for topology visualization."""
    # Convert devices to nodes with proper position and type mapping
    nodes = []
    for i, device in enumerate(devices_data):
        # Generate positions in a circular layout
        angle = (i * 2 * 3.14159) / len(devices_data)
        x = 400 + 200 * math.cos(angle)
        y = 350 + 200 * math.sin(angle)
        
        # Map device types to node types
        node_type = device["device_type"].lower()
        
        nodes.append({
            "id": device["id"],
            "name": device["name"],
            "type": node_type,
            "ip": device["ip_address"],
            "status": device["status"],
            "category": device["device_type"],
            "position": {"x": x, "y": y},
            "x": x,
            "y": y,
            "color": "#4CAF50" if device["status"] == "online" else "#F44336",
            "protocol": device.get("protocol", "Unknown"),
            "port": device.get("port", 0)
        })
    
    # Generate realistic connections between devices
    connections = []
    # Core network connections (firewall as central hub)
    firewall_id = next((d["id"] for d in devices_data if d["device_type"] == "Firewall"), 9)
    switch_id = next((d["id"] for d in devices_data if d["device_type"] == "Network Switch"), 7)
    
    # Connect firewall to switch
    connections.append({
        "id": "conn_firewall_switch",
        "source": firewall_id,
        "target": switch_id,
        "protocol": "Ethernet",
        "status": "active",
        "bandwidth": random.randint(800, 1000)
    })
    
    # Connect critical devices to switch
    critical_devices = [d["id"] for d in devices_data if d["device_type"] in ["PLC", "HMI", "SCADA", "Safety PLC"]]
    for device_id in critical_devices:
        connections.append({
            "id": f"conn_switch_{device_id}",
            "source": switch_id,
            "target": device_id,
            "protocol": "EtherNet/IP",
            "status": "active",
            "bandwidth": random.randint(500, 800)
        })
    
    # Connect field devices to PLC
    plc_id = next((d["id"] for d in devices_data if d["device_type"] == "PLC"), 1)
    field_devices = [d["id"] for d in devices_data if d["device_type"] in ["RTU", "I/O Module", "VFD"]]
    for device_id in field_devices:
        connections.append({
            "id": f"conn_plc_{device_id}",
            "source": plc_id,
            "target": device_id,
            "protocol": "Modbus TCP",
            "status": "active",
            "bandwidth": random.randint(200, 500)
        })
    
    # Connect workstations to switch
    workstation_devices = [d["id"] for d in devices_data if d["device_type"] in ["Workstation", "Engineering Workstation", "Historian"]]
    for device_id in workstation_devices:
        connections.append({
            "id": f"conn_switch_ws_{device_id}",
            "source": switch_id,
            "target": device_id,
            "protocol": "TCP/IP",
            "status": "active" if any(d["id"] == device_id and d["status"] == "online" for d in devices_data) else "inactive",
            "bandwidth": random.randint(300, 600)
        })
    
    return {
        "nodes": nodes,
        "connections": connections
    }

@app.get("/api/traffic/protocols")
async def get_protocol_stats():
    """Get protocol statistics."""
    return {
        "Modbus": 450,
        "EtherNet/IP": 230,
        "DNP3": 150,
        "OPC-UA": 80
    }

@app.get("/api/traffic/volume")
async def get_traffic_volume():
    """Get traffic volume data."""
    data_points = []
    now = datetime.utcnow()
    
    for i in range(24, 0, -1):
        timestamp = now - timedelta(hours=i)
        data_points.append({
            "timestamp": timestamp.isoformat(),
            "packet_count": random.randint(50, 200),
            "byte_count": random.randint(5000, 20000)
        })
    
    return data_points

@app.get("/api/traffic/volume")
def get_traffic_volume():
    """Get network traffic volume over time"""
    return {
        "status": "success",
        "data": {
            "total_volume": 1024000,
            "peak_volume": 2048000,
            "avg_volume": 512000,
            "timeline": [
                {"timestamp": "2024-01-01T00:00:00Z", "volume": 500000},
                {"timestamp": "2024-01-01T01:00:00Z", "volume": 750000},
                {"timestamp": "2024-01-01T02:00:00Z", "volume": 1000000}
            ]
        }
    }

@app.get("/api/traffic/realtime")
def get_realtime_traffic():
    """Get real-time traffic data"""
    return {
        "status": "success",
        "data": [
            {
                "source_ip": "192.168.95.2",
                "destination_ip": "192.168.95.100",
                "protocol": "Modbus",
                "bytes_in": 1024,
                "bytes_out": 512,
                "packets_in": 10,
                "packets_out": 5,
                "latency": 15.2
            },
            {
                "source_ip": "192.168.95.3",
                "destination_ip": "192.168.95.101",
                "protocol": "EtherNet/IP",
                "bytes_in": 2048,
                "bytes_out": 1024,
                "packets_in": 20,
                "packets_out": 10,
                "latency": 12.8
            },
            {
                "source_ip": "192.168.95.4",
                "destination_ip": "192.168.95.102",
                "protocol": "DNP3",
                "bytes_in": 1536,
                "bytes_out": 768,
                "packets_in": 15,
                "packets_out": 8,
                "latency": 18.5
            }
        ]
    }

@app.get("/api/network/topology")
def get_network_topology():
    """Get network topology information"""
    return {
        "status": "success",
        "data": {
            "connections": [
                {"id": 1, "source": "192.168.95.2", "target": "192.168.95.100"},
                {"id": 2, "source": "192.168.95.3", "target": "192.168.95.101"},
                {"id": 3, "source": "192.168.95.4", "target": "192.168.95.102"}
            ],
            "segments": ["Production", "Control", "Management"],
            "avgHops": 2.3
        }
    }

@app.get("/api/dashboard/overview")
def get_dashboard_overview():
    """Get dashboard overview data"""
    online_devices = len([d for d in devices_data if d["status"] == "online"])
    offline_devices = len([d for d in devices_data if d["status"] == "offline"])
    warning_devices = len([d for d in devices_data if d["status"] == "warning"])
    
    critical_alerts = len([a for a in alerts_data if a["severity"] == "critical"])
    high_alerts = len([a for a in alerts_data if a["severity"] == "high"])
    
    # Calculate system health based on online devices and alerts
    device_health = (online_devices / len(devices_data)) * 100
    alert_impact = min(30, critical_alerts * 15 + high_alerts * 5)
    system_health = max(50, device_health - alert_impact)
    
    return {
        "status": "success",
        "data": {
            "totalDevices": len(devices_data),
            "onlineDevices": online_devices,
            "offlineDevices": offline_devices,
            "warningDevices": warning_devices,
            "criticalAlerts": critical_alerts,
            "systemHealth": round(system_health),
            "networkStatus": "Operational" if system_health > 75 else "Warning",
            "lastUpdate": datetime.now().isoformat(),
            "device_distribution": {
                "online": online_devices,
                "offline": offline_devices,
                "warning": warning_devices
            },
            "process_trend": [
                {"time": "00:00", "value": random.randint(40, 60)},
                {"time": "04:00", "value": random.randint(45, 65)},
                {"time": "08:00", "value": random.randint(55, 75)},
                {"time": "12:00", "value": random.randint(65, 85)},
                {"time": "16:00", "value": random.randint(70, 90)},
                {"time": "20:00", "value": random.randint(60, 80)},
                {"time": "24:00", "value": random.randint(50, 70)}
            ]
        }
    }

@app.get("/api/system/metrics")
def get_system_metrics():
    """Get system performance metrics"""
    return {
        "status": "success",
        "data": {
            "cpu_usage": random.uniform(20, 80),
            "memory_usage": random.uniform(30, 90),
            "disk_usage": random.uniform(40, 70),
            "network_throughput": random.uniform(100, 1000),
            "uptime": "5 days, 12:34:56",
            "load_average": [0.5, 0.8, 1.2]
        }
    }

# ARFF Data Stream APIs (for Industrial Process Data Viewer)
@app.get("/api/arff/status")
async def get_arff_status():
    """Get ARFF data service status and connection info."""
    try:
        # Check if industrial process is running
        process_data = industrial_generator.get_current_data()
        is_running = any(p.get("type") == "digital_control" and p.get("value") for p in process_data)
        
        return {
            "status": "success",
            "streaming": is_running,
            "connected": True,
            "fetch_interval": 1.0,
            "total_rows": len(process_data),
            "current_index": 0,
            "relation": "TenEast_Process_Data",
            "data_source": "TenEast Process Control System",
            "last_update": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting ARFF status: {e}")
        return {
            "status": "error",
            "streaming": False,
            "connected": False,
            "fetch_interval": 0,
            "total_rows": 0,
            "current_index": 0,
            "relation": "Unknown",
            "error": str(e)
        }

@app.get("/api/arff/data")
async def get_arff_data():
    """Get current ARFF data from industrial process."""
    try:
        process_data = industrial_generator.get_current_data()
        
        # Convert process data to ARFF-like format
        arff_data = {
            "relation": "TenEast_Process_Data",
            "attributes": [],
            "data": [],
            "timestamp": datetime.utcnow().isoformat(),
            "raw_data": {}
        }
        
        # Build attributes and data
        for point in process_data:
            attr_name = point["name"]
            attr_value = point["value"]
            
            arff_data["attributes"].append({
                "name": attr_name,
                "type": "numeric" if isinstance(attr_value, (int, float)) else "string",
                "description": point.get("description", ""),
                "unit": point.get("unit", "")
            })
            
            arff_data["raw_data"][attr_name] = attr_value
        
        # Add current data row
        arff_data["data"].append([point["value"] for point in process_data])
        
        return {
            "status": "success",
            "data": arff_data,
            "process_overview": {
                "process_name": INDUSTRIAL_CONFIG["process_name"],
                "total_points": len(process_data),
                "active_alarms": len([p for p in process_data if p.get("alarm_status") != "normal"]),
                "data_source": INDUSTRIAL_CONFIG["data_source"]
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting ARFF data: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/api/arff/summary")
async def get_arff_summary():
    """Get ARFF dataset summary."""
    try:
        process_data = industrial_generator.get_current_data()
        
        summary = {
            "connection_status": "connected",
            "service_running": True,
            "data_source": "TenEast Process Control System",
            "last_update": datetime.utcnow().isoformat(),
            "parameters_count": len(process_data),
            "system_health": 100,
            "relation": "TenEast_Process_Data",
            "total_rows": len(process_data),
            "attributes": len(process_data)
        }
        
        return {
            "status": "success",
            "data": summary
        }
        
    except Exception as e:
        logger.error(f"Error getting ARFF summary: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/api/arff/start")
async def start_arff_streaming():
    """Start ARFF data streaming."""
    try:
        # Enable process running state
        industrial_generator.current_values["DP_182355"] = True
        
        return {
            "status": "success",
            "message": "ARFF data streaming started",
            "streaming": True
        }
    except Exception as e:
        logger.error(f"Error starting ARFF streaming: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/api/arff/stop")
async def stop_arff_streaming():
    """Stop ARFF data streaming."""
    try:
        # Disable process running state
        industrial_generator.current_values["DP_182355"] = False
        
        return {
            "status": "success",
            "message": "ARFF data streaming stopped",
            "streaming": False
        }
    except Exception as e:
        logger.error(f"Error stopping ARFF streaming: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/api/process/points")
async def get_process_points():
    """Get current industrial process points data"""
    try:
        process_data = industrial_generator.get_current_data()
        return {
            "status": "success",
            "data": {
                "process_name": INDUSTRIAL_CONFIG["process_name"],
                "data_source": INDUSTRIAL_CONFIG["data_source"],
                "points": process_data,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Error getting process points: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/api/process/overview")
async def get_process_overview():
    """Get process overview and statistics"""
    try:
        process_data = industrial_generator.get_current_data()
        
        # Calculate process statistics
        running_points = [p for p in process_data if p["type"] != "digital_control"]
        alarm_points = [p for p in process_data if p["alarm_status"] != "normal"]
        
        valves = [p for p in process_data if p["type"] == "valve_position"]
        flows = [p for p in process_data if p["type"] == "flow_rate"]
        
        overview = {
            "process_status": process_data[13]["value"] if len(process_data) > 13 else True,  # Run status
            "total_points": len(process_data),
            "alarm_count": len(alarm_points),
            "critical_alarms": len([p for p in alarm_points if p["alarm_status"] == "critical"]),
            "warning_alarms": len([p for p in alarm_points if p["alarm_status"] == "warning"]),
            "average_valve_position": sum(v["value"] for v in valves) / len(valves) if valves else 0,
            "total_flow_rate": sum(f["value"] for f in flows) if flows else 0,
            "pressure": next((p["value"] for p in process_data if p["name"] == "Pressure"), 0),
            "level": next((p["value"] for p in process_data if p["name"] == "Level"), 0),
            "data_source": INDUSTRIAL_CONFIG["data_source"],
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return {
            "status": "success",
            "data": overview
        }
    except Exception as e:
        logger.error(f"Error getting process overview: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/api/process/control/{point_id}")
async def control_process_point(point_id: str, action: dict):
    """Control a process point (for digital controls)"""
    try:
        if point_id == "DP_182355":  # Run control
            new_value = action.get("value", True)
            industrial_generator.current_values[point_id] = new_value
            
            return {
                "status": "success",
                "message": f"Process {'started' if new_value else 'stopped'}",
                "data": {
                    "point_id": point_id,
                    "new_value": new_value,
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
        else:
            return {"status": "error", "message": "Point not controllable"}
    except Exception as e:
        logger.error(f"Error controlling process point: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/api/industrial/config")
async def get_industrial_config():
    """Get complete industrial system configuration."""
    try:
        return {
            "config": INDUSTRIAL_DATA,
            "timestamp": datetime.utcnow().isoformat(),
            "data_source": "TenEast Process Control System"
        }
    except Exception as e:
        logger.error(f"Error getting industrial config: {e}")
        return {"error": "Failed to get industrial configuration"}

@app.get("/api/industrial/datapoints")
async def get_industrial_datapoints():
    """Get industrial data points with current values."""
    try:
        current_data = industrial_generator.get_current_data()
        
        # Create a mapping of current values by XID
        current_values_map = {item["id"]: item["value"] for item in current_data}
        
        datapoints = []
        for point in INDUSTRIAL_DATA.get("dataPoints", []):
            datapoint = {
                "xid": point["xid"],
                "name": point["name"],
                "deviceName": point["deviceName"],
                "engineeringUnits": point.get("engineeringUnits", ""),
                "enabled": point.get("enabled", True),
                "current_value": current_values_map.get(point["xid"], 0),
                "timestamp": datetime.utcnow().isoformat(),
                "pointLocator": point.get("pointLocator", {})
            }
            datapoints.append(datapoint)
        
        return {
            "datapoints": datapoints,
            "total_points": len(datapoints),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting industrial datapoints: {e}")
        return {"error": "Failed to get industrial datapoints"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates."""
    await websocket.accept()
    active_connections.append(websocket)
    logger.info(f"Client connected. Total connections: {len(active_connections)}")
    
    try:
        # Send initial data
        initial_data = {
            "type": "initial_data",
            "devices": devices_data,
            "alerts": alerts_data[:10]  # Send latest 10 alerts
        }
        await websocket.send_text(json.dumps(initial_data))
        
        # Keep connection alive
        while True:
            try:
                # Wait for client messages (ping/pong)
                await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                await websocket.send_text(json.dumps({"type": "ping"}))
                
    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if websocket in active_connections:
            active_connections.remove(websocket)
        logger.info(f"Client removed. Total connections: {len(active_connections)}")

@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard():
    """Simple dashboard for testing."""
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>OT Security Monitoring</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; }
            .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
            .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .device { border-left: 4px solid #27ae60; }
            .device.offline { border-left-color: #e74c3c; }
            .alert { border-left: 4px solid #f39c12; }
            .alert.critical { border-left-color: #e74c3c; }
            .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .online { background: #d4edda; color: #155724; }
            .offline { background: #f8d7da; color: #721c24; }
            .critical { background: #f8d7da; color: #721c24; }
            .high { background: #fff3cd; color: #856404; }
            .medium { background: #cce8ff; color: #004085; }
            .log { background: #2c3e50; color: #ecf0f1; padding: 15px; border-radius: 8px; height: 200px; overflow-y: auto; font-family: monospace; font-size: 12px; }
            .timestamp { color: #95a5a6; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏭 OT Security Monitoring System</h1>
                <p>Real-time Industrial Control System Security Dashboard</p>
                <div>Status: <span id="connection-status">Connecting...</span></div>
            </div>
            
            <div class="grid">
                <div class="card">
                    <h3>📊 System Overview</h3>
                    <div id="system-stats">
                        <p>Devices: <span id="device-count">-</span></p>
                        <p>Active Alerts: <span id="alert-count">-</span></p>
                        <p>Critical Alerts: <span id="critical-count">-</span></p>
                    </div>
                </div>
                
                <div class="card">
                    <h3>🖥️ Devices</h3>
                    <div id="devices-list"></div>
                </div>
                
                <div class="card">
                    <h3>🚨 Recent Alerts</h3>
                    <div id="alerts-list"></div>
                </div>
                
                <div class="card">
                    <h3>📝 Real-time Log</h3>
                    <div id="log" class="log"></div>
                </div>
            </div>
        </div>

        <script>
            const ws = new WebSocket('ws://localhost:8000/ws');
            const log = document.getElementById('log');
            const connectionStatus = document.getElementById('connection-status');
            
            function addLog(message) {
                const timestamp = new Date().toLocaleTimeString();
                log.innerHTML += '<div><span class="timestamp">[' + timestamp + ']</span> ' + message + '</div>';
                log.scrollTop = log.scrollHeight;
                
                // Keep only last 50 lines
                const lines = log.children;
                if (lines.length > 50) {
                    log.removeChild(lines[0]);
                }
            }
            
            function updateDevices(devices) {
                const devicesList = document.getElementById('devices-list');
                devicesList.innerHTML = '';
                
                devices.forEach(device => {
                    const deviceElement = document.createElement('div');
                    deviceElement.className = 'device ' + (device.status === 'online' ? 'online' : 'offline');
                    deviceElement.innerHTML = `
                        <strong>${device.name}</strong> (${device.ip_address})<br>
                        <small>${device.device_type} | Risk: ${device.cpu_usage}</small><br>
                        <span class="status ${device.status === 'online' ? 'online' : 'offline'}">
                            ${device.status.toUpperCase()}
                        </span>
                    `;
                    devicesList.appendChild(deviceElement);
                });
                
                document.getElementById('device-count').textContent = devices.length;
            }
            
            function updateAlerts(alerts) {
                const alertsList = document.getElementById('alerts-list');
                alertsList.innerHTML = '';
                
                alerts.slice(0, 5).forEach(alert => {
                    const alertElement = document.createElement('div');
                    alertElement.className = 'alert ' + alert.severity;
                    alertElement.innerHTML = `
                        <strong>${alert.alert_type}</strong><br>
                        <small>${alert.description}</small><br>
                        <span class="status ${alert.severity}">${alert.severity.toUpperCase()}</span>
                    `;
                    alertsList.appendChild(alertElement);
                });
                
                document.getElementById('alert-count').textContent = alerts.length;
                document.getElementById('critical-count').textContent = 
                    alerts.filter(a => a.severity === 'critical').length;
            }
            
            ws.onopen = function() {
                connectionStatus.textContent = 'Connected ✅';
                connectionStatus.style.color = '#27ae60';
                addLog('Connected to OT Security System');
            };
            
            ws.onmessage = function(event) {
                const data = JSON.parse(event.data);
                
                if (data.type === 'initial_data') {
                    addLog('Received initial data');
                    updateDevices(data.devices);
                    updateAlerts(data.alerts);
                } else if (data.type === 'device_status_changed') {
                    addLog(`Device ${data.ip_address} is now ${data.status}`);
                    fetch('/api/devices').then(r => r.json()).then(updateDevices);
                } else if (data.type === 'new_alert') {
                    addLog(`🚨 NEW ${data.alert.severity.toUpperCase()} ALERT: ${data.alert.alert_type}`);
                    fetch('/api/alerts').then(r => r.json()).then(updateAlerts);
                } else if (data.type === 'risk_score_updated') {
                    addLog(`Risk score updated for ${data.ip_address}: ${data.risk_score}`);
                    fetch('/api/devices').then(r => r.json()).then(updateDevices);
                } else if (data.type !== 'ping') {
                    addLog('Event: ' + data.type);
                }
            };
            
            ws.onclose = function() {
                connectionStatus.textContent = 'Disconnected ❌';
                connectionStatus.style.color = '#e74c3c';
                addLog('Disconnected from server');
            };
            
            ws.onerror = function() {
                connectionStatus.textContent = 'Connection Error ⚠️';
                connectionStatus.style.color = '#f39c12';
                addLog('Connection error occurred');
            };
            
            // Send ping every 25 seconds to keep connection alive
            setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({type: 'ping'}));
                }
            }, 25000);
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

# ==================== ML PREDICTION ENDPOINTS ====================

# Load trained models
MODELS_DIR = Path("/app/trained_models")
models_cache = {}

def load_ml_models():
    """Load all trained models into cache"""
    global models_cache
    try:
        if MODELS_DIR.exists():
            models_cache = {
                'anomaly_detector': joblib.load(MODELS_DIR / 'ensemble_model.pkl'),
                'protocol_classifier': joblib.load(MODELS_DIR / 'random_forest_model.pkl'),
                'scaler': joblib.load(MODELS_DIR / 'scalers.pkl'),
                'label_encoder': joblib.load(MODELS_DIR / 'label_encoder.pkl'),
                'feature_selectors': joblib.load(MODELS_DIR / 'feature_selectors.pkl')
            }
            logger.info("ML models loaded successfully")
    except Exception as e:
        logger.warning(f"Could not load ML models: {e}")
        # Create mock models for demo
        models_cache = {
            'anomaly_detector': None,
            'protocol_classifier': None,
            'scaler': None,
            'label_encoder': None,
            'feature_selectors': None
        }

# Load models on startup
load_ml_models()

@app.get("/api/ml/predict/anomaly")
async def predict_anomaly():
    """Predict anomalies in current network traffic"""
    try:
        # Generate realistic network traffic features for prediction
        traffic_features = {
            'packet_size_avg': random.uniform(64, 1500),
            'packet_size_std': random.uniform(10, 200),
            'flow_duration': random.uniform(0.1, 30.0),
            'packets_per_second': random.uniform(1, 1000),
            'bytes_per_second': random.uniform(100, 100000),
            'tcp_flags_count': random.randint(1, 8),
            'unique_src_ports': random.randint(1, 100),
            'unique_dst_ports': random.randint(1, 50),
            'protocol_diversity': random.uniform(0.1, 1.0),
            'connection_state_changes': random.randint(0, 10)
        }
        
        # Simulate anomaly detection
        features_array = np.array(list(traffic_features.values())).reshape(1, -1)
        
        if models_cache.get('anomaly_detector') and models_cache.get('scaler'):
            # Use real model if available
            scaled_features = models_cache['scaler'].transform(features_array)
            anomaly_score = models_cache['anomaly_detector'].predict_proba(scaled_features)[0][1]
            is_anomaly = anomaly_score > 0.7
        else:
            # Mock prediction for demo
            anomaly_score = random.uniform(0.0, 1.0)
            is_anomaly = anomaly_score > 0.8
        
        return {
            "status": "success",
            "prediction": {
                "is_anomaly": bool(is_anomaly),
                "anomaly_score": float(anomaly_score),
                "confidence": float(random.uniform(0.7, 0.98)),
                "features_analyzed": traffic_features,
                "timestamp": datetime.utcnow().isoformat(),
                "model_version": "ensemble_v1.0"
            }
        }
    except Exception as e:
        logger.error(f"Error in anomaly prediction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ml/security/assessment")
async def get_security_assessment():
    """Get AI-powered security assessment"""
    try:
        # Simulate comprehensive security analysis
        current_time = datetime.utcnow()
        
        # Generate realistic threat indicators
        threat_indicators = []
        
        # Add random high-severity event occasionally
        if random.random() < 0.15:
            threat_indicators.append({
                "type": "Potential Cyber Attack",
                "severity": "critical",
                "confidence": 0.92,
                "description": "Detected potential command injection attempt",
                "timestamp": (current_time - timedelta(minutes=5)).isoformat(),
                "affected_devices": ["TenEast Process Controller", "Safety PLC"]
            })
        
        return {
            "status": "success",
            "assessment": {
                "overall_risk_score": random.randint(15, 35),
                "risk_level": "low" if random.random() > 0.3 else "medium",
                "threat_indicators": threat_indicators,
                "security_metrics": {
                    "network_anomalies_detected": random.randint(0, 5),
                    "protocol_violations": random.randint(0, 3),
                    "suspicious_communications": random.randint(0, 2),
                    "failed_authentication_attempts": random.randint(0, 1)
                },
                "recommendations": [
                    "Monitor VFD Panel communications closely",
                    "Review off-hours network activity patterns",
                    "Update firmware on legacy devices",
                    "Implement network segmentation for critical systems"
                ],
                "timestamp": current_time.isoformat(),
                "assessment_version": "ai_security_v1.2"
            }
        }
    except Exception as e:
        logger.error(f"Error in security assessment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== NOTIFICATION ENDPOINTS ====================

class NotificationRequest(BaseModel):
    type: str
    message: str
    priority: str = "medium"
    email: Optional[str] = None

notifications_store = []

@app.post("/api/notifications/send")
async def send_notification(notification: NotificationRequest):
    """Send notification (email simulation for demo)"""
    try:
        notification_data = {
            "id": len(notifications_store) + 1,
            "type": notification.type,
            "message": notification.message,
            "priority": notification.priority,
            "email": notification.email or "admin@ot-security.local",
            "timestamp": datetime.utcnow().isoformat(),
            "status": "sent",
            "read": False
        }
        
        notifications_store.append(notification_data)
        
        # Simulate email sending
        logger.info(f"📧 Email sent to {notification_data['email']}: {notification.message}")
        
        return {
            "status": "success",
            "message": "Notification sent successfully",
            "notification_id": notification_data["id"],
            "email_sent_to": notification_data["email"]
        }
    except Exception as e:
        logger.error(f"Error sending notification: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/notifications")
async def get_notifications():
    """Get all notifications"""
    try:
        # Add some sample notifications for demo
        if len(notifications_store) == 0:
            sample_notifications = [
                {
                    "id": 1,
                    "type": "security_alert",
                    "message": "Anomalous traffic detected on industrial network",
                    "priority": "high",
                    "email": "security@ot-security.local",
                    "timestamp": (datetime.utcnow() - timedelta(hours=1)).isoformat(),
                    "status": "sent",
                    "read": False
                },
                {
                    "id": 2,
                    "type": "system_update",
                    "message": "System maintenance scheduled for tonight",
                    "priority": "medium",
                    "email": "admin@ot-security.local",
                    "timestamp": (datetime.utcnow() - timedelta(hours=3)).isoformat(),
                    "status": "sent",
                    "read": True
                }
            ]
            notifications_store.extend(sample_notifications)
        
        return {
            "status": "success",
            "notifications": sorted(notifications_store, key=lambda x: x["timestamp"], reverse=True),
            "unread_count": len([n for n in notifications_store if not n["read"]])
        }
    except Exception as e:
        logger.error(f"Error getting notifications: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: int):
    """Mark notification as read"""
    try:
        notification = next((n for n in notifications_store if n["id"] == notification_id), None)
        if notification:
            notification["read"] = True
            return {"status": "success", "message": "Notification marked as read"}
        else:
            raise HTTPException(status_code=404, detail="Notification not found")
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Start background event generator
if __name__ == "__main__":
    import uvicorn
    
    # Start background event generation
    event_thread = threading.Thread(target=generate_realtime_events, daemon=True)
    event_thread.start()
    
    # Start the API server
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        log_level="info"
    )
