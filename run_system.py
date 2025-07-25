#!/usr/bin/env python3
"""
Simple launcher for the ICS Security Monitoring System.
This script starts the backend server with real-time monitoring capabilities.
"""

import asyncio
import json
import logging
import multiprocessing
import os
import signal
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Any
import uvicorn
import threading
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('ics_system')

# Mock device and alert data
MOCK_DEVICE = {
    "id": 1,
    "ip_address": "192.168.95.2",
    "hostname": "plc_2",
    "device_type": "PLC",
    "protocols": [{"id": 1, "name": "Modbus"}],
    "is_online": True,
    "risk_score": 85,
    "last_seen": datetime.utcnow().isoformat()
}

MOCK_ALERTS = [
    {
        "id": 1,
        "device_id": 1,
        "device_ip": "192.168.95.2",
        "alert_type": "Buffer Overflow Attempt",
        "severity": "critical",
        "description": "Potential exploitation of libmodbus vulnerability",
        "timestamp": datetime.utcnow().isoformat(),
        "acknowledged": False
    }
]

class MockRealTimeService:
    """Mock real-time service for demonstration."""
    
    def __init__(self):
        self.running = False
        self.devices = [MOCK_DEVICE.copy()]
        self.alerts = MOCK_ALERTS.copy()
        
    def start(self):
        """Start the mock service."""
        self.running = True
        logger.info("Mock real-time service started")
        
        # Start background thread for generating events
        threading.Thread(target=self._generate_events, daemon=True).start()
    
    def stop(self):
        """Stop the mock service."""
        self.running = False
        logger.info("Mock real-time service stopped")
    
    def _generate_events(self):
        """Generate mock events periodically."""
        import random
        
        while self.running:
            try:
                # Generate random events every 30-60 seconds
                time.sleep(random.randint(30, 60))
                
                if not self.running:
                    break
                
                # Randomly generate different types of events
                event_type = random.choice([
                    'device_status_change',
                    'new_alert',
                    'risk_score_update'
                ])
                
                if event_type == 'device_status_change':
                    self._generate_device_status_change()
                elif event_type == 'new_alert':
                    self._generate_new_alert()
                elif event_type == 'risk_score_update':
                    self._generate_risk_score_update()
                    
            except Exception as e:
                logger.error(f"Error generating events: {e}")
                time.sleep(10)
    
    def _generate_device_status_change(self):
        """Generate a device status change event."""
        device = self.devices[0]
        device['is_online'] = not device['is_online']
        device['last_seen'] = datetime.utcnow().isoformat()
        
        status = "online" if device['is_online'] else "offline"
        logger.info(f"Device {device['ip_address']} is now {status}")
        
        # In a real implementation, this would be published to Redis
        # and picked up by WebSocket connections
    
    def _generate_new_alert(self):
        """Generate a new security alert."""
        import random
        
        alert_types = [
            "Buffer Overflow Attempt",
            "Unauthorized Access",
            "Malicious Traffic",
            "Protocol Anomaly",
            "Suspicious Command"
        ]
        
        severities = ["critical", "high", "medium", "low"]
        
        new_alert = {
            "id": len(self.alerts) + 1,
            "device_id": 1,
            "device_ip": "192.168.95.2",
            "alert_type": random.choice(alert_types),
            "severity": random.choice(severities),
            "description": f"Security threat detected on PLC_2",
            "timestamp": datetime.utcnow().isoformat(),
            "acknowledged": False
        }
        
        self.alerts.insert(0, new_alert)
        logger.warning(f"New {new_alert['severity']} alert: {new_alert['alert_type']}")
    
    def _generate_risk_score_update(self):
        """Update device risk score."""
        import random
        
        device = self.devices[0]
        old_score = device['risk_score']
        device['risk_score'] = max(0, min(100, old_score + random.randint(-10, 15)))
        
        if abs(device['risk_score'] - old_score) > 5:
            logger.info(f"Device {device['ip_address']} risk score updated: {old_score} -> {device['risk_score']}")

def run_backend_server():
    """Run the FastAPI backend server."""
    try:
        # Change to the backend directory
        backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
        if os.path.exists(backend_dir):
            os.chdir(backend_dir)
        
        # Start the server
        uvicorn.run(
            "api.main:app",
            host="0.0.0.0",
            port=8000,
            reload=False,
            log_level="info"
        )
    except Exception as e:
        logger.error(f"Error starting backend server: {e}")

def main():
    """Main function to start the system."""
    logger.info("Starting ICS Security Monitoring System...")
    
    # Initialize mock service
    mock_service = MockRealTimeService()
    
    # Handle shutdown signals
    def signal_handler(signum, frame):
        logger.info(f"Received signal {signum}, shutting down...")
        mock_service.stop()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        # Start mock real-time service
        mock_service.start()
        
        # Start backend server
        logger.info("Starting backend server on http://localhost:8000")
        logger.info("API Documentation: http://localhost:8000/docs")
        logger.info("Press Ctrl+C to stop the system")
        
        # For this demo, we'll run the server in the main thread
        run_backend_server()
        
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
        mock_service.stop()
    except Exception as e:
        logger.error(f"Error in main process: {e}")
        mock_service.stop()

if __name__ == "__main__":
    # Add the project root to Python path
    project_root = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, project_root)
    
    main()
