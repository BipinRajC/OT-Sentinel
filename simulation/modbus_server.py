#!/usr/bin/env python3
"""
Modbus TCP Server Simulation for ICS Lab Environment.
Simulates an industrial Modbus TCP device with realistic register mappings.
"""

import logging
import time
import threading
try:
    # Try the most common modern API
    from pymodbus.server import StartTcpServer
    PYMODBUS_MODERN = True
except ImportError:
    try:
        # Try legacy sync server
        from pymodbus.server.sync import StartTcpServer
        PYMODBUS_MODERN = False
    except ImportError:
        # Create a basic server using socket
        import socket
        import struct
        StartTcpServer = None
        PYMODBUS_MODERN = False
from pymodbus.datastore import ModbusSequentialDataBlock, ModbusSlaveContext, ModbusServerContext
from pymodbus.transaction import ModbusRtuFramer, ModbusAsciiFramer
from pymodbus.device import ModbusDeviceIdentification
import random
import math

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('modbus_server')

class IndustrialProcessSimulator:
    """Simulates an industrial process with realistic data patterns."""
    
    def __init__(self):
        self.time_start = time.time()
        self.cycle_time = 60  # Process cycle time in seconds
        
        # Industrial process variables
        self.base_pressure = 150.0  # kPa
        self.base_flow = 25.0      # kMol/h
        self.base_level = 50.0     # %
        self.base_temp = 25.0      # °C
        
        # Process state
        self.system_running = True
        self.emergency_stop = False
        self.auto_mode = True
        self.maintenance_mode = False
        
        # Alarm states
        self.high_pressure_alarm = False
        self.high_temperature_alarm = False
        self.low_level_alarm = False
        self.communication_alarm = False
    
    def get_current_values(self):
        """Generate realistic industrial process values."""
        elapsed = time.time() - self.time_start
        cycle_position = (elapsed % self.cycle_time) / self.cycle_time
        
        # Create cyclic patterns with noise
        sine_wave = math.sin(2 * math.pi * cycle_position)
        cosine_wave = math.cos(2 * math.pi * cycle_position)
        noise = random.uniform(-0.1, 0.1)
        
        # Valve positions (0-100%)
        avalve_pos = max(0, min(100, 50 + 20 * sine_wave + 5 * noise))
        bvalve_pos = max(0, min(100, 45 + 15 * cosine_wave + 5 * noise))
        product_valve_pos = max(0, min(100, 60 + 10 * sine_wave + 3 * noise))
        purge_valve_pos = max(0, min(100, 10 + 5 * cosine_wave + 2 * noise))
        
        # Flow rates (kMol/h) - affected by valve positions
        aflow = self.base_flow * (avalve_pos / 100) + noise
        bflow = self.base_flow * (bvalve_pos / 100) + noise
        product_flow = (aflow + bflow) * 0.8 + noise
        purge_flow = (aflow + bflow) * 0.1 + noise
        
        # Pressure readings (kPa)
        reactor_pressure = self.base_pressure + 20 * sine_wave + 5 * noise
        separator_pressure = reactor_pressure - 10 + 3 * noise
        feed_pressure = reactor_pressure + 15 + 2 * noise
        
        # Level measurements (%)
        reactor_level = self.base_level + 20 * cosine_wave + 3 * noise
        separator_level = 40 + 15 * sine_wave + 2 * noise
        feed_tank_level = 70 + 10 * cosine_wave + 2 * noise
        
        # Component compositions (%)
        acomp_reactor = 40 + 10 * sine_wave + 2 * noise
        bcomp_reactor = 35 + 8 * cosine_wave + 2 * noise
        ccomp_reactor = 100 - acomp_reactor - bcomp_reactor
        
        acomp_product = 30 + 8 * sine_wave + 1 * noise
        bcomp_product = 25 + 6 * cosine_wave + 1 * noise
        ccomp_product = 100 - acomp_product - bcomp_product
        
        # Check for alarm conditions
        self.high_pressure_alarm = reactor_pressure > 180
        self.high_temperature_alarm = False  # Temperature not simulated yet
        self.low_level_alarm = reactor_level < 20
        
        return {
            # Valve positions
            1000: int(avalve_pos),
            1001: int(bvalve_pos),
            1002: int(product_valve_pos),
            1003: int(purge_valve_pos),
            
            # Flow rates (scaled by 10 for integer representation)
            1010: int(aflow * 10),
            1011: int(bflow * 10),
            1012: int(product_flow * 10),
            1013: int(purge_flow * 10),
            
            # Pressure readings
            1020: int(reactor_pressure),
            1021: int(separator_pressure),
            1022: int(feed_pressure),
            
            # Level measurements
            1030: int(reactor_level),
            1031: int(separator_level),
            1032: int(feed_tank_level),
            
            # Component compositions (scaled by 10)
            1040: int(acomp_reactor * 10),
            1041: int(bcomp_reactor * 10),
            1042: int(ccomp_reactor * 10),
            1043: int(acomp_product * 10),
            1044: int(bcomp_product * 10),
            1045: int(ccomp_product * 10),
        }
    
    def get_coil_states(self):
        """Get current coil (boolean) states."""
        return {
            # System status
            2000: self.system_running,
            2001: self.emergency_stop,
            2002: self.auto_mode,
            2003: self.maintenance_mode,
            
            # Alarms
            2010: self.high_pressure_alarm,
            2011: self.high_temperature_alarm,
            2012: self.low_level_alarm,
            2013: self.communication_alarm,
        }


