#!/usr/bin/env python3
"""
MODBUS Protocol Parser.
Parses and analyzes MODBUS protocol packets for ICS security monitoring.
"""

import logging
import argparse
import json
import struct
from pymodbus.constants import Endian
from pymodbus.payload import BinaryPayloadDecoder

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('modbus_parser')

# MODBUS function codes
FUNCTION_CODES = {
    1: "Read Coils",
    2: "Read Discrete Inputs",
    3: "Read Holding Registers",
    4: "Read Input Registers",
    5: "Write Single Coil",
    6: "Write Single Register",
    15: "Write Multiple Coils",
    16: "Write Multiple Registers",
    43: "Read Device Identification"
}

class ModbusParser:
    """Parser for MODBUS protocol packets."""
    
    def __init__(self):
        """Initialize the MODBUS parser."""
        self.transaction_count = 0
        self.packets = []
    
    def parse_packet(self, packet):
        """Parse a MODBUS packet.
        
        Args:
            packet (bytes): Raw MODBUS packet data
            
        Returns:
            dict: Parsed MODBUS packet information
        """
        if not packet or len(packet) < 8:
            logger.warning("Invalid packet: too short")
            return None
            
        try:
            # Extract MODBUS header
            transaction_id = (packet[0] << 8) | packet[1]
            protocol_id = (packet[2] << 8) | packet[3]
            length = (packet[4] << 8) | packet[5]
            unit_id = packet[6]
            function_code = packet[7]
            
            # Check for valid MODBUS packet
            if protocol_id != 0:
                logger.warning(f"Invalid MODBUS protocol ID: {protocol_id}")
                return None
                
            # Parse based on function code
            payload = packet[8:8+length-2] if 8+length-2 <= len(packet) else packet[8:]
            parsed_data = self._parse_function(function_code, payload)
            
            self.transaction_count += 1
            
            # Create parsed packet object
            parsed_packet = {
                'transaction_id': transaction_id,
                'protocol_id': protocol_id,
                'length': length,
                'unit_id': unit_id,
                'function_code': function_code,
                'function_name': FUNCTION_CODES.get(function_code, f"Unknown ({function_code})"),
                'payload': parsed_data,
                'raw_data': packet.hex()
            }
            
            # Store packet
            self.packets.append(parsed_packet)
            
            logger.debug(f"Parsed MODBUS packet: {json.dumps(parsed_packet, default=str)}")
            return parsed_packet
            
        except Exception as e:
            logger.error(f"Error parsing packet: {e}")
            return None
    
    def _parse_function(self, function_code, payload):
        """Parse payload based on function code.
        
        Args:
            function_code (int): MODBUS function code
            payload (bytes): Payload data
            
        Returns:
            dict: Parsed payload data
        """
        try:
            # Read functions (1-4)
            if function_code in [1, 2, 3, 4]:
                if len(payload) < 1:
                    return {'error': 'Payload too short for read response'}
                    
                byte_count = payload[0]
                values = []
                
                if function_code in [1, 2]:  # Coils and Discrete Inputs (bit values)
                    for i in range(1, min(1 + byte_count, len(payload))):
                        for bit in range(8):
                            if (i - 1) * 8 + bit < byte_count * 8:
                                values.append((payload[i] >> bit) & 1)
                                
                elif function_code in [3, 4]:  # Holding and Input Registers (16-bit values)
                    for i in range(1, min(1 + byte_count, len(payload)), 2):
                        if i + 1 < len(payload):
                            values.append((payload[i] << 8) | payload[i+1])
                
                return {
                    'byte_count': byte_count,
                    'values': values
                }
                
            # Write Single Coil/Register (5-6)
            elif function_code in [5, 6]:
                if len(payload) < 4:
                    return {'error': 'Payload too short for write single response'}
                    
                address = (payload[0] << 8) | payload[1]
                value = (payload[2] << 8) | payload[3]
                
                if function_code == 5:  # Coil value is either 0x0000 or 0xFF00
                    value = 1 if value == 0xFF00 else 0
                    
                return {
                    'address': address,
                    'value': value
                }
                
            # Write Multiple Coils/Registers (15-16)
            elif function_code in [15, 16]:
                if len(payload) < 4:
                    return {'error': 'Payload too short for write multiple response'}
                    
                address = (payload[0] << 8) | payload[1]
                quantity = (payload[2] << 8) | payload[3]
                
                return {
                    'address': address,
                    'quantity': quantity
                }
                
            # Read Device Identification (43)
            elif function_code == 43:
                if len(payload) < 6:
                    return {'error': 'Payload too short for device identification'}
                
                mei_type = payload[0]
                reading_device_id = payload[1]
                conformity_level = payload[2]
                more_follows = payload[3]
                next_object_id = payload[4]
                object_count = payload[5]
                
                objects = []
                offset = 6
                
                for _ in range(object_count):
                    if offset + 1 >= len(payload):
                        break
                        
                    object_id = payload[offset]
                    object_len = payload[offset + 1]
                    offset += 2
                    
                    if offset + object_len > len(payload):
                        break
                        
                    object_value = payload[offset:offset + object_len].decode('ascii', errors='replace')
                    offset += object_len
                    
                    objects.append({
                        'id': object_id,
                        'value': object_value
                    })
                
                return {
                    'mei_type': mei_type,
                    'reading_device_id': reading_device_id,
                    'conformity_level': conformity_level,
                    'more_follows': more_follows,
                    'next_object_id': next_object_id,
                    'objects': objects
                }
            
            # Unknown function code
            else:
                return {'raw': payload.hex()}
                
        except Exception as e:
            logger.error(f"Error parsing function {function_code}: {e}")
            return {'error': str(e), 'raw': payload.hex()}
    
    def get_statistics(self):
        """Get statistics about parsed packets.
        
        Returns:
            dict: Packet statistics
        """
        if not self.packets:
            return {'transaction_count': 0}
            
        # Count by function code
        function_counts = {}
        unit_ids = set()
        write_operations = 0
        read_operations = 0
        
        for packet in self.packets:
            fc = packet['function_code']
            function_counts[fc] = function_counts.get(fc, 0) + 1
            unit_ids.add(packet['unit_id'])
            
            # Count read/write operations
            if fc in [1, 2, 3, 4]:
                read_operations += 1
            elif fc in [5, 6, 15, 16]:
                write_operations += 1
        
        return {
            'transaction_count': self.transaction_count,
            'function_codes': function_counts,
            'unit_ids': list(unit_ids),
            'read_operations': read_operations,
            'write_operations': write_operations
        }

