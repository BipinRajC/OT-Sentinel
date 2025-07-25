"""
Real-time monitoring service for ICS Security Monitoring System.
Continuously monitors and updates device status and generates security alerts.
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any
from sqlalchemy.orm import Session

from database import crud, models, schemas
from database.database import get_db, SessionLocal
from services.detection_service import redis_client

logger = logging.getLogger('realtime_service')

class RealTimeMonitor:
    """Real-time monitoring service for devices and alerts."""
    
    def __init__(self):
        self.running = False
        self.db = SessionLocal()
        
        # Device data to monitor
        self.device_data = {
            "id": 1,
            "ip_address": "192.168.95.2",
            "hostname": "plc_2",
            "device_type": "PLC",
            "protocols": [{"id": 1, "name": "Modbus"}],
            "is_online": True,
            "risk_score": 85,
            "last_seen": "2025-06-10T10:30:00Z"
        }
        
        # Security alert template
        self.alert_template = {
            "id": 1,
            "device_id": 1,
            "device_ip": "192.168.95.2",
            "alert_type": "Buffer Overflow Attempt",
            "severity": "critical",
            "description": "Potential exploitation of libmodbus vulnerability",
            "timestamp": "2025-06-10T10:35:00Z",
            "acknowledged": False
        }
        
    async def start_monitoring(self):
        """Start the real-time monitoring process."""
        self.running = True
        logger.info("Starting real-time monitoring service...")
        
        # Initialize device if not exists
        await self.initialize_device()
        
        # Start monitoring tasks
        tasks = [
            self.monitor_device_status(),
            self.generate_security_alerts(),
            self.update_traffic_data(),
            self.monitor_device_health()
        ]
        
        await asyncio.gather(*tasks)
    
    async def stop_monitoring(self):
        """Stop the monitoring service."""
        self.running = False
        logger.info("Stopping real-time monitoring service...")
    
    async def initialize_device(self):
        """Initialize the device in the database if it doesn't exist."""
        try:
            # Check if device exists
            device = crud.get_device_by_ip(self.db, self.device_data["ip_address"])
            
            if not device:
                # Create new device
                device_create = schemas.DeviceCreate(
                    ip_address=self.device_data["ip_address"],
                    hostname=self.device_data["hostname"],
                    device_type=self.device_data["device_type"],
                    protocols=json.dumps(self.device_data["protocols"]),
                    is_online=self.device_data["is_online"],
                    risk_score=self.device_data["risk_score"],
                    last_seen=datetime.fromisoformat(self.device_data["last_seen"].replace('Z', '+00:00'))
                )
                
                device = crud.create_device(self.db, device_create)
                logger.info(f"Created device: {device.ip_address}")
                
                # Broadcast device creation
                await self.broadcast_event({
                    "type": "device_created",
                    "device": {
                        "id": device.id,
                        "ip_address": device.ip_address,
                        "hostname": device.hostname,
                        "device_type": device.device_type,
                        "is_online": device.is_online,
                        "risk_score": device.risk_score,
                        "last_seen": device.last_seen.isoformat()
                    }
                })
            else:
                logger.info(f"Device already exists: {device.ip_address}")
                
        except Exception as e:
            logger.error(f"Error initializing device: {e}")
    
    async def monitor_device_status(self):
        """Monitor device online/offline status."""
        while self.running:
            try:
                device = crud.get_device_by_ip(self.db, self.device_data["ip_address"])
                if device:
                    # Simulate status changes
                    import random
                    
                    # Update last seen
                    device.last_seen = datetime.utcnow()
                    
                    # Occasionally simulate device going offline/online
                    if random.random() < 0.1:  # 10% chance
                        device.is_online = not device.is_online
                        status = "online" if device.is_online else "offline"
                        logger.info(f"Device {device.ip_address} is now {status}")
                        
                        # Broadcast status change
                        await self.broadcast_event({
                            "type": "device_status_changed",
                            "device_id": device.id,
                            "ip_address": device.ip_address,
                            "is_online": device.is_online,
                            "timestamp": datetime.utcnow().isoformat()
                        })
                    
                    self.db.commit()
                
                await asyncio.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                logger.error(f"Error monitoring device status: {e}")
                await asyncio.sleep(30)
    
    async def generate_security_alerts(self):
        """Generate security alerts based on the template."""
        while self.running:
            try:
                # Generate alerts periodically
                import random
                
                if random.random() < 0.3:  # 30% chance every cycle
                    device = crud.get_device_by_ip(self.db, self.device_data["ip_address"])
                    if device:
                        # Create alert
                        alert_types = [
                            "Buffer Overflow Attempt",
                            "Unauthorized Access",
                            "Malicious Traffic",
                            "Protocol Anomaly",
                            "Suspicious Command"
                        ]
                        
                        severities = ["critical", "high", "medium", "low"]
                        
                        alert_create = schemas.AlertCreate(
                            device_id=device.id,
                            alert_type=random.choice(alert_types),
                            severity=random.choice(severities),
                            description=f"Potential security threat detected on {device.hostname}",
                            details=json.dumps({
                                "source_ip": device.ip_address,
                                "detection_method": "signature_based",
                                "confidence": random.uniform(0.7, 1.0)
                            }),
                            timestamp=datetime.utcnow()
                        )
                        
                        alert = crud.create_alert(self.db, alert_create)
                        logger.info(f"Generated alert: {alert.alert_type} for device {device.ip_address}")
                        
                        # Broadcast new alert
                        await self.broadcast_event({
                            "type": "new_alert",
                            "alert": {
                                "id": alert.id,
                                "device_id": alert.device_id,
                                "device_ip": device.ip_address,
                                "alert_type": alert.alert_type,
                                "severity": alert.severity,
                                "description": alert.description,
                                "timestamp": alert.timestamp.isoformat(),
                                "acknowledged": alert.acknowledged
                            }
                        })
                
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                logger.error(f"Error generating security alerts: {e}")
                await asyncio.sleep(60)
    
    async def update_traffic_data(self):
        """Update traffic data for devices."""
        while self.running:
            try:
                device = crud.get_device_by_ip(self.db, self.device_data["ip_address"])
                if device:
                    import random
                    
                    # Generate traffic data
                    protocols = ["Modbus", "HTTP", "TCP", "UDP"]
                    
                    for protocol in protocols:
                        traffic_data = models.TrafficData(
                            device_id=device.id,
                            protocol=protocol,
                            packet_count=random.randint(10, 1000),
                            byte_count=random.randint(1000, 100000),
                            timestamp=datetime.utcnow(),
                            hour_bucket=datetime.utcnow().replace(minute=0, second=0, microsecond=0)
                        )
                        
                        self.db.add(traffic_data)
                    
                    self.db.commit()
                    
                    # Broadcast traffic update
                    await self.broadcast_event({
                        "type": "traffic_update",
                        "device_id": device.id,
                        "timestamp": datetime.utcnow().isoformat()
                    })
                
                await asyncio.sleep(300)  # Update every 5 minutes
                
            except Exception as e:
                logger.error(f"Error updating traffic data: {e}")
                await asyncio.sleep(300)
    
    async def monitor_device_health(self):
        """Monitor device health and risk scores."""
        while self.running:
            try:
                device = crud.get_device_by_ip(self.db, self.device_data["ip_address"])
                if device:
                    import random
                    
                    # Update risk score based on recent alerts
                    recent_alerts = crud.get_recent_alerts_for_device(self.db, device.id, hours=24)
                    
                    # Calculate new risk score
                    base_risk = 50
                    alert_risk = len(recent_alerts) * 10
                    offline_risk = 20 if not device.is_online else 0
                    
                    new_risk_score = min(100, base_risk + alert_risk + offline_risk)
                    
                    if abs(device.risk_score - new_risk_score) > 5:
                        device.risk_score = new_risk_score
                        self.db.commit()
                        
                        # Broadcast risk score update
                        await self.broadcast_event({
                            "type": "risk_score_updated",
                            "device_id": device.id,
                            "ip_address": device.ip_address,
                            "risk_score": device.risk_score,
                            "timestamp": datetime.utcnow().isoformat()
                        })
                        
                        logger.info(f"Updated risk score for {device.ip_address}: {device.risk_score}")
                
                await asyncio.sleep(180)  # Check every 3 minutes
                
            except Exception as e:
                logger.error(f"Error monitoring device health: {e}")
                await asyncio.sleep(180)
    
    async def broadcast_event(self, event: Dict[str, Any]):
        """Broadcast event to all connected clients via Redis pub/sub."""
        try:
            redis_client.publish('ics_events', json.dumps(event))
            logger.debug(f"Broadcasted event: {event['type']}")
        except Exception as e:
            logger.error(f"Error broadcasting event: {e}")

# Global monitor instance
monitor = RealTimeMonitor()

async def start_real_time_monitoring():
    """Start the real-time monitoring service."""
    await monitor.start_monitoring()

async def stop_real_time_monitoring():
    """Stop the real-time monitoring service."""
    await monitor.stop_monitoring()

if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Run the monitoring service
    asyncio.run(start_real_time_monitoring())
