#!/usr/bin/env python3
"""
Simple Modbus TCP Server using basic sockets.
This provides a basic Modbus-like interface for testing.
"""

import socket
import threading
import time
import logging
import struct
import random

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('simple_modbus_server')

class SimpleModbusServer:
    """Simple Modbus TCP server using raw sockets."""
    
    def __init__(self, host='0.0.0.0', port=502):
        self.host = host
        self.port = port
        self.running = False
        self.server_socket = None
        
        # Simulated register data
        self.holding_registers = {}
        self.coils = {}
        
        # Initialize with some test data
        self._initialize_data()
    
    def _initialize_data(self):
        """Initialize registers with test data."""
        # Valve positions (0-100%)
        self.holding_registers[1000] = 50  # AValve_Position
        self.holding_registers[1001] = 45  # BValve_Position
        self.holding_registers[1002] = 60  # ProductValve_Position
        self.holding_registers[1003] = 10  # PurgeValve_Position
        
        # Flow rates (scaled by 10)
        self.holding_registers[1010] = 250  # AFlow_Rate * 10
        self.holding_registers[1011] = 220  # BFlow_Rate * 10
        self.holding_registers[1012] = 400  # ProductFlow_Rate * 10
        self.holding_registers[1013] = 30   # PurgeFlow_Rate * 10
        
        # Pressure readings
        self.holding_registers[1020] = 150  # Reactor_Pressure
        self.holding_registers[1021] = 140  # Separator_Pressure
        self.holding_registers[1022] = 165  # Feed_Pressure
        
        # Level measurements
        self.holding_registers[1030] = 55   # Reactor_Level
        self.holding_registers[1031] = 45   # Separator_Level
        self.holding_registers[1032] = 70   # Feed_Tank_Level
        
        # System status coils
        self.coils[2000] = True   # System_Run
        self.coils[2001] = False  # Emergency_Stop
        self.coils[2002] = True   # Auto_Mode
        self.coils[2003] = False  # Maintenance_Mode
        
        # Alarm coils
        self.coils[2010] = False  # High_Pressure_Alarm
        self.coils[2011] = False  # High_Temperature_Alarm
        self.coils[2012] = False  # Low_Level_Alarm
        self.coils[2013] = False  # Communication_Alarm
    
    def _update_data(self):
        """Update register values with simulated process data."""
        while self.running:
            try:
                # Add some variation to simulate a real process
                for reg in [1000, 1001, 1002, 1020, 1021, 1030, 1031]:
                    if reg in self.holding_registers:
                        # Add small random variation
                        variation = random.randint(-5, 5)
                        new_value = self.holding_registers[reg] + variation
                        
                        # Keep values in reasonable ranges
                        if reg in [1000, 1001, 1002]:  # Valve positions
                            new_value = max(0, min(100, new_value))
                        elif reg in [1020, 1021]:  # Pressures
                            new_value = max(100, min(200, new_value))
                        elif reg in [1030, 1031]:  # Levels
                            new_value = max(10, min(90, new_value))
                        
                        self.holding_registers[reg] = new_value
                
                time.sleep(2)  # Update every 2 seconds
                
            except Exception as e:
                logger.error(f"Error updating data: {e}")
                time.sleep(5)
    
    def _handle_modbus_request(self, data):
        """Handle basic Modbus TCP requests."""
        if len(data) < 8:
            return None
        
        try:
            # Basic Modbus TCP header parsing
            transaction_id = struct.unpack('>H', data[0:2])[0]
            protocol_id = struct.unpack('>H', data[2:4])[0]
            length = struct.unpack('>H', data[4:6])[0]
            unit_id = data[6]
            function_code = data[7]
            
            logger.debug(f"Modbus request: Trans={transaction_id}, Func={function_code}")
            
            if function_code == 3:  # Read Holding Registers
                if len(data) >= 12:
                    start_addr = struct.unpack('>H', data[8:10])[0]
                    quantity = struct.unpack('>H', data[10:12])[0]
                    
                    # Build response
                    response_data = []
                    for i in range(quantity):
                        addr = start_addr + i
                        value = self.holding_registers.get(addr, 0)
                        response_data.append(value)
                    
                    # Create Modbus response
                    response = bytearray()
                    response.extend(struct.pack('>H', transaction_id))  # Transaction ID
                    response.extend(struct.pack('>H', 0))               # Protocol ID
                    response.extend(struct.pack('>H', 3 + len(response_data) * 2))  # Length
                    response.append(unit_id)                            # Unit ID
                    response.append(function_code)                      # Function code
                    response.append(len(response_data) * 2)             # Byte count
                    
                    for value in response_data:
                        response.extend(struct.pack('>H', value))
                    
                    return bytes(response)
            
            elif function_code == 1:  # Read Coils
                if len(data) >= 12:
                    start_addr = struct.unpack('>H', data[8:10])[0]
                    quantity = struct.unpack('>H', data[10:12])[0]
                    
                    # Build coil response (simplified)
                    byte_count = (quantity + 7) // 8
                    coil_bytes = []
                    
                    for i in range(byte_count):
                        byte_val = 0
                        for j in range(8):
                            bit_addr = start_addr + i * 8 + j
                            if bit_addr < start_addr + quantity:
                                if self.coils.get(bit_addr, False):
                                    byte_val |= (1 << j)
                        coil_bytes.append(byte_val)
                    
                    # Create response
                    response = bytearray()
                    response.extend(struct.pack('>H', transaction_id))
                    response.extend(struct.pack('>H', 0))
                    response.extend(struct.pack('>H', 3 + byte_count))
                    response.append(unit_id)
                    response.append(function_code)
                    response.append(byte_count)
                    response.extend(coil_bytes)
                    
                    return bytes(response)
            
            # Default response for unsupported functions
            logger.warning(f"Unsupported function code: {function_code}")
            return None
            
        except Exception as e:
            logger.error(f"Error handling Modbus request: {e}")
            return None
    
    def _handle_client(self, client_socket, address):
        """Handle individual client connections."""
        logger.info(f"Client connected from {address}")
        
        try:
            while self.running:
                data = client_socket.recv(1024)
                if not data:
                    break
                
                response = self._handle_modbus_request(data)
                if response:
                    client_socket.send(response)
                else:
                    # Send basic acknowledgment
                    ack = b'\x00\x01\x00\x00\x00\x06\x01\x03\x02\x00\x01'
                    client_socket.send(ack)
                
        except Exception as e:
            logger.error(f"Error handling client {address}: {e}")
        finally:
            client_socket.close()
            logger.info(f"Client {address} disconnected")
    
    def start(self):
        """Start the Modbus server."""
        self.running = True
        
        try:
            # Create server socket
            self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.server_socket.bind((self.host, self.port))
            self.server_socket.listen(5)
            
            logger.info(f"Simple Modbus TCP server listening on {self.host}:{self.port}")
            
            # Start data update thread
            update_thread = threading.Thread(target=self._update_data, daemon=True)
            update_thread.start()
            
            # Accept connections
            while self.running:
                try:
                    client_socket, address = self.server_socket.accept()
                    client_thread = threading.Thread(
                        target=self._handle_client,
                        args=(client_socket, address),
                        daemon=True
                    )
                    client_thread.start()
                    
                except Exception as e:
                    if self.running:
                        logger.error(f"Error accepting connections: {e}")
                        break
                        
        except Exception as e:
            logger.error(f"Error starting server: {e}")
        finally:
            if self.server_socket:
                self.server_socket.close()
            logger.info("Simple Modbus server stopped")
    
    def stop(self):
        """Stop the server."""
        self.running = False
        if self.server_socket:
            self.server_socket.close()


def main():
    """Main function."""
    logger.info("Starting Simple Modbus TCP Server")
    
    server = SimpleModbusServer()
    
    try:
        server.start()
    except KeyboardInterrupt:
        logger.info("Shutting down server...")
        server.stop()
    except Exception as e:
        logger.error(f"Server error: {e}")
        server.stop()


if __name__ == "__main__":
    main() 