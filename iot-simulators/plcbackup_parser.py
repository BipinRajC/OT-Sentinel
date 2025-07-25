#!/usr/bin/env python3
"""
PLC Backup File Parser
---------------------
This script parses and analyzes PLC backup files to extract
configuration information, tags, network settings, and other
industrial control system properties.
"""

import os
import re
import json
import argparse
import zipfile
import xml.etree.ElementTree as ET
import logging
from typing import Dict, List, Any, Union, Optional
from dataclasses import dataclass, field, asdict
import csv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class PLCTag:
    """Represents a tag in a PLC program."""
    name: str
    data_type: str
    address: str = ""
    description: str = ""
    initial_value: Any = None
    scope: str = "global"
    dimensions: List[int] = field(default_factory=list)
    is_constant: bool = False
    is_external: bool = False
    access_level: str = "read_write"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


@dataclass
class PLCDevice:
    """Represents a hardware device in a PLC configuration."""
    name: str
    type: str
    vendor: str = ""
    model: str = ""
    serial_number: str = ""
    ip_address: str = ""
    mac_address: str = ""
    firmware_version: str = ""
    location: str = ""
    description: str = ""
    parameters: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


@dataclass
class PLCNetwork:
    """Represents a network configuration in a PLC."""
    name: str
    protocol: str
    ip_address: str = ""
    subnet_mask: str = ""
    gateway: str = ""
    dns_servers: List[str] = field(default_factory=list)
    interfaces: List[Dict[str, Any]] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


@dataclass
class PLCProgram:
    """Represents a program or routine in a PLC."""
    name: str
    language: str
    description: str = ""
    code: str = ""
    local_tags: List[PLCTag] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "name": self.name,
            "language": self.language,
            "description": self.description,
            "code": self.code,
            "local_tags": [tag.to_dict() for tag in self.local_tags]
        }


