#!/usr/bin/env python3
"""
ICS Security Monitoring System - Backend API.
Provides REST API endpoints and WebSocket connections for the frontend.
"""

import json
import logging
import os
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, WebSocket, Depends, HTTPException, BackgroundTasks, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from datetime import datetime, timedelta

# Load environment variables
load_dotenv()

# Get Gemini API key from environment
GEMINI_API_KEY = os.getenv('GOOGLE_GEMINI_API_KEY')
if not GEMINI_API_KEY:
    logger.warning("GOOGLE_GEMINI_API_KEY not found in environment variables")

import requests

# from database.database import get_db, init_db
# from database import models, schemas, crud
# from services import detection_service, asset_service
from services.modbus_service import get_modbus_service
from services.arff_data_service import get_arff_service
from services.realtime_api import router as realtime_router

# Initialize FastAPI app
app = FastAPI(
    title="ICS Security Monitoring System",
    description="API for Industrial Control System Security Monitoring",
    version="1.0.0"
)

# Configure CORS
cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
logging.basicConfig(
    level=getattr(logging, log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('ics_api')

# Create database tables
# Base.metadata.create_all(bind=engine)  # Commented out for now

# Include real-time simulation router
app.include_router(realtime_router)

# Active WebSocket connections
active_connections: List[WebSocket] = []

# Gemini API configuration
@app.post("/api/ai/chat")
async def ai_chat(request: dict):
    """AI Chat endpoint using Gemini API with enhanced formatting"""
    try:
        # Check if API key is available
        if not GEMINI_API_KEY:
            return {
                "status": "error", 
                "message": "AI service is not configured. Please contact administrator."
            }
        
        # Get the user message
        user_message = request.get("message", "").strip()
        
        if not user_message:
            return {"status": "error", "message": "No message provided"}

        # Enhanced system prompt for structured, well-formatted responses
        payload = {
            "contents": [{
                "parts": [{
                    "text": f"""You are an expert Industrial Control Systems (ICS) and Operational Technology (OT) security specialist with extensive knowledge of:

🔧 TECHNICAL EXPERTISE:
• SCADA systems, PLCs, HMIs, and RTUs
• Industrial protocols (Modbus, DNP3, EtherNet/IP, OPC UA, BACnet)
• OT cybersecurity threats, vulnerabilities, and attack vectors
• Industrial process optimization and control systems
• Network monitoring, anomaly detection, and incident response
• Industrial safety systems (SIS/SIL) and functional safety

🏭 CURRENT SYSTEM CONTEXT:
You're supporting a TenEast process control system monitoring:
• **Valve Positions**: AValve, BValve, ProductValve, PurgeValve
• **Flow Measurements**: AFlow, BFlow, ProductFlow
• **Pressure & Level**: APressure, BPressure, ATank, BTank
• **Operational Status**: ProductionRate, SafetyInterlocks

📋 RESPONSE FORMATTING REQUIREMENTS:
CRITICAL: Your response MUST be formatted as clean HTML that will render properly in a web interface. Follow these rules:

1. **Use HTML tags instead of markdown**:
   - Use <strong>text</strong> for bold (NOT **text**)
   - Use <em>text</em> for emphasis (NOT *text*)
   - Use <h3>Heading</h3> for section headers
   - Use <ul><li>item</li></ul> for bullet lists
   - Use <ol><li>item</li></ol> for numbered lists
   - Use <br> for line breaks
   - Use <code>code</code> for technical terms

2. **Structure your response clearly**:
   - Start with a brief summary
   - Organize content in logical sections
   - Use headings and lists for readability
   - End with actionable insights when relevant

3. **Keep responses professional yet accessible**:
   - Use industry terminology accurately
   - Provide practical examples
   - Include safety considerations
   - Reference current best practices

4. **For technical questions**: Include specific protocols, standards, or implementation details
5. **For security questions**: Address both immediate risks and long-term strategies
6. **For operational questions**: Focus on efficiency, safety, and reliability

User Question: {user_message}

Remember: Format your entire response in HTML tags for proper web rendering. No markdown syntax."""
                }]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 1024,
            }
        }

        # Make request to Gemini API
        response = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={GEMINI_API_KEY}",
            headers={"Content-Type": "application/json"},
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            if "candidates" in result and len(result["candidates"]) > 0:
                ai_response = result["candidates"][0]["content"]["parts"][0]["text"]
                
                # Clean up the response and ensure proper HTML formatting
                ai_response = ai_response.strip()
                
                # If response doesn't contain HTML tags, apply basic formatting
                if not any(tag in ai_response for tag in ['<strong>', '<h3>', '<ul>', '<ol>', '<br>']):
                    # Convert basic patterns to HTML
                    lines = ai_response.split('\n')
                    formatted_lines = []
                    
                    for line in lines:
                        line = line.strip()
                        if not line:
                            formatted_lines.append('<br>')
                        elif line.startswith('##'):
                            formatted_lines.append(f'<h3>{line[2:].strip()}</h3>')
                        elif line.startswith('•') or line.startswith('-'):
                            formatted_lines.append(f'<li>{line[1:].strip()}</li>')
                        else:
                            # Convert **text** to <strong>text</strong>
                            import re
                            line = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', line)
                            formatted_lines.append(line)
                    
                    ai_response = ''.join(formatted_lines)
                
                return {
                    "status": "success",
                    "response": ai_response,
                    "model": "gemini-1.5-flash"
                }
            else:
                return {"status": "error", "message": "No response generated"}
        else:
            logger.error(f"Gemini API error: {response.status_code} - {response.text}")
            return {"status": "error", "message": f"API error: {response.status_code}"}
            
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        return {"status": "error", "message": str(e)}

# ARFF Real-time Data Endpoints
@app.get("/api/arff/status")
async def get_arff_status():
    """Get ARFF data service status and summary."""
    arff_service = get_arff_service()
    return await arff_service.get_data_summary()

@app.get("/api/arff/data")
async def get_arff_data():
    """Get latest ARFF data."""
    arff_service = get_arff_service()
    data = await arff_service.get_cached_data()
    
    if not data:
        raise HTTPException(status_code=503, detail="No ARFF data available")
    
    return {
        "status": "success",
        "data": data,
        "summary": await arff_service.get_data_summary()
    }

@app.get("/api/arff/summary")
async def get_arff_summary():
    """Get ARFF dataset summary and metadata."""
    arff_service = get_arff_service()
    return await arff_service.get_data_summary()

@app.post("/api/arff/start")
async def start_arff_streaming():
    """Start ARFF data streaming."""
    try:
        arff_service = get_arff_service()
        if not arff_service.running:
            # Start streaming in background task
            import asyncio
            asyncio.create_task(arff_service.start_data_streaming())
            return {"status": "success", "message": "ARFF data streaming started"}
        else:
            return {"status": "info", "message": "ARFF data streaming already running"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/arff/stop")
async def stop_arff_streaming():
    """Stop ARFF data streaming."""
    try:
        arff_service = get_arff_service()
        await arff_service.stop_data_streaming()
        return {"status": "success", "message": "ARFF data streaming stopped"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Modbus endpoints (keeping for compatibility)
@app.get("/api/modbus/status")
async def get_modbus_status():
    """Get Modbus connection status and device info."""
    modbus_service = get_modbus_service()
    return modbus_service.get_device_info()

@app.get("/api/modbus/data")
async def get_modbus_data():
    """Get latest Modbus data."""
    modbus_service = get_modbus_service()
    data = await modbus_service.get_cached_data()
    
    if not data:
        raise HTTPException(status_code=503, detail="No Modbus data available")
    
    return {
        "status": "success",
        "data": data,
        "device_info": modbus_service.get_device_info()
    }

@app.post("/api/modbus/connect")
async def connect_modbus():
    """Connect to Modbus device."""
    modbus_service = get_modbus_service()
    success = await modbus_service.connect()
    
    if success:
        return {"status": "connected", "message": "Successfully connected to Modbus device"}
    else:
        raise HTTPException(status_code=503, detail="Failed to connect to Modbus device")

@app.post("/api/modbus/disconnect")
async def disconnect_modbus():
    """Disconnect from Modbus device."""
    modbus_service = get_modbus_service()
    await modbus_service.disconnect()
    return {"status": "disconnected", "message": "Disconnected from Modbus device"}

# Device endpoints
@app.get("/api/devices")
async def get_devices(db: Session = Depends(get_db)):
    """Get all devices."""
    # Hard-code mock data
    from datetime import timedelta
    
    return [
        {
            "id": 1,
            "ip_address": "192.168.95.2",
            "mac_address": "00:1A:2B:3C:4D:5E",
            "hostname": "plc_2",
            "device_type": "PLC",
            "vendor": "Siemens",
            "model": "S7-1200",
            "protocols": [{"id": 1, "name": "Modbus"}],
            "is_online": True,
            "risk_score": 85.0,
            "last_seen": datetime.utcnow().isoformat(),
            "first_discovered": (datetime.utcnow() - timedelta(days=30)).isoformat(),
            "notes": "Primary PLC controlling production line"
        },
        {
            "id": 2,
            "ip_address": "192.168.95.3",
            "mac_address": "00:1A:2B:3C:4D:6F",
            "hostname": "hmi_station",
            "device_type": "HMI",
            "vendor": "Allen-Bradley",
            "model": "PanelView Plus",
            "protocols": [{"id": 2, "name": "EtherNet/IP"}],
            "is_online": True,
            "risk_score": 45.0,
            "last_seen": (datetime.utcnow() - timedelta(minutes=2)).isoformat(),
            "first_discovered": (datetime.utcnow() - timedelta(days=25)).isoformat(),
            "notes": "Operator interface station"
        },
        {
            "id": 3,
            "ip_address": "192.168.95.4",
            "mac_address": "00:1A:2B:3C:4D:70",
            "hostname": "scada_server",
            "device_type": "SCADA",
            "vendor": "Schneider Electric",
            "model": "Citect",
            "protocols": [{"id": 3, "name": "DNP3"}, {"id": 4, "name": "Modbus"}],
            "is_online": True,
            "risk_score": 65.0,
            "last_seen": (datetime.utcnow() - timedelta(minutes=1)).isoformat(),
            "first_discovered": (datetime.utcnow() - timedelta(days=45)).isoformat(),
            "notes": "Central SCADA system"
        }
    ]

@app.get("/api/devices/{device_id}", response_model=schemas.Device)
async def get_device(device_id: int, db: Session = Depends(get_db)):
    """Get device by ID."""
    device = crud.get_device(db, device_id)
    if device is None:
        raise HTTPException(status_code=404, detail="Device not found")
    return device

@app.post("/api/devices/scan", response_model=schemas.ScanResponse)
async def scan_devices(
    scan_request: schemas.ScanRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Scan network for ICS devices."""
    # Start scan in background
    background_tasks.add_task(
        asset_service.scan_network,
        scan_request.network_range,
        scan_request.scan_type,
        db
    )
    
    return {
        "scan_id": scan_request.scan_id,
        "status": "started",
        "message": f"Scanning {scan_request.network_range} with {scan_request.scan_type} scan"
    }

# Alert endpoints
@app.get("/api/alerts")
async def get_alerts(
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get alerts with pagination."""
    # Hard-code mock data
    from datetime import timedelta
    
    alerts = [
        {
            "id": 1,
            "device_id": 1,
            "alert_type": "Buffer Overflow Attempt",
            "severity": "critical",
            "description": "Potential exploitation of libmodbus vulnerability on PLC_2",
            "details": {
                "source_ip": "192.168.95.100",
                "target_port": 502,
                "function_code": 16,
                "payload_size": 2048
            },
            "timestamp": (datetime.utcnow() - timedelta(minutes=15)).isoformat(),
            "acknowledged": False,
            "resolved": False
        },
        {
            "id": 2,
            "device_id": 2,
            "alert_type": "Unauthorized Access",
            "severity": "high",
            "description": "Failed login attempts detected on HMI station",
            "details": {
                "source_ip": "192.168.95.150",
                "failed_attempts": 5,
                "last_attempt": (datetime.utcnow() - timedelta(hours=1)).isoformat()
            },
            "timestamp": (datetime.utcnow() - timedelta(hours=2)).isoformat(),
            "acknowledged": True,
            "acknowledged_by": "admin",
            "acknowledged_at": (datetime.utcnow() - timedelta(hours=1)).isoformat(),
            "resolved": False
        },
        {
            "id": 3,
            "device_id": 1,
            "alert_type": "Protocol Anomaly",
            "severity": "medium",
            "description": "Unusual Modbus function code sequence detected",
            "details": {
                "function_codes": [1, 3, 16, 23],
                "frequency": "high",
                "pattern": "suspicious"
            },
            "timestamp": (datetime.utcnow() - timedelta(hours=6)).isoformat(),
            "acknowledged": False,
            "resolved": False
        },
        {
            "id": 4,
            "device_id": 3,
            "alert_type": "Malicious Traffic",
            "severity": "high",
            "description": "Potential malware communication detected",
            "details": {
                "external_ip": "203.0.113.45",
                "port": 443,
                "data_size": "10MB",
                "encryption": "unknown"
            },
            "timestamp": (datetime.utcnow() - timedelta(hours=12)).isoformat(),
            "acknowledged": True,
            "acknowledged_by": "security_team",
            "acknowledged_at": (datetime.utcnow() - timedelta(hours=10)).isoformat(),
            "resolved": True,
            "resolved_at": (datetime.utcnow() - timedelta(hours=8)).isoformat()
        }
    ]
    
    return alerts[offset:offset+limit]

@app.get("/api/alerts/{alert_id}", response_model=schemas.Alert)
async def get_alert(alert_id: int, db: Session = Depends(get_db)):
    """Get alert by ID."""
    alert = crud.get_alert(db, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert

# Network map endpoint
@app.get("/api/network/map")
async def get_network_map(db: Session = Depends(get_db)):
    """Get network topology and device mapping."""
    # Get all devices
    devices = crud.get_devices(db)
    
    # Create comprehensive network topology
    network_topology = {
        "nodes": [
            # Core Infrastructure
            {
                "id": "scada-primary",
                "name": "SCADA Primary Server",
                "type": "server",
                "category": "control",
                "status": "active",
                "ip": "192.168.1.10",
                "location": "Control Room",
                "vendor": "Schneider Electric",
                "model": "ClearSCADA",
                "protocols": ["OPC", "Modbus TCP", "DNP3"],
                "criticality": "high",
                "x": 350,
                "y": 150
            },
            {
                "id": "scada-backup",
                "name": "SCADA Backup Server",
                "type": "server",
                "category": "control",
                "status": "standby",
                "ip": "192.168.1.11",
                "location": "Control Room",
                "vendor": "Schneider Electric",
                "model": "ClearSCADA",
                "protocols": ["OPC", "Modbus TCP", "DNP3"],
                "criticality": "high",
                "x": 450,
                "y": 150
            },
            {
                "id": "hmi-01",
                "name": "Operator Station 1",
                "type": "workstation",
                "category": "hmi",
                "status": "active",
                "ip": "192.168.1.20",
                "location": "Control Room",
                "vendor": "Wonderware",
                "model": "InTouch HMI",
                "protocols": ["OPC", "Ethernet"],
                "criticality": "medium",
                "x": 250,
                "y": 250
            },
            {
                "id": "hmi-02",
                "name": "Operator Station 2",
                "type": "workstation",
                "category": "hmi",
                "status": "active",
                "ip": "192.168.1.21",
                "location": "Control Room",
                "vendor": "Wonderware",
                "model": "InTouch HMI",
                "protocols": ["OPC", "Ethernet"],
                "criticality": "medium",
                "x": 550,
                "y": 250
            },
            
            # PLCs and Control Systems
            {
                "id": "plc-reactor",
                "name": "Reactor PLC",
                "type": "plc",
                "category": "control",
                "status": "active",
                "ip": "192.168.95.2",
                "location": "Reactor Area",
                "vendor": "Allen-Bradley",
                "model": "ControlLogix L75",
                "protocols": ["Ethernet/IP", "Modbus TCP"],
                "criticality": "critical",
                "x": 200,
                "y": 400
            },
            {
                "id": "plc-separator",
                "name": "Separator PLC",
                "type": "plc",
                "category": "control",
                "status": "active",
                "ip": "192.168.95.3",
                "location": "Separator Area",
                "vendor": "Siemens",
                "model": "S7-1500",
                "protocols": ["PROFINET", "Modbus TCP"],
                "criticality": "critical",
                "x": 600,
                "y": 400
            },
            
            # RTUs and Field Devices
            {
                "id": "rtu-field-01",
                "name": "Field RTU 1",
                "type": "rtu",
                "category": "field",
                "status": "active",
                "ip": "192.168.95.10",
                "location": "Field Station A",
                "vendor": "GE Digital",
                "model": "D20MX",
                "protocols": ["DNP3", "Modbus RTU"],
                "criticality": "medium",
                "x": 150,
                "y": 550
            },
            {
                "id": "rtu-field-02",
                "name": "Field RTU 2",
                "type": "rtu",
                "category": "field",
                "status": "active",
                "ip": "192.168.95.11",
                "location": "Field Station B",
                "vendor": "GE Digital",
                "model": "D20MX",
                "protocols": ["DNP3", "Modbus RTU"],
                "criticality": "medium",
                "x": 650,
                "y": 550
            },
            
            # Network Infrastructure
            {
                "id": "firewall-01",
                "name": "Industrial Firewall",
                "type": "firewall",
                "category": "security",
                "status": "active",
                "ip": "192.168.1.1",
                "location": "Network Rack",
                "vendor": "Fortinet",
                "model": "FortiGate Industrial",
                "protocols": ["TCP/IP"],
                "criticality": "high",
                "x": 400,
                "y": 80
            },
            {
                "id": "switch-01",
                "name": "Industrial Switch 1",
                "type": "switch",
                "category": "network",
                "status": "active",
                "ip": "192.168.1.2",
                "location": "Control Room Rack",
                "vendor": "Cisco",
                "model": "IE-3400",
                "protocols": ["Ethernet"],
                "criticality": "high",
                "x": 250,
                "y": 320
            },
            {
                "id": "switch-02",
                "name": "Industrial Switch 2",
                "type": "switch",
                "category": "network",
                "status": "active",
                "ip": "192.168.95.1",
                "location": "Field Rack",
                "vendor": "Cisco",
                "model": "IE-3400",
                "protocols": ["Ethernet"],
                "criticality": "high",
                "x": 550,
                "y": 320
            },
            
            # Process Equipment
            {
                "id": "pump-01",
                "name": "Feed Pump A",
                "type": "actuator",
                "category": "equipment",
                "status": "running",
                "location": "Feed System",
                "vendor": "Grundfos",
                "model": "CR 95",
                "protocols": ["4-20mA", "HART"],
                "criticality": "medium",
                "x": 100,
                "y": 620
            },
            {
                "id": "valve-01",
                "name": "Control Valve CV-101",
                "type": "actuator",
                "category": "equipment",
                "status": "active",
                "location": "Reactor Inlet",
                "vendor": "Fisher",
                "model": "ED Series",
                "protocols": ["4-20mA", "HART"],
                "criticality": "medium",
                "x": 250,
                "y": 620
            },
            {
                "id": "sensor-01",
                "name": "Temperature Sensor TE-101",
                "type": "sensor",
                "category": "equipment",
                "status": "active",
                "location": "Reactor Vessel",
                "vendor": "Rosemount",
                "model": "3144P",
                "protocols": ["4-20mA", "HART"],
                "criticality": "medium",
                "x": 700,
                "y": 620
            }
        ],
        "connections": [
            # Core control connections
            {"source": "firewall-01", "target": "scada-primary", "protocol": "TCP/IP", "status": "active"},
            {"source": "firewall-01", "target": "scada-backup", "protocol": "TCP/IP", "status": "active"},
            {"source": "scada-primary", "target": "hmi-01", "protocol": "OPC", "status": "active"},
            {"source": "scada-primary", "target": "hmi-02", "protocol": "OPC", "status": "active"},
            {"source": "scada-backup", "target": "hmi-01", "protocol": "OPC", "status": "standby"},
            {"source": "scada-backup", "target": "hmi-02", "protocol": "OPC", "status": "standby"},
            
            # Network infrastructure
            {"source": "firewall-01", "target": "switch-01", "protocol": "Ethernet", "status": "active"},
            {"source": "switch-01", "target": "switch-02", "protocol": "Ethernet", "status": "active"},
            
            # Control system connections
            {"source": "scada-primary", "target": "plc-reactor", "protocol": "Modbus TCP", "status": "active"},
            {"source": "scada-primary", "target": "plc-separator", "protocol": "Modbus TCP", "status": "active"},
            {"source": "switch-01", "target": "plc-reactor", "protocol": "Ethernet/IP", "status": "active"},
            {"source": "switch-02", "target": "plc-separator", "protocol": "PROFINET", "status": "active"},
            
            # Field device connections
            {"source": "plc-reactor", "target": "rtu-field-01", "protocol": "Modbus RTU", "status": "active"},
            {"source": "plc-separator", "target": "rtu-field-02", "protocol": "DNP3", "status": "active"},
            {"source": "switch-02", "target": "rtu-field-01", "protocol": "Ethernet", "status": "active"},
            {"source": "switch-02", "target": "rtu-field-02", "protocol": "Ethernet", "status": "active"},
            
            # Process equipment connections
            {"source": "rtu-field-01", "target": "pump-01", "protocol": "4-20mA", "status": "active"},
            {"source": "plc-reactor", "target": "valve-01", "protocol": "4-20mA", "status": "active"},
            {"source": "plc-reactor", "target": "sensor-01", "protocol": "HART", "status": "active"}
        ],
        "metadata": {
            "total_nodes": 15,
            "total_connections": 19,
            "critical_devices": 4,
            "active_connections": 18,
            "standby_connections": 1,
            "last_updated": datetime.utcnow().isoformat(),
            "network_health": 95.0
        }
    }
    
    return network_topology

# Traffic data endpoints
@app.get("/api/traffic/protocols", response_model=Dict[str, int])
async def get_protocol_stats(db: Session = Depends(get_db)):
    """Get protocol distribution statistics."""
    return crud.get_protocol_stats(db)

@app.get("/api/traffic/volume", response_model=List[schemas.TrafficPoint])
async def get_traffic_volume(
    hours: int = 24,
    db: Session = Depends(get_db)
):
    """Get traffic volume over time."""
    return crud.get_traffic_volume(db, hours=hours)

# Anomaly detection endpoints
@app.post("/api/detection/analyze", response_model=schemas.DetectionResult)
async def analyze_traffic(
    analysis_request: schemas.AnalysisRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Analyze traffic for anomalies."""
    # Start analysis in background
    background_tasks.add_task(
        detection_service.analyze_traffic,
        analysis_request.time_range,
        analysis_request.devices,
        db
    )
    
    return {
        "analysis_id": analysis_request.analysis_id,
        "status": "started",
        "message": "Traffic analysis started"
    }

@app.get("/api/detection/results/{analysis_id}", response_model=schemas.DetectionResult)
async def get_analysis_result(analysis_id: str, db: Session = Depends(get_db)):
    """Get analysis results by ID."""
    result = crud.get_detection_result(db, analysis_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Analysis result not found")
    return result

# WebSocket for real-time updates
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time updates."""
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        import redis
        import asyncio
        
        # Connect to Redis for real-time events
        redis_client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            db=int(os.getenv('REDIS_DB', 0)),
            decode_responses=True
        )
        
        # Subscribe to events
        pubsub = redis_client.pubsub()
        pubsub.subscribe('modbus_events', 'ics_events')
        
        # Send initial data
        try:
            modbus_service = get_modbus_service()
            initial_modbus_data = {
                "type": "initial_modbus_data",
                "data": await modbus_service.get_cached_data(),
                "device_info": modbus_service.get_device_info()
            }
            await websocket.send_text(json.dumps(initial_modbus_data, default=str))
        except Exception as e:
            logger.warning(f"Failed to send initial modbus data: {e}")
        
        try:
            arff_service = get_arff_service()
            initial_arff_data = {
                "type": "initial_arff_data",
                "data": await arff_service.get_cached_data(),
                "summary": await arff_service.get_data_summary()
            }
            await websocket.send_text(json.dumps(initial_arff_data, default=str))
        except Exception as e:
            logger.warning(f"Failed to send initial ARFF data: {e}")
        
        # Listen for real-time events
        while True:
            try:
                # Non-blocking check for Redis messages
                message = pubsub.get_message(timeout=0.1)
                if message and message['type'] == 'message':
                    try:
                        data = json.loads(message['data'])
                        # Send data - let exceptions handle disconnection
                        try:
                            await websocket.send_text(json.dumps(data, default=str))
                        except Exception as send_error:
                            # WebSocket disconnected
                            logger.debug(f"WebSocket disconnected during send: {send_error}")
                            break
                    except json.JSONDecodeError:
                        logger.error(f"Invalid JSON in Redis message: {message['data']}")
                    except Exception as e:
                        logger.error(f"Error sending WebSocket message: {e}")
                        if "code = 1006" in str(e):
                            # Connection closed
                            break
                
                # Check for client messages
                try:
                    data = await asyncio.wait_for(websocket.receive_text(), timeout=0.01)
                    if data:
                        try:
                            msg = json.loads(data)
                            # Handle client messages here if needed
                            logger.debug(f"Received WebSocket message: {msg}")
                        except json.JSONDecodeError:
                            logger.warning(f"Invalid JSON from client: {data}")
                except asyncio.TimeoutError:
                    # No message from client, continue
                    pass
                except Exception as e:
                    if "code = 1000" in str(e) or "code = 1006" in str(e):
                        # Normal closure or client disconnected
                        break
                    else:
                        logger.error(f"Error receiving WebSocket message: {e}")
                        break
                
                # Small delay to prevent busy waiting
                await asyncio.sleep(0.1)
                
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {e}")
                break
                
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        try:
            if websocket in active_connections:
                active_connections.remove(websocket)
            await websocket.close()
        except Exception as e:
            logger.debug(f"Error during WebSocket cleanup: {e}")
            pass

# Broadcast message to all connected clients
async def broadcast_message(message: Dict[str, Any]):
    """Send message to all connected WebSocket clients."""
    disconnected = []
    
    for connection in active_connections:
        try:
            await connection.send_text(json.dumps(message, default=str))
        except Exception as e:
            logger.error(f"Error broadcasting message: {e}")
            disconnected.append(connection)
    
    # Remove disconnected clients
    for connection in disconnected:
        active_connections.remove(connection)

# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    modbus_service = get_modbus_service()
    arff_service = get_arff_service()
    
    return {
        "status": "healthy",
        "modbus_status": modbus_service.get_device_info(),
        "arff_status": await arff_service.get_data_summary(),
        "active_websockets": len(active_connections),
        "environment": {
            "debug": os.getenv('DEBUG', 'False').lower() == 'true',
            "log_level": os.getenv('LOG_LEVEL', 'INFO'),
            "has_gemini_key": bool(os.getenv('GOOGLE_GEMINI_API_KEY'))
        }
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "ICS Security Monitoring System API",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "websocket": "/ws",
            "modbus_data": "/api/modbus/data",
            "modbus_status": "/api/modbus/status",
            "ai_chat": "/api/ai/chat",
            "health": "/api/health"
        }
    }

@app.get("/api/dashboard/overview")
async def get_dashboard_overview(db: Session = Depends(get_db)):
    """Get comprehensive dashboard overview data."""
    try:
        # Get current system status
        arff_service = get_arff_service()
        modbus_service = get_modbus_service()
        
        # Get ARFF data summary
        arff_summary = await arff_service.get_data_summary()
        arff_data = await arff_service.get_cached_data()
        
        # Get device data
        devices_response = await get_devices(db)
        devices = devices_response
        total_devices = len(devices)
        online_devices = sum(1 for device in devices if device.get('is_online', True))
        
        # Get alert data
        alerts_response = await get_alerts(db=db, limit=100, offset=0)
        alerts = alerts_response
        
        # Calculate system health metrics
        device_health = (online_devices / total_devices * 100) if total_devices > 0 else 0
        
        # Get network status
        network_map = await get_network_map(db)
        network_health = network_map.get("metadata", {}).get("network_health", 0)
        
        # Count active alarms from ARFF data
        active_alarms = 0
        if arff_data and 'parameters' in arff_data:
            # Check for process alarms based on parameter values
            parameters = arff_data['parameters']
            
            # Example alarm conditions
            if parameters.get('AValve_Position', 0) > 90:
                active_alarms += 1
            if parameters.get('Reactor_Pressure', 0) > 180:
                active_alarms += 1
            if parameters.get('Reactor_Level', 0) < 20:
                active_alarms += 1
                
        # Security incidents (simulated)
        security_incidents = len([alert for alert in alerts if alert['severity'] in ["high", "critical"]])
        
        # Process efficiency calculation
        process_efficiency = 85.0  # Base efficiency
        if arff_data and 'state' in arff_data:
            state_value = arff_data['state'].get('value', 0)
            # Adjust efficiency based on system state
            if state_value == 0:  # Normal operation
                process_efficiency = 95.0
            elif state_value <= 2:  # Minor issues
                process_efficiency = 85.0
            elif state_value <= 4:  # Moderate issues
                process_efficiency = 70.0
            else:  # Critical issues
                process_efficiency = 50.0
        
        # Overall system status
        overall_health = (device_health + network_health + process_efficiency) / 3
        
        if overall_health >= 90:
            system_status = "optimal"
        elif overall_health >= 75:
            system_status = "good"
        elif overall_health >= 60:
            system_status = "degraded"
        else:
            system_status = "critical"
        
        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "system_overview": {
                "status": system_status,
                "overall_health": overall_health,
                "uptime": "99.8%",
                "last_maintenance": "2024-12-15T10:30:00Z"
            },
            "metrics": {
                "device_health": device_health,
                "network_health": network_health,
                "process_efficiency": process_efficiency,
                "data_quality": 98.5
            },
            "devices": {
                "total": total_devices,
                "online": online_devices,
                "offline": total_devices - online_devices,
                "maintenance": 0
            },
            "alerts": {
                "active_alarms": active_alarms,
                "security_incidents": security_incidents,
                "total_today": len(alerts),
                "critical": len([alert for alert in alerts if alert['severity'] == "critical"])
            },
            "process_data": {
                "current_state": arff_data.get('system_state', {}) if arff_data else {},
                "parameter_count": len(arff_data.get('raw_data', {})) if arff_data else 0,
                "last_update": datetime.utcnow().isoformat(),
                "data_source": "UAH ICS Dataset"
            },
            "network": {
                "total_nodes": network_map.get("metadata", {}).get("total_nodes", 0),
                "active_connections": network_map.get("metadata", {}).get("active_connections", 0),
                "network_health": network_health
            },
            "recent_events": []
        }
    except Exception as e:
        logger.error(f"Error generating dashboard overview: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate dashboard overview: {str(e)}"
        )

# On startup event handler
@app.on_event("startup")
async def startup_event():
    """Startup event handler for FastAPI."""
    logger.info("Initializing API server...")
    try:
        # Initialize database with seed data
        init_db()
        logger.info("Database initialized")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")

@app.get("/api/static/devices")
async def get_static_devices():
    """Get static device data."""
    from datetime import timedelta
    
    return [
        {
            "id": 1,
            "ip_address": "192.168.95.2",
            "mac_address": "00:1A:2B:3C:4D:5E",
            "hostname": "plc_2",
            "device_type": "PLC",
            "vendor": "Siemens",
            "model": "S7-1200",
            "protocols": [{"id": 1, "name": "Modbus"}],
            "is_online": True,
            "risk_score": 85.0,
            "last_seen": datetime.utcnow().isoformat(),
            "first_discovered": (datetime.utcnow() - timedelta(days=30)).isoformat(),
            "notes": "Primary PLC controlling production line"
        },
        {
            "id": 2,
            "ip_address": "192.168.95.3",
            "mac_address": "00:1A:2B:3C:4D:6F",
            "hostname": "hmi_station",
            "device_type": "HMI",
            "vendor": "Allen-Bradley",
            "model": "PanelView Plus",
            "protocols": [{"id": 2, "name": "EtherNet/IP"}],
            "is_online": True,
            "risk_score": 45.0,
            "last_seen": (datetime.utcnow() - timedelta(minutes=2)).isoformat(),
            "first_discovered": (datetime.utcnow() - timedelta(days=25)).isoformat(),
            "notes": "Operator interface station"
        },
        {
            "id": 3,
            "ip_address": "192.168.95.4",
            "mac_address": "00:1A:2B:3C:4D:70",
            "hostname": "scada_server",
            "device_type": "SCADA",
            "vendor": "Schneider Electric",
            "model": "Citect",
            "protocols": [{"id": 3, "name": "DNP3"}, {"id": 4, "name": "Modbus"}],
            "is_online": True,
            "risk_score": 65.0,
            "last_seen": (datetime.utcnow() - timedelta(minutes=1)).isoformat(),
            "first_discovered": (datetime.utcnow() - timedelta(days=45)).isoformat(),
            "notes": "Central SCADA system"
        }
    ]

@app.get("/api/static/alerts")
async def get_static_alerts():
    """Get static alert data."""
    return [
        {
            "id": 1,
            "device_id": 1,
            "alert_type": "Buffer Overflow Attempt",
            "severity": "critical",
            "description": "Potential exploitation of libmodbus vulnerability on PLC_2",
            "details": {
                "source_ip": "192.168.95.100",
                "target_port": 502,
                "function_code": 16,
                "payload_size": 2048
            },
            "timestamp": (datetime.utcnow() - timedelta(minutes=15)).isoformat(),
            "acknowledged": False,
            "resolved": False
        },
        {
            "id": 2,
            "device_id": 2,
            "alert_type": "Unauthorized Access",
            "severity": "high",
            "description": "Failed login attempts detected on HMI station",
            "details": {
                "source_ip": "192.168.95.150",
                "failed_attempts": 5,
                "last_attempt": (datetime.utcnow() - timedelta(hours=1)).isoformat()
            },
            "timestamp": (datetime.utcnow() - timedelta(hours=2)).isoformat(),
            "acknowledged": True,
            "acknowledged_by": "admin",
            "acknowledged_at": (datetime.utcnow() - timedelta(hours=1)).isoformat(),
            "resolved": False
        },
        {
            "id": 3,
            "device_id": 1,
            "alert_type": "Protocol Anomaly",
            "severity": "medium",
            "description": "Unusual Modbus function code sequence detected",
            "details": {
                "function_codes": [1, 3, 16, 23],
                "frequency": "high",
                "pattern": "suspicious"
            },
            "timestamp": (datetime.utcnow() - timedelta(hours=6)).isoformat(),
            "acknowledged": False,
            "resolved": False
        },
        {
            "id": 4,
            "device_id": 3,
            "alert_type": "Malicious Traffic",
            "severity": "high",
            "description": "Potential malware communication detected",
            "details": {
                "external_ip": "203.0.113.45",
                "port": 443,
                "data_size": "10MB",
                "encryption": "unknown"
            },
            "timestamp": (datetime.utcnow() - timedelta(hours=12)).isoformat(),
            "acknowledged": True,
            "acknowledged_by": "security_team",
            "acknowledged_at": (datetime.utcnow() - timedelta(hours=10)).isoformat(),
            "resolved": True,
            "resolved_at": (datetime.utcnow() - timedelta(hours=8)).isoformat()
        }
    ]

@app.get("/api/static/dashboard")
async def get_static_dashboard():
    """Get static dashboard overview data."""
    return {
        "status": "success",
        "timestamp": datetime.utcnow().isoformat(),
        "system_overview": {
            "status": "good",
            "overall_health": 82.5,
            "uptime": "99.8%",
            "last_maintenance": "2024-12-15T10:30:00Z"
        },
        "metrics": {
            "device_health": 90.0,
            "network_health": 95.0,
            "process_efficiency": 85.0,
            "data_quality": 98.5
        },
        "devices": {
            "total": 3,
            "online": 3,
            "offline": 0,
            "maintenance": 0
        },
        "alerts": {
            "active_alarms": 2,
            "security_incidents": 3,
            "total_today": 4,
            "critical": 1
        },
        "process_data": {
            "current_state": {"code": "0", "name": "Normal Operation", "severity": "info", "color": "#4CAF50"},
            "parameter_count": 27,
            "last_update": datetime.utcnow().isoformat(),
            "data_source": "UAH ICS Dataset"
        },
        "network": {
            "total_nodes": 15,
            "active_connections": 18,
            "network_health": 95.0
        },
        "recent_events": []
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True) 