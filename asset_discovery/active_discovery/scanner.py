#!/usr/bin/env python3
"""
Active ICS Asset Discovery Scanner.
Implements network scanning techniques to identify ICS devices.
"""

import sys
import logging
import argparse
import json
import nmap
from concurrent.futures import ThreadPoolExecutor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('ics_scanner')

class ICSScanner:
    """Active scanner for discovering ICS devices on the network."""
    
    def __init__(self):
        """Initialize the ICS scanner."""
        self.nm = nmap.PortScanner()
        
    def scan_network(self, network_range, scan_type="basic"):
        """Scan network for ICS devices.
        
        Args:
            network_range (str): Network range to scan in CIDR notation
            scan_type (str): Type of scan to perform (basic, full, or stealth)
            
        Returns:
            list: List of discovered ICS devices
        """
        logger.info(f"Starting {scan_type} scan of {network_range}")
        
        # Define scan parameters based on scan type
        if scan_type == "basic":
            # Quick scan for common ICS ports
            ports = "20000,44818,102,502,1089-1091,2222,47808,1962,789,9600,1911,4000,20547"
            arguments = f"-p {ports} --open"
        elif scan_type == "full":
            # More comprehensive scan with service detection
            ports = "20000,44818,102,502,1089-1091,2222,47808,1962,789,9600,1911,4000,20547,80,443,8080,8443,23,21"
            arguments = f"-p {ports} --open -sV"
        elif scan_type == "stealth":
            # Stealthy SYN scan for careful probing
            ports = "502,44818,102,47808"
            arguments = f"-p {ports} -sS --open --min-rate=50"
        else:
            logger.error(f"Unknown scan type: {scan_type}")
            return []
        
        try:
            self.nm.scan(hosts=network_range, arguments=arguments)
        except Exception as e:
            logger.error(f"Scan error: {e}")
            return []
        
        devices = []
        for host in self.nm.all_hosts():
            logger.info(f"Found host: {host}")
            device = {"ip": host, "protocols": []}
            
            # Check for MODBUS
            if self.nm[host].has_tcp(502) and self.nm[host]['tcp'][502]['state'] == 'open':
                logger.info(f"Found MODBUS device at {host}")
                device["protocols"].append({
                    "name": "modbus",
                    "port": 502,
                    "state": self.nm[host]['tcp'][502]['state']
                })
                
                # Add additional MODBUS information
                with ThreadPoolExecutor() as executor:
                    future = executor.submit(self._scan_modbus, host)
                    modbus_info = future.result()
                    if modbus_info:
                        device["modbus_info"] = modbus_info
            
            # Check for EtherNet/IP
            if self.nm[host].has_tcp(44818) and self.nm[host]['tcp'][44818]['state'] == 'open':
                logger.info(f"Found EtherNet/IP device at {host}")
                device["protocols"].append({
                    "name": "ethernet_ip",
                    "port": 44818,
                    "state": self.nm[host]['tcp'][44818]['state']
                })
            
            # Check for S7COMM/SIEMENS
            if self.nm[host].has_tcp(102) and self.nm[host]['tcp'][102]['state'] == 'open':
                logger.info(f"Found S7COMM device at {host}")
                device["protocols"].append({
                    "name": "s7comm",
                    "port": 102,
                    "state": self.nm[host]['tcp'][102]['state']
                })
            
            # Check for BACnet
            if self.nm[host].has_tcp(47808) and self.nm[host]['tcp'][47808]['state'] == 'open':
                logger.info(f"Found BACnet device at {host}")
                device["protocols"].append({
                    "name": "bacnet",
                    "port": 47808,
                    "state": self.nm[host]['tcp'][47808]['state']
                })
            
            if device["protocols"]:
                # Only add device if we found ICS protocols
                devices.append(device)
        
        logger.info(f"Discovered {len(devices)} ICS devices")
        return devices
    
    def _scan_modbus(self, host):
        """Perform detailed MODBUS scan using Nmap scripts.
        
        Args:
            host (str): Target host IP
            
        Returns:
            dict: MODBUS device information
        """
        logger.info(f"Performing detailed MODBUS scan on {host}")
        try:
            # Use nmap MODBUS scripts to gather more information
            self.nm.scan(hosts=host, arguments="-p 502 --script modbus-discover")
            
            if 'hostscript' in self.nm[host]:
                for script in self.nm[host]['hostscript']:
                    if script['id'] == 'modbus-discover':
                        # Parse the script output
                        output = script['output']
                        return {
                            "device_info": output,
                            "is_modbus": True
                        }
            
            return {"is_modbus": True}
        except Exception as e:
            logger.error(f"Error during MODBUS scan: {e}")
            return None

# Simplified function matching README example
def scan_network(network_range):
    """Scan network for ICS devices."""
    nm = nmap.PortScanner()
    nm.scan(hosts=network_range, arguments='-p 502,44818 --script modbus-discover')
    
    devices = []
    for host in nm.all_hosts():
        if nm[host].has_tcp(502) and nm[host]['tcp'][502]['state'] == 'open':
            devices.append({
                'ip': host,
                'protocol': 'modbus',
                'ports': [502]
            })
    
    return devices

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ICS Asset Discovery Scanner")
    parser.add_argument("--network", required=True, help="Network range to scan (CIDR notation)")
    parser.add_argument("--type", choices=["basic", "full", "stealth"], default="basic", 
                        help="Type of scan to perform")
    parser.add_argument("--output", help="Output file for scan results (JSON format)")
    
    args = parser.parse_args()
    
    scanner = ICSScanner()
    devices = scanner.scan_network(args.network, args.type)
    
    # Print results
    print(json.dumps(devices, indent=2))
    
    # Save results to file if specified
    if args.output:
        try:
            with open(args.output, 'w') as f:
                json.dump(devices, f, indent=2)
            logger.info(f"Scan results saved to {args.output}")
        except Exception as e:
            logger.error(f"Error saving scan results: {e}") 