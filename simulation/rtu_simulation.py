#!/usr/bin/env python3
"""
RTU (Remote Terminal Unit) Simulation for ICS Lab Environment.
Simulates field devices and sensors for industrial monitoring.
"""

import logging
import time
import random
import math
import json
from datetime import datetime
import threading

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('rtu_simulation')

class FieldDevice:
    """Base class for field devices."""
    
    def __init__(self, device_id: str, device_type: str, location: str):
        self.device_id = device_id
        self.device_type = device_type
        self.location = location
        self.status = "online"
        self.last_update = datetime.utcnow()
        self.battery_level = 100.0
        self.signal_strength = random.uniform(80, 100)
        
    def update(self):
        """Update device status and readings."""
        self.last_update = datetime.utcnow()
        
        # Simulate occasional communication issues
        if random.random() < 0.001:  # 0.1% chance
            self.status = "offline"
        else:
            self.status = "online"
            
        # Battery drain simulation
        if self.battery_level > 0:
            self.battery_level -= random.uniform(0.001, 0.01)
        
        # Signal strength fluctuation
        self.signal_strength += random.uniform(-2, 2)
        self.signal_strength = max(0, min(100, self.signal_strength))


class TemperatureSensor(FieldDevice):
    """Temperature sensor simulation."""
    
    def __init__(self, device_id: str, location: str, base_temp: float = 25.0):
        super().__init__(device_id, "Temperature Sensor", location)
        self.base_temp = base_temp
        self.temperature = base_temp
        self.alarm_high = base_temp + 20
        self.alarm_low = base_temp - 10
        
    def read_temperature(self) -> dict:
        """Read current temperature with noise and drift."""
        time_factor = time.time() % 3600  # Hour cycle
        
        # Daily temperature variation
        daily_variation = 5 * math.sin(2 * math.pi * time_factor / 3600)
        
        # Add noise
        noise = random.uniform(-1, 1)
        
        # Occasional temperature spikes (process events)
        if random.random() < 0.01:  # 1% chance
            noise += random.uniform(5, 15)
            
        self.temperature = self.base_temp + daily_variation + noise
        
        return {
            "device_id": self.device_id,
            "type": "temperature",
            "value": round(self.temperature, 2),
            "unit": "°C",
            "timestamp": self.last_update.isoformat(),
            "status": self.status,
            "alarm": self.temperature > self.alarm_high or self.temperature < self.alarm_low,
            "location": self.location,
            "battery": round(self.battery_level, 1),
            "signal_strength": round(self.signal_strength, 1)
        }


class PressureSensor(FieldDevice):
    """Pressure sensor simulation."""
    
    def __init__(self, device_id: str, location: str, base_pressure: float = 150.0):
        super().__init__(device_id, "Pressure Sensor", location)
        self.base_pressure = base_pressure
        self.pressure = base_pressure
        self.alarm_high = base_pressure + 50
        self.alarm_low = base_pressure - 30
        
    def read_pressure(self) -> dict:
        """Read current pressure with realistic variations."""
        time_factor = time.time() % 1800  # 30-minute cycle
        
        # Process variation
        process_variation = 10 * math.sin(2 * math.pi * time_factor / 1800)
        
        # Add noise
        noise = random.uniform(-2, 2)
        
        # Occasional pressure surges
        if random.random() < 0.005:  # 0.5% chance
            noise += random.uniform(10, 25)
            
        self.pressure = max(0, self.base_pressure + process_variation + noise)
        
        return {
            "device_id": self.device_id,
            "type": "pressure",
            "value": round(self.pressure, 2),
            "unit": "kPa",
            "timestamp": self.last_update.isoformat(),
            "status": self.status,
            "alarm": self.pressure > self.alarm_high or self.pressure < self.alarm_low,
            "location": self.location,
            "battery": round(self.battery_level, 1),
            "signal_strength": round(self.signal_strength, 1)
        }


class FlowSensor(FieldDevice):
    """Flow sensor simulation."""
    
    def __init__(self, device_id: str, location: str, base_flow: float = 25.0):
        super().__init__(device_id, "Flow Sensor", location)
        self.base_flow = base_flow
        self.flow = base_flow
        self.alarm_high = base_flow + 15
        self.alarm_low = base_flow - 20
        
    def read_flow(self) -> dict:
        """Read current flow rate."""
        time_factor = time.time() % 900  # 15-minute cycle
        
        # Process variation
        process_variation = 5 * math.sin(2 * math.pi * time_factor / 900)
        
        # Add noise
        noise = random.uniform(-1, 1)
        
        # Occasional flow disruptions
        if random.random() < 0.002:  # 0.2% chance
            noise -= random.uniform(5, 15)  # Flow reduction
            
        self.flow = max(0, self.base_flow + process_variation + noise)
        
        return {
            "device_id": self.device_id,
            "type": "flow",
            "value": round(self.flow, 2),
            "unit": "kMol/h",
            "timestamp": self.last_update.isoformat(),
            "status": self.status,
            "alarm": self.flow > self.alarm_high or self.flow < self.alarm_low,
            "location": self.location,
            "battery": round(self.battery_level, 1),
            "signal_strength": round(self.signal_strength, 1)
        }


