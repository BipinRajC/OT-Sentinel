"""
Database models for the ICS Security Monitoring System.
"""

import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship

from .database import Base

class Device(Base):
    """Model for ICS devices discovered on the network."""
    
    __tablename__ = "devices"
    
    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String(50), unique=True, index=True)
    mac_address = Column(String(50), nullable=True)
    hostname = Column(String(100), nullable=True)
    device_type = Column(String(50), nullable=True)  # plc, hmi, workstation, etc.
    vendor = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    firmware = Column(String(100), nullable=True)
    protocols = Column(JSON, nullable=True)  # List of supported protocols
    is_online = Column(Boolean, default=True)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)
    first_discovered = Column(DateTime, default=datetime.datetime.utcnow)
    risk_score = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    
    # Relationships
    alerts = relationship("Alert", back_populates="device")
    traffic_data = relationship("TrafficData", back_populates="device")
    
    def __repr__(self):
        return f"<Device(ip={self.ip_address}, type={self.device_type})>"

class Connection(Base):
    """Model for network connections between devices."""
    
    __tablename__ = "connections"
    
    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("devices.id"), index=True)
    target_id = Column(Integer, ForeignKey("devices.id"), index=True)
    protocol = Column(String(50), nullable=True)
    port = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    traffic_volume = Column(Integer, default=0)  # Packets per minute
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)
    first_discovered = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    source = relationship("Device", foreign_keys=[source_id])
    target = relationship("Device", foreign_keys=[target_id])
    
    def __repr__(self):
        return f"<Connection(source={self.source_id}, target={self.target_id}, protocol={self.protocol})>"

class Alert(Base):
    """Model for security alerts."""
    
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True, index=True)
    alert_type = Column(String(50), index=True)  # anomaly, attack, policy_violation
    severity = Column(String(20), index=True)  # critical, high, medium, low, info
    description = Column(Text)
    details = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    acknowledged = Column(Boolean, default=False)
    acknowledged_by = Column(String(100), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    
    # Relationships
    device = relationship("Device", back_populates="alerts")
    
    def __repr__(self):
        return f"<Alert(type={self.alert_type}, severity={self.severity}, device_id={self.device_id})>"

class TrafficData(Base):
    """Model for network traffic data."""
    
    __tablename__ = "traffic_data"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), index=True)
    protocol = Column(String(50), index=True)
    source_port = Column(Integer, nullable=True)
    destination_port = Column(Integer, nullable=True)
    packet_count = Column(Integer, default=0)
    byte_count = Column(Integer, default=0)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    hour_bucket = Column(DateTime, index=True)  # For aggregating by hour
    
    # Relationships
    device = relationship("Device", back_populates="traffic_data")
    
    def __repr__(self):
        return f"<TrafficData(device_id={self.device_id}, protocol={self.protocol}, timestamp={self.timestamp})>"

class DetectionResult(Base):
    """Model for anomaly detection results."""
    
    __tablename__ = "detection_results"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(String(50), unique=True, index=True)
    status = Column(String(20), default="running")  # running, completed, failed
    start_time = Column(DateTime, default=datetime.datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    time_range = Column(JSON, nullable=True)  # Start and end time of analyzed data
    devices = Column(JSON, nullable=True)  # List of analyzed device IDs
    anomalies = Column(JSON, nullable=True)  # Detected anomalies
    summary = Column(Text, nullable=True)
    
    def __repr__(self):
        return f"<DetectionResult(analysis_id={self.analysis_id}, status={self.status})>"

class ScanResult(Base):
    """Model for network scan results."""
    
    __tablename__ = "scan_results"
    
    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(String(50), unique=True, index=True)
    network_range = Column(String(50))
    scan_type = Column(String(20))  # basic, full, stealth
    status = Column(String(20), default="running")  # running, completed, failed
    start_time = Column(DateTime, default=datetime.datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    devices_found = Column(Integer, default=0)
    devices = Column(JSON, nullable=True)  # Raw scan results
    error = Column(Text, nullable=True)
    
    def __repr__(self):
        return f"<ScanResult(scan_id={self.scan_id}, status={self.status})>" 