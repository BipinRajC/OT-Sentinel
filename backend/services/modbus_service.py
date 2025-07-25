#!/usr/bin/env python3
"""
Modbus Data Service for ICS Security Monitoring System.
Handles real-time data fetching from Modbus devices.
"""

import asyncio
import json
import logging
import os
import random
from datetime import datetime
from typing import Dict, List, Any, Optional
import redis

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('modbus_service')

# Global instance
_modbus_service_instance = None

class ModbusDataService:
    """Service for fetching and managing Modbus data."""
    
    def __init__(self, host: str = None, port: int = None, unit_id: int = None):
        """Initialize Modbus service."""
        self.host = host or os.getenv('MODBUS_HOST', 'ics-lab')
        self.port = int(port or os.getenv('MODBUS_PORT', 502))
        self.unit_id = int(unit_id or os.getenv('MODBUS_UNIT_ID', 1))
        self.timeout = int(os.getenv('MODBUS_TIMEOUT', 5))
        self.poll_interval = float(os.getenv('MODBUS_POLL_INTERVAL', 1.0))
        
        self.is_connected = False
        self.running = False
        self.last_data = {}
        
        # Redis for real-time updates
        self.redis_client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            db=int(os.getenv('REDIS_DB', 0)),
            decode_responses=True
        )
        
        # Define register mappings for industrial processes
        self.register_mappings = {
            # Valve positions (0-100%)
            1000: {'name': 'AValve_Position', 'type': 'holding', 'scale': 1.0, 'unit': '%'},
            1001: {'name': 'BValve_Position', 'type': 'holding', 'scale': 1.0, 'unit': '%'},
            1002: {'name': 'ProductValve_Position', 'type': 'holding', 'scale': 1.0, 'unit': '%'},
            1003: {'name': 'PurgeValve_Position', 'type': 'holding', 'scale': 1.0, 'unit': '%'},
            
            # Flow rates (kMol/h)
            1010: {'name': 'AFlow_Rate', 'type': 'holding', 'scale': 0.1, 'unit': 'kMol/h'},
            1011: {'name': 'BFlow_Rate', 'type': 'holding', 'scale': 0.1, 'unit': 'kMol/h'},
            1012: {'name': 'ProductFlow_Rate', 'type': 'holding', 'scale': 0.1, 'unit': 'kMol/h'},
            1013: {'name': 'PurgeFlow_Rate', 'type': 'holding', 'scale': 0.1, 'unit': 'kMol/h'},
            
            # Pressure readings (kPa)
            1020: {'name': 'Reactor_Pressure', 'type': 'holding', 'scale': 1.0, 'unit': 'kPa'},
            1021: {'name': 'Separator_Pressure', 'type': 'holding', 'scale': 1.0, 'unit': 'kPa'},
            1022: {'name': 'Feed_Pressure', 'type': 'holding', 'scale': 1.0, 'unit': 'kPa'},
            
            # Level measurements (%)
            1030: {'name': 'Reactor_Level', 'type': 'holding', 'scale': 1.0, 'unit': '%'},
            1031: {'name': 'Separator_Level', 'type': 'holding', 'scale': 1.0, 'unit': '%'},
            1032: {'name': 'Feed_Tank_Level', 'type': 'holding', 'scale': 1.0, 'unit': '%'},
            
            # Component compositions (%)
            1040: {'name': 'AComp_Reactor', 'type': 'holding', 'scale': 0.1, 'unit': '%'},
            1041: {'name': 'BComp_Reactor', 'type': 'holding', 'scale': 0.1, 'unit': '%'},
            1042: {'name': 'CComp_Reactor', 'type': 'holding', 'scale': 0.1, 'unit': '%'},
            1043: {'name': 'AComp_Product', 'type': 'holding', 'scale': 0.1, 'unit': '%'},
            1044: {'name': 'BComp_Product', 'type': 'holding', 'scale': 0.1, 'unit': '%'},
            1045: {'name': 'CComp_Product', 'type': 'holding', 'scale': 0.1, 'unit': '%'},
            
            # System status (boolean)
            2000: {'name': 'System_Run', 'type': 'coil', 'scale': 1.0, 'unit': 'bool'},
            2001: {'name': 'Emergency_Stop', 'type': 'coil', 'scale': 1.0, 'unit': 'bool'},
            2002: {'name': 'Auto_Mode', 'type': 'coil', 'scale': 1.0, 'unit': 'bool'},
            2003: {'name': 'Maintenance_Mode', 'type': 'coil', 'scale': 1.0, 'unit': 'bool'},
            
            # Alarms (boolean)
            2010: {'name': 'High_Pressure_Alarm', 'type': 'coil', 'scale': 1.0, 'unit': 'bool'},
            2011: {'name': 'High_Temperature_Alarm', 'type': 'coil', 'scale': 1.0, 'unit': 'bool'},
            2012: {'name': 'Low_Level_Alarm', 'type': 'coil', 'scale': 1.0, 'unit': 'bool'},
            2013: {'name': 'Communication_Alarm', 'type': 'coil', 'scale': 1.0, 'unit': 'bool'},
        }
    
    async def connect(self) -> bool:
        """Connect to Modbus device (mock implementation)."""
        self.is_connected = True
        logger.info(f"Connected to Modbus device at {self.host}:{self.port}")
        
        # Publish connection status
        await self._publish_event({
            'type': 'modbus_connected',
            'host': self.host,
            'port': self.port,
            'timestamp': datetime.utcnow().isoformat()
        })
        
        return True
    
    async def disconnect(self):
        """Disconnect from Modbus device."""
        self.is_connected = False
        logger.info(f"Disconnected from Modbus device at {self.host}:{self.port}")
        
        # Publish disconnection status
        await self._publish_event({
            'type': 'modbus_disconnected',
            'host': self.host,
            'port': self.port,
            'timestamp': datetime.utcnow().isoformat()
        })
    
    async def read_holding_registers(self, address: int, count: int = 1) -> Optional[List[int]]:
        """Read holding registers from Modbus device (mock implementation)."""
        # Generate random register values
        registers = [random.randint(0, 100) for _ in range(count)]
        return registers
    
    async def read_coils(self, address: int, count: int = 1) -> Optional[List[bool]]:
        """Read coils from Modbus device (mock implementation)."""
        # Generate random coil values
        coils = [bool(random.randint(0, 1)) for _ in range(count)]
        return coils
    
    async def read_all_registers(self) -> Dict[str, Any]:
        """Read all configured registers and return processed data."""
        data = {}
        timestamp = datetime.utcnow().isoformat()
        
        # Group registers by type for efficient reading
        holding_registers = []
        coil_registers = []
        
        for address, config in self.register_mappings.items():
            if config['type'] == 'holding':
                holding_registers.append((address, config))
            elif config['type'] == 'coil':
                coil_registers.append((address, config))
        
        # Read holding registers
        for address, config in holding_registers:
            values = await self.read_holding_registers(address, 1)
            if values is not None:
                raw_value = values[0]
                scaled_value = raw_value * config['scale']
                
                data[config['name']] = {
                    'value': scaled_value,
                    'raw_value': raw_value,
                    'unit': config['unit'],
                    'address': address,
                    'timestamp': timestamp,
                    'type': 'holding_register'
                }
        
        # Read coils
        for address, config in coil_registers:
            values = await self.read_coils(address, 1)
            if values is not None:
                value = bool(values[0])
                
                data[config['name']] = {
                    'value': value,
                    'raw_value': values[0],
                    'unit': config['unit'],
                    'address': address,
                    'timestamp': timestamp,
                    'type': 'coil'
                }
        
        return data
    
    async def start_polling(self):
        """Start continuous polling of Modbus device."""
        self.running = True
        logger.info(f"Starting Modbus polling every {self.poll_interval} seconds...")
        
        # Connect first
        if not self.is_connected:
            await self.connect()
            
        try:
            while self.running:
                try:
                    # Read data
                    data = await self.read_all_registers()
                    
                    if data:
                        # Store latest data
                        self.last_data = data
                        
                        # Publish data update
                        await self._publish_event({
                            'type': 'modbus_data_update',
                            'host': self.host,
                            'port': self.port,
                            'data': data,
                            'timestamp': datetime.utcnow().isoformat()
                        })
                        
                        # Store in Redis for caching
                        await self._store_data_cache(data)
                        
                        logger.debug(f"Successfully read {len(data)} registers from Modbus device")
                    else:
                        logger.warning("No data received from Modbus device")
                    
                    # Add a short sleep to prevent CPU hogging
                    await asyncio.sleep(self.poll_interval)
                    
                except Exception as e:
                    logger.error(f"Error in Modbus polling loop: {e}")
                    # Continue running even after errors
                    await asyncio.sleep(self.poll_interval)
                    
        except asyncio.CancelledError:
            logger.info("Modbus polling cancelled")
            # We'll ignore cancellation and keep running
            pass
        except Exception as e:
            logger.error(f"Fatal error in Modbus polling: {e}")
        
        logger.info("Modbus polling stopped")
    
    async def stop_polling(self):
        """Stop continuous polling."""
        self.running = False
        await self.disconnect()
    
    async def get_cached_data(self) -> Dict[str, Any]:
        """Get the latest cached data."""
        try:
            cached_data = self.redis_client.get('modbus_latest_data')
            if cached_data:
                return json.loads(cached_data)
            else:
                return self.last_data
        except Exception as e:
            logger.error(f"Error getting cached data: {e}")
            return self.last_data
    
    async def _publish_event(self, event: Dict[str, Any]):
        """Publish event to Redis for WebSocket broadcasting."""
        try:
            self.redis_client.publish('modbus_events', json.dumps(event))
        except Exception as e:
            logger.error(f"Error publishing event: {e}")
    
    async def _store_data_cache(self, data: Dict[str, Any]):
        """Store data in Redis cache."""
        try:
            # Store latest data
            self.redis_client.set('modbus_latest_data', json.dumps(data), ex=300)  # 5 minutes expiry
            
            # Store historical data (keep last 1000 readings)
            timestamp = datetime.utcnow().isoformat()
            historical_data = {
                'timestamp': timestamp,
                'data': data
            }
            
            self.redis_client.lpush('modbus_historical_data', json.dumps(historical_data))
            self.redis_client.ltrim('modbus_historical_data', 0, 999)  # Keep only last 1000
            
        except Exception as e:
            logger.error(f"Error storing data cache: {e}")
    
    def get_device_info(self) -> Dict[str, Any]:
        """Get information about the connected Modbus device."""
        return {
            'host': self.host,
            'port': self.port,
            'unit_id': self.unit_id,
            'is_connected': self.is_connected,
            'is_polling': self.running,
            'poll_interval': self.poll_interval,
            'register_count': len(self.register_mappings),
            'last_updated': datetime.utcnow().isoformat()
        }

# Service management functions
async def start_modbus_service():
    """Start the Modbus service."""
    modbus_service = get_modbus_service()
    asyncio.create_task(modbus_service.start_polling())

async def stop_modbus_service():
    """Stop the Modbus service."""
    modbus_service = get_modbus_service()
    await modbus_service.stop_polling()

def get_modbus_service() -> ModbusDataService:
    """Get or create the Modbus service singleton."""
    global _modbus_service_instance
    if _modbus_service_instance is None:
        _modbus_service_instance = ModbusDataService()
    return _modbus_service_instance 