class UpdatingModbusServer:
    """Modbus server with live updating data."""
    
    def __init__(self):
        self.simulator = IndustrialProcessSimulator()
        self.running = False
        self.update_thread = None
        
        # Initialize data blocks
        self.holding_registers = ModbusSequentialDataBlock(0, [0] * 10000)
        self.coils = ModbusSequentialDataBlock(0, [False] * 10000)
        
        # Create slave context
        self.slave_context = ModbusSlaveContext(
            di=None,  # Discrete inputs
            co=self.coils,  # Coils
            hr=self.holding_registers,  # Holding registers
            ir=None,  # Input registers
            zero_mode=True
        )
        
        # Create server context
        self.server_context = ModbusServerContext(slaves={1: self.slave_context}, single=False)
        
        # Configure device identification
        self.identity = ModbusDeviceIdentification()
        self.identity.VendorName = 'ICS Security Lab'
        self.identity.ProductCode = 'ISL-PLC-001'
        self.identity.VendorUrl = 'https://ics-security-lab.example.com'
        self.identity.ProductName = 'Industrial Process Simulator'
        self.identity.ModelName = 'Gas Process Control System'
        self.identity.MajorMinorRevision = '1.0.0'
    
    def update_data(self):
        """Update Modbus data with simulated process values."""
        while self.running:
            try:
                # Get current process values
                holding_values = self.simulator.get_current_values()
                coil_values = self.simulator.get_coil_states()
                
                # Update holding registers
                for address, value in holding_values.items():
                    self.holding_registers.setValues(address, [value])
                
                # Update coils
                for address, value in coil_values.items():
                    self.coils.setValues(address, [value])
                
                time.sleep(1)  # Update every second
                
            except Exception as e:
                logger.error(f"Error updating Modbus data: {e}")
                time.sleep(5)
    
    def start_server(self, host='0.0.0.0', port=502):
        """Start the Modbus TCP server."""
        try:
            logger.info(f"Starting Modbus TCP server on {host}:{port}")
            
            # Start data update thread
            self.running = True
            self.update_thread = threading.Thread(target=self.update_data, daemon=True)
            self.update_thread.start()
            
            # Start Modbus server
            if StartTcpServer:
                logger.info(f"Starting Modbus TCP server using pymodbus")
                StartTcpServer(
                    context=self.server_context,
                    identity=self.identity,
                    address=(host, port)
                )
            else:
                # Fallback: Simple TCP server simulation
                logger.info(f"Starting basic TCP server simulation on {host}:{port}")
                self._start_basic_server(host, port)
            
        except Exception as e:
            logger.error(f"Error starting Modbus server: {e}")
            self.running = False
            raise
    
    def stop_server(self):
        """Stop the server and data updates."""
        self.running = False
        if self.update_thread:
            self.update_thread.join()
    
    def _start_basic_server(self, host: str, port: int):
        """Fallback basic TCP server that listens on Modbus port."""
        import socket
        import threading
        
        def handle_client(client_socket, address):
            """Handle basic Modbus-like responses."""
            logger.info(f"Client connected from {address}")
            try:
                while self.running:
                    data = client_socket.recv(1024)
                    if not data:
                        break
                    # Send basic acknowledgment (simplified Modbus response)
                    response = b'\x00\x01\x00\x00\x00\x06\x01\x03\x02\x00\x01'
                    client_socket.send(response)
            except Exception as e:
                logger.error(f"Error handling client {address}: {e}")
            finally:
                client_socket.close()
                logger.info(f"Client {address} disconnected")
        
        # Create server socket
        server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        
        try:
            server_socket.bind((host, port))
            server_socket.listen(5)
            logger.info(f"Basic TCP server listening on {host}:{port}")
            
            while self.running:
                try:
                    client_socket, address = server_socket.accept()
                    client_thread = threading.Thread(
                        target=handle_client, 
                        args=(client_socket, address),
                        daemon=True
                    )
                    client_thread.start()
                except Exception as e:
                    if self.running:
                        logger.error(f"Error accepting connections: {e}")
                        break
        except Exception as e:
            logger.error(f"Error starting basic server: {e}")
        finally:
            server_socket.close()
            logger.info("Basic TCP server stopped")


def main():
    """Main function to start the Modbus TCP server."""
    logger.info("Initializing Industrial Process Modbus TCP Server")
    
    server = UpdatingModbusServer()
    
    try:
        server.start_server()
    except KeyboardInterrupt:
        logger.info("Shutting down Modbus server...")
        server.stop_server()
    except Exception as e:
        logger.error(f"Server error: {e}")
        server.stop_server()


if __name__ == "__main__":
    main() 