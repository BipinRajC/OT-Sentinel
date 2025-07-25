"""
CRUD operations for the ICS Security Monitoring System.
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from . import models, schemas
from .mock_data import (
    get_mock_devices, 
    get_mock_alerts, 
    get_mock_connections,
    get_mock_protocol_stats,
    get_mock_traffic_volume,
    get_mock_detection_result
)

logger = logging.getLogger('crud')

# Device operations
def get_devices(db: Session) -> List[models.Device]:
    """
    Get all devices.
    
    Args:
        db (Session): Database session
        
    Returns:
        List[models.Device]: List of devices
    """
    # Always return mock data for now
    mock_devices = get_mock_devices()
    return [models.Device(**device) for device in mock_devices]

def get_device(db: Session, device_id: int) -> Optional[models.Device]:
    """
    Get device by ID.
    
    Args:
        db (Session): Database session
        device_id (int): Device ID
        
    Returns:
        Optional[models.Device]: Device if found, None otherwise
    """
    return db.query(models.Device).filter(models.Device.id == device_id).first()

def get_device_by_ip(db: Session, ip_address: str) -> Optional[models.Device]:
    """
    Get device by IP address.
    
    Args:
        db (Session): Database session
        ip_address (str): IP address
        
    Returns:
        Optional[models.Device]: Device if found, None otherwise
    """
    return db.query(models.Device).filter(models.Device.ip_address == ip_address).first()

def create_device(db: Session, device: schemas.DeviceCreate) -> models.Device:
    """
    Create a new device.
    
    Args:
        db (Session): Database session
        device (schemas.DeviceCreate): Device data
        
    Returns:
        models.Device: Created device
    """
    db_device = models.Device(**device.dict())
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device

# Alert operations
def get_alerts(db: Session, limit: int = 100, offset: int = 0) -> List[models.Alert]:
    """
    Get alerts.
    
    Args:
        db (Session): Database session
        limit (int): Maximum number of alerts to return
        offset (int): Offset for pagination
        
    Returns:
        List[models.Alert]: List of alerts
    """
    # Always return mock data for now
    mock_alerts = get_mock_alerts()
    return [models.Alert(**alert) for alert in mock_alerts[offset:offset+limit]]

def get_alert(db: Session, alert_id: int) -> Optional[models.Alert]:
    """
    Get alert by ID.
    
    Args:
        db (Session): Database session
        alert_id (int): Alert ID
        
    Returns:
        Optional[models.Alert]: Alert if found, None otherwise
    """
    return db.query(models.Alert).filter(models.Alert.id == alert_id).first()

def create_alert(db: Session, alert: schemas.AlertCreate) -> models.Alert:
    """
    Create a new alert.
    
    Args:
        db (Session): Database session
        alert (schemas.AlertCreate): Alert data
        
    Returns:
        models.Alert: Created alert
    """
    db_alert = models.Alert(**alert.dict())
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert

def get_recent_alerts_for_device(db: Session, device_id: int, hours: int = 24) -> List[models.Alert]:
    """
    Get recent alerts for a specific device.
    
    Args:
        db (Session): Database session
        device_id (int): Device ID
        hours (int): Number of hours to look back
        
    Returns:
        List[models.Alert]: List of recent alerts
    """
    cutoff_time = datetime.utcnow() - timedelta(hours=hours)
    return db.query(models.Alert).filter(
        models.Alert.device_id == device_id,
        models.Alert.timestamp >= cutoff_time
    ).all()

def get_recent_alerts(db: Session, limit: int = 100, hours: int = 24) -> List[models.Alert]:
    """
    Get recent alerts from all devices.
    
    Args:
        db (Session): Database session
        limit (int): Maximum number of alerts to return
        hours (int): Number of hours to look back
        
    Returns:
        List[models.Alert]: List of recent alerts
    """
    # Always return mock data for now
    mock_alerts = get_mock_alerts()
    return [models.Alert(**alert) for alert in mock_alerts[:limit]]

# Connection operations
def get_connections(db: Session) -> List[models.Connection]:
    """
    Get network connections.
    
    Args:
        db (Session): Database session
        
    Returns:
        List[models.Connection]: List of connections
    """
    return db.query(models.Connection).all()

# Traffic data operations
def get_protocol_stats(db: Session) -> Dict[str, int]:
    """
    Get protocol distribution statistics.
    
    Args:
        db (Session): Database session
        
    Returns:
        Dict[str, int]: Protocol stats
    """
    # Stub implementation with fake data
    return {
        "modbus": 450,
        "ethernet_ip": 230,
        "opc-ua": 150,
        "s7comm": 80,
        "bacnet": 40
    }

def get_traffic_volume(db: Session, hours: int = 24) -> List[Dict[str, Any]]:
    """
    Get traffic volume over time.
    
    Args:
        db (Session): Database session
        hours (int): Number of hours to get data for
        
    Returns:
        List[Dict[str, Any]]: Traffic volume data points
    """
    # Stub implementation with fake data
    data_points = []
    
    now = datetime.now()
    for i in range(hours, 0, -1):
        timestamp = now - timedelta(hours=i)
        # Generate some random data
        import random
        data_points.append(models.TrafficData(
            id=i,
            device_id=1,
            protocol="modbus",
            packet_count=random.randint(50, 200),
            byte_count=random.randint(500, 2000),
            timestamp=timestamp
        ))
    
    return data_points

# Detection results operations
def get_detection_result(db: Session, analysis_id: str) -> Optional[models.DetectionResult]:
    """
    Get detection result by ID.
    
    Args:
        db (Session): Database session
        analysis_id (str): Analysis ID
        
    Returns:
        Optional[models.DetectionResult]: Result if found, None otherwise
    """
    # Stub implementation with fake data
    if analysis_id == "test-analysis":
        return models.DetectionResult(
            id=1,
            analysis_id=analysis_id,
            status="completed",
            start_time=datetime.now() - timedelta(hours=1),
            end_time=datetime.now() - timedelta(minutes=50),
            time_range={
                "start": (datetime.now() - timedelta(days=1)).isoformat(),
                "end": datetime.now().isoformat()
            },
            devices=[1, 2],
            anomalies=[
                {
                    "device_id": 1,
                    "timestamp": (datetime.now() - timedelta(hours=3)).isoformat(),
                    "score": 0.92,
                    "description": "Unusual packet size detected"
                }
            ],
            summary="Analysis completed successfully"
        )
    return None