class PLCBackupParser:
    """Base class for parsing PLC backup files."""
    
    def __init__(self, filename: str):
        self.filename = filename
        self.tags: List[PLCTag] = []
        self.devices: List[PLCDevice] = []
        self.networks: List[PLCNetwork] = []
        self.programs: List[PLCProgram] = []
        self.raw_data: Dict[str, Any] = {}
        self.metadata: Dict[str, Any] = {
            "plc_name": "",
            "vendor": "",
            "model": "",
            "firmware": "",
            "project_name": "",
            "author": "",
            "creation_date": "",
            "last_modified": ""
        }
    
    def parse(self) -> Dict[str, Any]:
        """Parse the PLC backup file."""
        logger.info(f"Parsing PLC backup file: {self.filename}")
        
        # Determine file type and parse accordingly
        file_ext = os.path.splitext(self.filename)[1].lower()
        
        if file_ext == '.acd':
            self._parse_rockwell_acd()
        elif file_ext == '.zap13':
            self._parse_siemens_zap()
        elif file_ext == '.xml':
            self._parse_generic_xml()
        elif file_ext == '.zip':
            self._parse_zip_archive()
        elif file_ext == '.json':
            self._parse_json_backup()
        else:
            logger.warning(f"Unknown file type: {file_ext}")
            self._parse_generic_binary()
        
        # Return parsed data
        result = {
            "metadata": self.metadata,
            "tags": [tag.to_dict() for tag in self.tags],
            "devices": [device.to_dict() for device in self.devices],
            "networks": [network.to_dict() for network in self.networks],
            "programs": [program.to_dict() for program in self.programs],
            "raw_data": self.raw_data
        }
        
        logger.info(f"Found {len(self.tags)} tags, {len(self.devices)} devices, {len(self.networks)} networks, {len(self.programs)} programs")
        
        return result
    
    def _parse_rockwell_acd(self) -> None:
        """Parse Rockwell Automation ACD file."""
        logger.info("Parsing Rockwell Automation ACD file")
        
        # ACD files are proprietary binary files
        # We'll extract some information using regex patterns
        
        try:
            with open(self.filename, 'rb') as file:
                data = file.read()
                text_data = data.decode('latin-1', errors='ignore')
                
                # Extract metadata
                plc_name_match = re.search(r'ControllerName="([^"]+)"', text_data)
                if plc_name_match:
                    self.metadata["plc_name"] = plc_name_match.group(1)
                
                # Extract tag information
                tag_pattern = re.compile(r'Tag Name="([^"]+)"\s+Data Type="([^"]+)"\s+Dim="([^"]*)"')
                for match in tag_pattern.finditer(text_data):
                    name, data_type, dimensions = match.groups()
                    
                    # Parse dimensions
                    dims = []
                    if dimensions:
                        try:
                            dims = [int(d) for d in dimensions.split(',') if d]
                        except ValueError:
                            logger.warning(f"Could not parse dimensions for tag {name}: {dimensions}")
                    
                    tag = PLCTag(
                        name=name,
                        data_type=data_type,
                        dimensions=dims
                    )
                    self.tags.append(tag)
                
                # Look for device information
                device_pattern = re.compile(r'DeviceName="([^"]+)"\s+DeviceType="([^"]+)"')
                for match in device_pattern.finditer(text_data):
                    name, dev_type = match.groups()
                    
                    # Try to find IP address
                    ip_match = re.search(r'IPAddress="([^"]+)"', text_data[match.start():match.start()+1000])
                    ip_address = ip_match.group(1) if ip_match else ""
                    
                    device = PLCDevice(
                        name=name,
                        type=dev_type,
                        vendor="Rockwell Automation",
                        ip_address=ip_address
                    )
                    self.devices.append(device)
                
        except Exception as e:
            logger.error(f"Error parsing Rockwell ACD file: {e}")
    
    def _parse_siemens_zap(self) -> None:
        """Parse Siemens TIA Portal ZAP file."""
        logger.info("Parsing Siemens TIA Portal ZAP file")
        
        # ZAP files are ZIP archives
        try:
            with zipfile.ZipFile(self.filename, 'r') as zipf:
                # Extract metadata from project info
                if 'ProjectInfo.xml' in zipf.namelist():
                    with zipf.open('ProjectInfo.xml') as xmlfile:
                        tree = ET.parse(xmlfile)
                        root = tree.getroot()
                        
                        # Extract project metadata
                        project_info = root.find(".//ProjectInformation")
                        if project_info is not None:
                            self.metadata["project_name"] = project_info.get("Name", "")
                            self.metadata["creation_date"] = project_info.get("CreationDate", "")
                            self.metadata["last_modified"] = project_info.get("LastModified", "")
                
                # Extract PLC data
                plc_files = [f for f in zipf.namelist() if f.endswith('station.xml')]
                for plc_file in plc_files:
                    with zipf.open(plc_file) as xmlfile:
                        tree = ET.parse(xmlfile)
                        root = tree.getroot()
                        
                        # Extract PLC information
                        plc_info = root.find(".//Device")
                        if plc_info is not None:
                            self.metadata["plc_name"] = plc_info.get("Name", "")
                            self.metadata["model"] = plc_info.get("TypeName", "")
                            self.metadata["vendor"] = "Siemens"
                
                # Look for tag tables
                tag_files = [f for f in zipf.namelist() if 'TagTable' in f and f.endswith('.xml')]
                for tag_file in tag_files:
                    with zipf.open(tag_file) as xmlfile:
                        tree = ET.parse(xmlfile)
                        root = tree.getroot()
                        
                        # Extract tags
                        for tag_elem in root.findall(".//Tag"):
                            name = tag_elem.get("Name", "")
                            data_type = tag_elem.get("DataTypeName", "")
                            address = tag_elem.get("LogicalAddress", "")
                            
                            tag = PLCTag(
                                name=name,
                                data_type=data_type,
                                address=address
                            )
                            self.tags.append(tag)
                            
        except Exception as e:
            logger.error(f"Error parsing Siemens ZAP file: {e}")
    
    def _parse_generic_xml(self) -> None:
        """Parse a generic XML backup file."""
        logger.info("Parsing generic XML backup file")
        
        try:
            tree = ET.parse(self.filename)
            root = tree.getroot()
            
            # Look for PLC information
            plc_elem = root.find(".//PLC") or root.find(".//Controller") or root.find(".//CPU")
            if plc_elem is not None:
                self.metadata["plc_name"] = plc_elem.get("Name", "")
                self.metadata["model"] = plc_elem.get("Model", "")
                self.metadata["vendor"] = plc_elem.get("Vendor", "")
                self.metadata["firmware"] = plc_elem.get("Firmware", "")
            
            # Extract tags
            tag_elems = root.findall(".//Tag") or root.findall(".//Variable")
            for tag_elem in tag_elems:
                name = tag_elem.get("Name", "")
                data_type = tag_elem.get("DataType", "")
                address = tag_elem.get("Address", "")
                description = tag_elem.get("Description", "")
                
                tag = PLCTag(
                    name=name,
                    data_type=data_type,
                    address=address,
                    description=description
                )
                self.tags.append(tag)
            
            # Extract devices
            device_elems = root.findall(".//Device") or root.findall(".//Hardware")
            for device_elem in device_elems:
                name = device_elem.get("Name", "")
                dev_type = device_elem.get("Type", "")
                vendor = device_elem.get("Vendor", "")
                model = device_elem.get("Model", "")
                
                device = PLCDevice(
                    name=name,
                    type=dev_type,
                    vendor=vendor,
                    model=model
                )
                self.devices.append(device)
            
            # Extract network configurations
            network_elems = root.findall(".//Network") or root.findall(".//Ethernet")
            for network_elem in network_elems:
                name = network_elem.get("Name", "")
                protocol = network_elem.get("Protocol", "")
                ip_address = network_elem.get("IPAddress", "")
                subnet_mask = network_elem.get("SubnetMask", "")
                
                network = PLCNetwork(
                    name=name,
                    protocol=protocol,
                    ip_address=ip_address,
                    subnet_mask=subnet_mask
                )
                self.networks.append(network)
                
        except Exception as e:
            logger.error(f"Error parsing XML file: {e}")
    
    def _parse_zip_archive(self) -> None:
        """Parse a ZIP archive containing backup files."""
        logger.info("Parsing ZIP archive")
        
        try:
            with zipfile.ZipFile(self.filename, 'r') as zipf:
                # Look for XML files first
                xml_files = [f for f in zipf.namelist() if f.endswith('.xml')]
                
                if xml_files:
                    # Extract the first XML file and parse it
                    with zipf.open(xml_files[0]) as xmlfile:
                        # Create a temporary file
                        temp_file = os.path.join(os.path.dirname(self.filename), "_temp_extract.xml")
                        with open(temp_file, 'wb') as f:
                            f.write(xmlfile.read())
                        
                        # Parse the extracted file
                        orig_filename = self.filename
                        self.filename = temp_file
                        self._parse_generic_xml()
                        self.filename = orig_filename
                        
                        # Remove temporary file
                        os.remove(temp_file)
                
                # Look for CSV files with tag definitions
                csv_files = [f for f in zipf.namelist() if f.endswith('.csv')]
                
                for csv_file in csv_files:
                    with zipf.open(csv_file) as csvfile:
                        # Read and decode CSV data
                        try:
                            lines = [line.decode('utf-8') for line in csvfile.readlines()]
                            
                            # Try to detect if this is a tag list
                            first_line = lines[0] if lines else ""
                            if any(keyword in first_line.lower() for keyword in ["tag", "variable", "symbol", "address"]):
                                reader = csv.DictReader(lines)
                                
                                # Map common field names
                                field_maps = {
                                    "name": ["name", "tag name", "symbol", "variable"],
                                    "data_type": ["data type", "type", "datatype"],
                                    "address": ["address", "location"],
                                    "description": ["description", "comment"]
                                }
                                
                                for row in reader:
                                    # Convert all keys to lowercase for easier matching
                                    row_lower = {k.lower(): v for k, v in row.items()}
                                    
                                    # Extract fields using various possible column names
                                    tag_data = {}
                                    for field, possible_names in field_maps.items():
                                        for name in possible_names:
                                            if name in row_lower:
                                                tag_data[field] = row_lower[name]
                                                break
                                    
                                    # Create tag if required fields are present
                                    if "name" in tag_data and "data_type" in tag_data:
                                        tag = PLCTag(
                                            name=tag_data.get("name", ""),
                                            data_type=tag_data.get("data_type", ""),
                                            address=tag_data.get("address", ""),
                                            description=tag_data.get("description", "")
                                        )
                                        self.tags.append(tag)
                        except Exception as e:
                            logger.warning(f"Error parsing CSV file {csv_file}: {e}")
                
        except Exception as e:
            logger.error(f"Error parsing ZIP archive: {e}")
    
    def _parse_json_backup(self) -> None:
        """Parse a JSON backup file."""
        logger.info("Parsing JSON backup file")
        
        try:
            with open(self.filename, 'r') as file:
                data = json.load(file)
                
                # Extract metadata
                metadata = data.get("metadata", {})
                self.metadata.update(metadata)
                
                # Extract tags
                tags_data = data.get("tags", [])
                for tag_data in tags_data:
                    tag = PLCTag(
                        name=tag_data.get("name", ""),
                        data_type=tag_data.get("data_type", ""),
                        address=tag_data.get("address", ""),
                        description=tag_data.get("description", ""),
                        initial_value=tag_data.get("initial_value", None),
                        scope=tag_data.get("scope", "global"),
                        dimensions=tag_data.get("dimensions", []),
                        is_constant=tag_data.get("is_constant", False),
                        is_external=tag_data.get("is_external", False),
                        access_level=tag_data.get("access_level", "read_write")
                    )
                    self.tags.append(tag)
                
                # Extract devices
                devices_data = data.get("devices", [])
                for device_data in devices_data:
                    device = PLCDevice(
                        name=device_data.get("name", ""),
                        type=device_data.get("type", ""),
                        vendor=device_data.get("vendor", ""),
                        model=device_data.get("model", ""),
                        serial_number=device_data.get("serial_number", ""),
                        ip_address=device_data.get("ip_address", ""),
                        mac_address=device_data.get("mac_address", ""),
                        firmware_version=device_data.get("firmware_version", ""),
                        location=device_data.get("location", ""),
                        description=device_data.get("description", ""),
                        parameters=device_data.get("parameters", {})
                    )
                    self.devices.append(device)
                
                # Extract networks
                networks_data = data.get("networks", [])
                for network_data in networks_data:
                    network = PLCNetwork(
                        name=network_data.get("name", ""),
                        protocol=network_data.get("protocol", ""),
                        ip_address=network_data.get("ip_address", ""),
                        subnet_mask=network_data.get("subnet_mask", ""),
                        gateway=network_data.get("gateway", ""),
                        dns_servers=network_data.get("dns_servers", []),
                        interfaces=network_data.get("interfaces", [])
                    )
                    self.networks.append(network)
                
                # Extract programs
                programs_data = data.get("programs", [])
                for program_data in programs_data:
                    # Parse local tags
                    local_tags = []
                    for tag_data in program_data.get("local_tags", []):
                        tag = PLCTag(
                            name=tag_data.get("name", ""),
                            data_type=tag_data.get("data_type", ""),
                            address=tag_data.get("address", ""),
                            description=tag_data.get("description", ""),
                            initial_value=tag_data.get("initial_value", None),
                            scope="local",
                            dimensions=tag_data.get("dimensions", []),
                            is_constant=tag_data.get("is_constant", False),
                            is_external=tag_data.get("is_external", False),
                            access_level=tag_data.get("access_level", "read_write")
                        )
                        local_tags.append(tag)
                    
                    program = PLCProgram(
                        name=program_data.get("name", ""),
                        language=program_data.get("language", ""),
                        description=program_data.get("description", ""),
                        code=program_data.get("code", ""),
                        local_tags=local_tags
                    )
                    self.programs.append(program)
                
                # Store any additional raw data
                for key, value in data.items():
                    if key not in ["metadata", "tags", "devices", "networks", "programs"]:
                        self.raw_data[key] = value
                        
        except Exception as e:
            logger.error(f"Error parsing JSON file: {e}")
    
    def _parse_generic_binary(self) -> None:
        """Try to extract information from unknown binary formats."""
        logger.info("Attempting to parse generic binary file")
        
        try:
            with open(self.filename, 'rb') as file:
                data = file.read()
                text_data = data.decode('latin-1', errors='ignore')
                
                # Look for PLC model information
                model_patterns = [
                    r'(?:PLC|CPU) Type:?\s*([A-Za-z0-9\-]+)',
                    r'Model:?\s*([A-Za-z0-9\-]+)',
                    r'Controller:?\s*([A-Za-z0-9\-]+)'
                ]
                
                for pattern in model_patterns:
                    match = re.search(pattern, text_data)
                    if match:
                        self.metadata["model"] = match.group(1)
                        break
                
                # Look for vendor information
                vendor_patterns = [
                    r'Vendor:?\s*([A-Za-z0-9\- ]+)',
                    r'Manufacturer:?\s*([A-Za-z0-9\- ]+)'
                ]
                
                for pattern in vendor_patterns:
                    match = re.search(pattern, text_data)
                    if match:
                        self.metadata["vendor"] = match.group(1)
                        break
                
                # Look for firmware information
                firmware_patterns = [
                    r'Firmware:?\s*([\d\.]+)',
                    r'FW Version:?\s*([\d\.]+)'
                ]
                
                for pattern in firmware_patterns:
                    match = re.search(pattern, text_data)
                    if match:
                        self.metadata["firmware"] = match.group(1)
                        break
                
                # Look for IP addresses
                ip_pattern = r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
                for match in re.finditer(ip_pattern, text_data):
                    ip = match.group(0)
                    # Verify that it's a valid IP
                    if all(0 <= int(octet) <= 255 for octet in ip.split('.')):
                        # Check the context to see if it's actually an IP
                        context = text_data[max(0, match.start() - 30):match.end() + 30]
                        if any(keyword in context.lower() for keyword in ["ip", "address", "ethernet", "network"]):
                            network = PLCNetwork(
                                name=f"Network_{len(self.networks) + 1}",
                                protocol="Unknown",
                                ip_address=ip
                            )
                            self.networks.append(network)
                
                # Look for Modbus registers or data blocks
                register_patterns = [
                    r'%MW(\d+)',  # Schneider Electric format
                    r'DB(\d+)\.DBW(\d+)',  # Siemens format
                    r'D(\d+)',  # Mitsubishi format
                    r'HR(\d+)'  # Generic Holding Register
                ]
                
                for pattern in register_patterns:
                    for match in re.finditer(pattern, text_data):
                        # Get some context around the match
                        start = max(0, match.start() - 50)
                        end = min(len(text_data), match.end() + 50)
                        context = text_data[start:end]
                        
                        # Try to extract a name from the context
                        name_match = re.search(r'([A-Za-z][A-Za-z0-9_]*)', context)
                        name = name_match.group(1) if name_match else f"Register_{match.group(0)}"
                        
                        tag = PLCTag(
                            name=name,
                            data_type="WORD",  # Assume WORD by default
                            address=match.group(0)
                        )
                        self.tags.append(tag)
                
        except Exception as e:
            logger.error(f"Error parsing binary file: {e}")


def save_results(parsed_data: Dict[str, Any], output_path: str) -> None:
    """Save the parsed results to a JSON file."""
    with open(output_path, 'w') as file:
        json.dump(parsed_data, file, indent=2)
    logger.info(f"Saved parsed data to {output_path}")


def main():
    """Main function to parse PLC backup files."""
    parser = argparse.ArgumentParser(description='Parse PLC backup files')
    parser.add_argument('input', type=str, help='Input PLC backup file')
    parser.add_argument('--output', '-o', type=str, default='',
                      help='Output JSON file (default: input_parsed.json)')
    
    args = parser.parse_args()
    
    # Determine output filename if not specified
    output_file = args.output
    if not output_file:
        base_name = os.path.splitext(os.path.basename(args.input))[0]
        output_file = f"{base_name}_parsed.json"
    
    # Parse the file
    plc_parser = PLCBackupParser(args.input)
    parsed_data = plc_parser.parse()
    
    # Save the results
    save_results(parsed_data, output_file)


if __name__ == "__main__":
    main() 