def load_pcap(pcap_file):
    """Load packets from pcap file.
    
    Args:
        pcap_file (str): Path to pcap file
        
    Returns:
        list: List of packets
    """
    try:
        from scapy.all import rdpcap, TCP
        packets = rdpcap(pcap_file)
        modbus_packets = []
        
        for packet in packets:
            if TCP in packet and packet[TCP].dport == 502 or packet[TCP].sport == 502:
                if packet[TCP].payload:
                    modbus_packets.append(bytes(packet[TCP].payload))
        
        return modbus_packets
    except Exception as e:
        logger.error(f"Error loading pcap file: {e}")
        return []

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MODBUS Protocol Parser")
    parser.add_argument("--pcap", help="PCAP file containing MODBUS traffic")
    parser.add_argument("--raw", help="Hex-encoded MODBUS packet to parse")
    parser.add_argument("--output", help="Output file for parsed results (JSON format)")
    
    args = parser.parse_args()
    
    modbus_parser = ModbusParser()
    results = []
    
    if args.pcap:
        packets = load_pcap(args.pcap)
        logger.info(f"Loaded {len(packets)} MODBUS packets from {args.pcap}")
        
        for packet in packets:
            parsed = modbus_parser.parse_packet(packet)
            if parsed:
                results.append(parsed)
    
    elif args.raw:
        try:
            raw_data = bytes.fromhex(args.raw)
            parsed = modbus_parser.parse_packet(raw_data)
            if parsed:
                results.append(parsed)
        except Exception as e:
            logger.error(f"Error parsing raw packet: {e}")
    
    # Print statistics
    stats = modbus_parser.get_statistics()
    print(f"Parsed {stats['transaction_count']} MODBUS transactions")
    
    if results:
        if args.output:
            try:
                with open(args.output, 'w') as f:
                    json.dump({'packets': results, 'statistics': stats}, f, indent=2)
                logger.info(f"Results saved to {args.output}")
            except Exception as e:
                logger.error(f"Error saving results: {e}")
        else:
            # Print last parsed packet
            print(json.dumps(results[-1], indent=2)) 