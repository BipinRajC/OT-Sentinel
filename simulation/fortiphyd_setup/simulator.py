#!/usr/bin/env python3
"""
Basic MODBUS Simulator for ICS Security Monitoring System.
"""

import os
import sys
import yaml
import logging
import time
from pymodbus.server import StartTcpServer
from pymodbus.datastore import ModbusSequentialDataBlock
from pymodbus.datastore import ModbusSlaveContext, ModbusServerContext

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('modbus_simulator')

class ModbusSimulator:
    """Simple MODBUS TCP simulator."""
    
    def __init__(self, config_file=None):
        """Initialize the MODBUS simulator."""
        self.config_file = config_file or 'config/water_treatment.yaml'
        self.store = None
        self.context = None
        self.running = False
        
    def load_config(self):
        """Load the simulation configuration from YAML file."""
        try:
            config_path = os.path.join(os.path.dirname(__file__), '..', self.config_file)
            with open(config_path, 'r') as f:
                return yaml.safe_load(f)
        except Exception as e:
            logger.error(f"Failed to load configuration: {e}")
            return None
    
    def setup_datastore(self):
        """Set up the MODBUS datastore."""
        try:
            # Initialize data blocks
            hr = ModbusSequentialDataBlock(0, [0] * 10000)  # Holding registers
            ir = ModbusSequentialDataBlock(0, [0] * 10000)  # Input registers
            co = ModbusSequentialDataBlock(0, [0] * 10000)  # Coils
            di = ModbusSequentialDataBlock(0, [0] * 10000)  # Discrete inputs
            
            # Create slave context
            self.store = ModbusSlaveContext(
                di=di,
                co=co,
                hr=hr,
                ir=ir
            )
            
            # Create server context
            self.context = ModbusServerContext(slaves=self.store, single=True)
            
            # Initialize some example values
            self.store.setValues(3, 1000, [50])  # Pump1_Speed
            self.store.setValues(3, 1001, [30])  # Pump2_Speed
            self.store.setValues(3, 1002, [0])   # Valve1_Position
            self.store.setValues(3, 1003, [0])   # Valve2_Position
            
            logger.info("MODBUS datastore initialized")
            return True
        except Exception as e:
            logger.error(f"Failed to setup datastore: {e}")
            return False
    
    def start(self):
        """Start the MODBUS TCP server."""
        if not self.context:
            success = self.setup_datastore()
            if not success:
                return False
                
        try:
            logger.info("Starting MODBUS TCP server on port 502...")
            StartTcpServer(context=self.context, address=("0.0.0.0", 502))
            self.running = True
            return True
        except Exception as e:
            logger.error(f"Failed to start server: {e}")
            return False

def main():
    """Main function."""
    simulator = ModbusSimulator()
    simulator.start()

if __name__ == "__main__":
    main() 