class LevelSensor(FieldDevice):
    """Level sensor simulation."""
    
    def __init__(self, device_id: str, location: str, base_level: float = 50.0):
        super().__init__(device_id, "Level Sensor", location)
        self.base_level = base_level
        self.level = base_level
        self.alarm_high = 85.0
        self.alarm_low = 15.0
        
    def read_level(self) -> dict:
        """Read current level percentage."""
        time_factor = time.time() % 2700  # 45-minute cycle
        
        # Process variation
        process_variation = 20 * math.sin(2 * math.pi * time_factor / 2700)
        
        # Add noise
        noise = random.uniform(-2, 2)
        
        self.level = max(0, min(100, self.base_level + process_variation + noise))
        
        return {
            "device_id": self.device_id,
            "type": "level",
            "value": round(self.level, 2),
            "unit": "%",
            "timestamp": self.last_update.isoformat(),
            "status": self.status,
            "alarm": self.level > self.alarm_high or self.level < self.alarm_low,
            "location": self.location,
            "battery": round(self.battery_level, 1),
            "signal_strength": round(self.signal_strength, 1)
        }


class RTUSimulation:
    """Main RTU simulation coordinator."""
    
    def __init__(self):
        self.devices = []
        self.running = False
        self.data_log = []
        self.setup_devices()
        
    def setup_devices(self):
        """Initialize field devices."""
        # Temperature sensors
        self.devices.extend([
            TemperatureSensor("TEMP_001", "Reactor Vessel", 65.0),
            TemperatureSensor("TEMP_002", "Separator", 45.0),
            TemperatureSensor("TEMP_003", "Feed Tank", 25.0),
            TemperatureSensor("TEMP_004", "Product Line", 35.0),
        ])
        
        # Pressure sensors
        self.devices.extend([
            PressureSensor("PRES_001", "Reactor Inlet", 160.0),
            PressureSensor("PRES_002", "Reactor Outlet", 150.0),
            PressureSensor("PRES_003", "Separator", 140.0),
            PressureSensor("PRES_004", "Feed Line", 170.0),
        ])
        
        # Flow sensors
        self.devices.extend([
            FlowSensor("FLOW_001", "Feed A Line", 25.0),
            FlowSensor("FLOW_002", "Feed B Line", 22.0),
            FlowSensor("FLOW_003", "Product Line", 40.0),
            FlowSensor("FLOW_004", "Purge Line", 3.0),
        ])
        
        # Level sensors
        self.devices.extend([
            LevelSensor("LEVEL_001", "Reactor Vessel", 55.0),
            LevelSensor("LEVEL_002", "Separator", 45.0),
            LevelSensor("LEVEL_003", "Feed Tank A", 70.0),
            LevelSensor("LEVEL_004", "Feed Tank B", 65.0),
        ])
        
        logger.info(f"Initialized {len(self.devices)} field devices")
    
    def collect_data(self) -> list:
        """Collect data from all devices."""
        readings = []
        
        for device in self.devices:
            device.update()
            
            if isinstance(device, TemperatureSensor):
                readings.append(device.read_temperature())
            elif isinstance(device, PressureSensor):
                readings.append(device.read_pressure())
            elif isinstance(device, FlowSensor):
                readings.append(device.read_flow())
            elif isinstance(device, LevelSensor):
                readings.append(device.read_level())
                
        return readings
    
    def get_system_status(self) -> dict:
        """Get overall system status."""
        online_devices = sum(1 for device in self.devices if device.status == "online")
        total_devices = len(self.devices)
        
        avg_battery = sum(device.battery_level for device in self.devices) / total_devices
        avg_signal = sum(device.signal_strength for device in self.devices) / total_devices
        
        # Count alarms
        latest_readings = self.collect_data()
        active_alarms = sum(1 for reading in latest_readings if reading.get("alarm", False))
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "total_devices": total_devices,
            "online_devices": online_devices,
            "offline_devices": total_devices - online_devices,
            "system_health": round((online_devices / total_devices) * 100, 1),
            "avg_battery_level": round(avg_battery, 1),
            "avg_signal_strength": round(avg_signal, 1),
            "active_alarms": active_alarms,
            "data_collection_rate": "1 Hz"
        }
    
    def run_simulation(self):
        """Main simulation loop."""
        logger.info("Starting RTU field device simulation")
        self.running = True
        
        while self.running:
            try:
                # Collect data from all devices
                readings = self.collect_data()
                
                # Log system status periodically
                if len(self.data_log) % 60 == 0:  # Every minute
                    status = self.get_system_status()
                    logger.info(f"System Status: {status['online_devices']}/{status['total_devices']} devices online, "
                              f"{status['active_alarms']} alarms active")
                
                # Store readings
                self.data_log.append({
                    "timestamp": datetime.utcnow().isoformat(),
                    "readings": readings
                })
                
                # Keep only last 1000 readings
                if len(self.data_log) > 1000:
                    self.data_log = self.data_log[-1000:]
                
                time.sleep(1)  # 1 Hz data collection
                
            except KeyboardInterrupt:
                logger.info("Simulation interrupted by user")
                break
            except Exception as e:
                logger.error(f"Error in simulation loop: {e}")
                time.sleep(5)
        
        self.running = False
        logger.info("RTU simulation stopped")
    
    def stop_simulation(self):
        """Stop the simulation."""
        self.running = False


def main():
    """Main function to start RTU simulation."""
    logger.info("Initializing RTU Field Device Simulation")
    
    rtu_sim = RTUSimulation()
    
    try:
        rtu_sim.run_simulation()
    except KeyboardInterrupt:
        logger.info("Shutting down RTU simulation...")
        rtu_sim.stop_simulation()
    except Exception as e:
        logger.error(f"RTU simulation error: {e}")
        rtu_sim.stop_simulation()


if __name__ == "__main__":
    main() 