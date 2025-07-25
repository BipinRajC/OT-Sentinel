"""
Mock data provider for the ICS Security Monitoring System.
Provides sample data when database is not available.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any
import random


def get_mock_devices() -> List[Dict[str, Any]]:
    """Get mock device data."""
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
            "last_seen": datetime.utcnow(),
            "first_discovered": datetime.utcnow() - timedelta(days=30),
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
            "last_seen": datetime.utcnow() - timedelta(minutes=2),
            "first_discovered": datetime.utcnow() - timedelta(days=25),
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
            "last_seen": datetime.utcnow() - timedelta(minutes=1),
            "first_discovered": datetime.utcnow() - timedelta(days=45),
            "notes": "Central SCADA system"
        }
    ]


def get_mock_alerts() -> List[Dict[str, Any]]:
    """Get mock alert data."""
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
            "timestamp": datetime.utcnow() - timedelta(minutes=15),
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
                "last_attempt": datetime.utcnow() - timedelta(hours=1)
            },
            "timestamp": datetime.utcnow() - timedelta(hours=2),
            "acknowledged": True,
            "acknowledged_by": "admin",
            "acknowledged_at": datetime.utcnow() - timedelta(hours=1),
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
            "timestamp": datetime.utcnow() - timedelta(hours=6),
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
            "timestamp": datetime.utcnow() - timedelta(hours=12),
            "acknowledged": True,
            "acknowledged_by": "security_team",
            "acknowledged_at": datetime.utcnow() - timedelta(hours=10),
            "resolved": True,
            "resolved_at": datetime.utcnow() - timedelta(hours=8)
        }
    ]


def get_mock_connections() -> List[Dict[str, Any]]:
    """Get mock connection data."""
    return [
        {
            "id": 1,
            "source_id": 1,
            "target_id": 2,
            "protocol": "Modbus",
            "port": 502,
            "is_active": True,
            "traffic_volume": 150,
            "last_seen": datetime.utcnow(),
            "first_discovered": datetime.utcnow() - timedelta(days=20)
        },
        {
            "id": 2,
            "source_id": 2,
            "target_id": 1,
            "protocol": "EtherNet/IP",
            "port": 44818,
            "is_active": True,
            "traffic_volume": 89,
            "last_seen": datetime.utcnow() - timedelta(minutes=5),
            "first_discovered": datetime.utcnow() - timedelta(days=20)
        },
        {
            "id": 3,
            "source_id": 3,
            "target_id": 1,
            "protocol": "DNP3",
            "port": 20000,
            "is_active": True,
            "traffic_volume": 45,
            "last_seen": datetime.utcnow() - timedelta(minutes=2),
            "first_discovered": datetime.utcnow() - timedelta(days=30)
        }
    ]


def get_mock_protocol_stats() -> Dict[str, int]:
    """Get mock protocol statistics."""
    return {
        "Modbus": 450,
        "EtherNet/IP": 230,
        "DNP3": 150,
        "OPC-UA": 80,
        "BACnet": 40,
        "S7comm": 25
    }


def get_mock_traffic_volume(hours: int = 24) -> List[Dict[str, Any]]:
    """Get mock traffic volume data."""
    data_points = []
    now = datetime.utcnow()
    
    for i in range(hours, 0, -1):
        timestamp = now - timedelta(hours=i)
        
        # Generate realistic traffic patterns (higher during business hours)
        hour = timestamp.hour
        if 8 <= hour <= 18:  # Business hours
            base_traffic = 80
        elif 6 <= hour <= 8 or 18 <= hour <= 22:  # Transition hours
            base_traffic = 40
        else:  # Night hours
            base_traffic = 15
        
        # Add some randomness
        packet_count = base_traffic + random.randint(-20, 20)
        byte_count = packet_count * random.randint(50, 200)
        
        data_points.append({
            "id": i,
            "device_id": 1,
            "protocol": "Modbus",
            "packet_count": max(0, packet_count),
            "byte_count": max(0, byte_count),
            "timestamp": timestamp,
            "hour_bucket": timestamp.replace(minute=0, second=0, microsecond=0)
        })
    
    return data_points


def get_mock_detection_result(analysis_id: str) -> Dict[str, Any]:
    """Get mock detection result."""
    return {
        "id": 1,
        "analysis_id": analysis_id,
        "status": "completed",
        "start_time": datetime.utcnow() - timedelta(hours=1),
        "end_time": datetime.utcnow() - timedelta(minutes=50),
        "time_range": {
            "start": (datetime.utcnow() - timedelta(days=1)).isoformat(),
            "end": datetime.utcnow().isoformat()
        },
        "devices": [1, 2, 3],
        "anomalies": [
            {
                "device_id": 1,
                "timestamp": (datetime.utcnow() - timedelta(hours=3)).isoformat(),
                "anomaly_type": "traffic_spike",
                "score": 0.92,
                "description": "Unusual packet size detected in Modbus traffic"
            },
            {
                "device_id": 2,
                "timestamp": (datetime.utcnow() - timedelta(hours=2)).isoformat(),
                "anomaly_type": "protocol_violation",
                "score": 0.78,
                "description": "Invalid EtherNet/IP command sequence"
            }
        ],
        "summary": f"Analysis completed successfully. Found 2 anomalies across 3 devices."
    }
