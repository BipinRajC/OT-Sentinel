"""
Pydantic schemas for API validation in the ICS Security Monitoring System.
"""

from typing import List, Dict, Any, Optional, Union
from datetime import datetime
from pydantic import BaseModel, Field, validator
import uuid

# Helper function to generate random IDs
def generate_id():
    """Generate a random UUID."""
    return str(uuid.uuid4())

# Base schemas
class DeviceBase(BaseModel):
    """Base schema for Device."""
    ip_address: str
    mac_address: Optional[str] = None
    hostname: Optional[str] = None
    device_type: Optional[str] = None
    vendor: Optional[str] = None
    model: Optional[str] = None
    firmware: Optional[str] = None
    protocols: Optional[List[Dict[str, Any]]] = None
    is_online: bool = True
    risk_score: float = 0.0
    notes: Optional[str] = None

class ConnectionBase(BaseModel):
    """Base schema for Connection."""
    source_id: int
    target_id: int
    protocol: Optional[str] = None
    port: Optional[int] = None
    is_active: bool = True
    traffic_volume: int = 0

class AlertBase(BaseModel):
    """Base schema for Alert."""
    device_id: Optional[int] = None
    alert_type: str
    severity: str
    description: str
    details: Optional[Dict[str, Any]] = None

class TrafficPointBase(BaseModel):
    """Base schema for traffic data point."""
    timestamp: datetime
    packet_count: int
    byte_count: int
    protocol: str

class DetectionResultBase(BaseModel):
    """Base schema for detection result."""
    analysis_id: str = Field(default_factory=generate_id)
    time_range: Optional[Dict[str, str]] = None
    devices: Optional[List[int]] = None

class ScanRequestBase(BaseModel):
    """Base schema for scan request."""
    scan_id: str = Field(default_factory=generate_id)
    network_range: str
    scan_type: str = "basic"

# Create schemas (used for creating new entries)
class DeviceCreate(DeviceBase):
    """Schema for creating a Device."""
    pass

class ConnectionCreate(ConnectionBase):
    """Schema for creating a Connection."""
    pass

class AlertCreate(AlertBase):
    """Schema for creating an Alert."""
    pass

class TrafficPointCreate(TrafficPointBase):
    """Schema for creating a traffic data point."""
    device_id: int

class DetectionResultCreate(DetectionResultBase):
    """Schema for creating a detection result."""
    pass

class ScanRequestCreate(ScanRequestBase):
    """Schema for creating a scan request."""
    pass

# Update schemas (used for updating existing entries)
class DeviceUpdate(BaseModel):
    """Schema for updating a Device."""
    mac_address: Optional[str] = None
    hostname: Optional[str] = None
    device_type: Optional[str] = None
    vendor: Optional[str] = None
    model: Optional[str] = None
    firmware: Optional[str] = None
    protocols: Optional[List[Dict[str, Any]]] = None
    is_online: Optional[bool] = None
    risk_score: Optional[float] = None
    notes: Optional[str] = None

class AlertUpdate(BaseModel):
    """Schema for updating an Alert."""
    acknowledged: Optional[bool] = None
    acknowledged_by: Optional[str] = None
    resolved: Optional[bool] = None

# Response schemas (used for returning data from API)
class Device(DeviceBase):
    """Schema for returning a Device."""
    id: int
    last_seen: datetime
    first_discovered: datetime
    
    class Config:
        orm_mode = True

class Connection(ConnectionBase):
    """Schema for returning a Connection."""
    id: int
    last_seen: datetime
    first_discovered: datetime
    
    class Config:
        orm_mode = True

class Alert(AlertBase):
    """Schema for returning an Alert."""
    id: int
    timestamp: datetime
    acknowledged: bool
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved: bool
    resolved_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True

class TrafficPoint(TrafficPointBase):
    """Schema for returning a traffic data point."""
    device_id: int
    
    class Config:
        orm_mode = True

class NetworkMap(BaseModel):
    """Schema for returning a network map."""
    devices: List[Device]
    connections: List[Connection]

# Analysis request
class AnalysisRequest(BaseModel):
    """Schema for requesting traffic analysis."""
    analysis_id: str = Field(default_factory=generate_id)
    time_range: Dict[str, str]  # Start and end time
    devices: Optional[List[int]] = None  # Device IDs to analyze, None for all

# Detection result
class DetectionResult(BaseModel):
    """Schema for returning detection results."""
    analysis_id: str
    status: str
    start_time: datetime
    end_time: Optional[datetime] = None
    time_range: Optional[Dict[str, str]] = None
    devices: Optional[List[int]] = None
    anomalies: Optional[List[Dict[str, Any]]] = None
    summary: Optional[str] = None
    message: Optional[str] = None
    
    class Config:
        orm_mode = True

# Scan request and response
class ScanRequest(ScanRequestBase):
    """Schema for requesting a network scan."""
    pass

class ScanResponse(BaseModel):
    """Schema for responding to a scan request."""
    scan_id: str
    status: str
    message: str
    
    class Config:
        orm_mode = True 