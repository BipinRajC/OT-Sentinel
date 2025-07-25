#!/usr/bin/env python3
"""
MODBUS ICS Data Generator for Node-RED
--------------------------------------
This script generates realistic MODBUS ICS data for simulation purposes.
It creates Node-RED flow definitions that can be imported to simulate
ICS devices and processes.
"""

import json
import random
import uuid
import math
import time
import argparse
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple, Optional

# ICS device types and their characteristics
ICS_DEVICE_TYPES = {
    "plc": {
        "registers": [
            {"name": "status", "address": 40001, "type": "coil", "min": 0, "max": 1},
            {"name": "mode", "address": 40002, "type": "holding", "min": 0, "max": 3},
            {"name": "temperature", "address": 40003, "type": "holding", "min": 20, "max": 90},
            {"name": "pressure", "address": 40004, "type": "holding", "min": 0, "max": 100},
            {"name": "flow_rate", "address": 40005, "type": "holding", "min": 0, "max": 1000},
            {"name": "valve_position", "address": 40006, "type": "holding", "min": 0, "max": 100},
            {"name": "alarm", "address": 40007, "type": "coil", "min": 0, "max": 1},
            {"name": "error_code", "address": 40008, "type": "holding", "min": 0, "max": 100}
        ]
    },
    "rtu": {
        "registers": [
            {"name": "status", "address": 40101, "type": "coil", "min": 0, "max": 1},
            {"name": "signal_strength", "address": 40102, "type": "holding", "min": 0, "max": 100},
            {"name": "battery_level", "address": 40103, "type": "holding", "min": 0, "max": 100},
            {"name": "input_1", "address": 40104, "type": "input", "min": 0, "max": 1024},
            {"name": "input_2", "address": 40105, "type": "input", "min": 0, "max": 1024},
            {"name": "output_1", "address": 40106, "type": "holding", "min": 0, "max": 1024},
            {"name": "output_2", "address": 40107, "type": "holding", "min": 0, "max": 1024}
        ]
    },
    "sensor": {
        "registers": [
            {"name": "value", "address": 40201, "type": "input", "min": 0, "max": 1000},
            {"name": "status", "address": 40202, "type": "coil", "min": 0, "max": 1},
            {"name": "battery", "address": 40203, "type": "holding", "min": 0, "max": 100},
            {"name": "calibration", "address": 40204, "type": "holding", "min": -50, "max": 50},
            {"name": "alert_threshold", "address": 40205, "type": "holding", "min": 0, "max": 1000}
        ]
    },
    "actuator": {
        "registers": [
            {"name": "position", "address": 40301, "type": "holding", "min": 0, "max": 100},
            {"name": "speed", "address": 40302, "type": "holding", "min": 0, "max": 100},
            {"name": "mode", "address": 40303, "type": "holding", "min": 0, "max": 3},
            {"name": "status", "address": 40304, "type": "coil", "min": 0, "max": 1},
            {"name": "fault", "address": 40305, "type": "coil", "min": 0, "max": 1}
        ]
    },
    "hmi": {
        "registers": [
            {"name": "screen_id", "address": 40401, "type": "holding", "min": 0, "max": 10},
            {"name": "alarm_count", "address": 40402, "type": "holding", "min": 0, "max": 100},
            {"name": "user_level", "address": 40403, "type": "holding", "min": 0, "max": 3},
            {"name": "backlight", "address": 40404, "type": "holding", "min": 0, "max": 100},
            {"name": "touch_x", "address": 40405, "type": "holding", "min": 0, "max": 1024},
            {"name": "touch_y", "address": 40406, "type": "holding", "min": 0, "max": 768}
        ]
    }
}

# Industrial process simulation patterns
PROCESS_PATTERNS = {
    "constant": lambda t, min_val, max_val, period: (min_val + max_val) / 2,
    "sine": lambda t, min_val, max_val, period: min_val + (max_val - min_val) * 0.5 * (1 + math.sin(2 * math.pi * t / period)),
    "triangle": lambda t, min_val, max_val, period: min_val + (max_val - min_val) * (2 * abs(((t % period) / period) - 0.5)),
    "sawtooth": lambda t, min_val, max_val, period: min_val + (max_val - min_val) * ((t % period) / period),
    "square": lambda t, min_val, max_val, period: min_val if (t % period) < (period / 2) else max_val,
    "random_walk": lambda t, min_val, max_val, period, last=None: 
                      max(min_val, min(max_val, last + random.uniform(-0.1, 0.1) * (max_val - min_val) if last is not None else (min_val + max_val) / 2))
}


class NodeRedFlowGenerator:
    """Generates Node-RED flows for MODBUS device simulation."""
    
    def __init__(self):
        self.flows = []
        self.device_id_counter = 1
        self.position_x = 100
        self.position_y = 100
        self.node_spacing = 200
        
    def create_device(self, 
                    device_type: str, 
                    unit_id: int, 
                    ip_address: str = "localhost",
                    port: int = 502) -> Dict[str, Any]:
        """
        Create a simulated ICS device
        
        Args:
            device_type: Type of device (plc, rtu, sensor, actuator, hmi)
            unit_id: MODBUS unit ID
            ip_address: IP address for the MODBUS server
            port: Port for the MODBUS server
            
        Returns:
            Device configuration dictionary
        """
        if device_type not in ICS_DEVICE_TYPES:
            raise ValueError(f"Unknown device type: {device_type}")
        
        device_id = f"device_{self.device_id_counter}"
        self.device_id_counter += 1
        
        device_config = {
            "id": device_id,
            "type": device_type,
            "unit_id": unit_id,
            "ip_address": ip_address,
            "port": port,
            "registers": ICS_DEVICE_TYPES[device_type]["registers"].copy(),
            "node_ids": {}
        }
        
        return device_config
    
    def add_modbus_server(self, 
                        port: int = 502, 
                        name: str = "MODBUS Server") -> str:
        """
        Add a MODBUS server node to the flow
        
        Args:
            port: TCP port for the server
            name: Name for the node
            
        Returns:
            ID of the created node
        """
        node_id = str(uuid.uuid4())
        server_node = {
            "id": node_id,
            "type": "modbus-server",
            "name": name,
            "port": port,
            "x": self.position_x,
            "y": self.position_y,
            "wires": []
        }
        self.flows.append(server_node)
        self.position_y += self.node_spacing
        
        return node_id
    
    def add_modbus_response(self, 
                          server_id: str, 
                          device_id: int,
                          register_type: str,
                          start_address: int,
                          count: int,
                          name: str = "MODBUS Response") -> str:
        """
        Add a MODBUS response node to the flow
        
        Args:
            server_id: ID of the MODBUS server node
            device_id: Device/Unit ID for MODBUS
            register_type: Type of register (coil, input, holding)
            start_address: Starting address
            count: Number of registers
            name: Name for the node
            
        Returns:
            ID of the created node
        """
        node_id = str(uuid.uuid4())
        response_node = {
            "id": node_id,
            "type": "modbus-response",
            "name": name,
            "moduleType": register_type,
            "registerAddress": start_address,
            "registerCount": count,
            "server": server_id,
            "deviceId": device_id,
            "x": self.position_x,
            "y": self.position_y,
            "wires": []
        }
        self.flows.append(response_node)
        self.position_y += self.node_spacing
        
        return node_id
    
    def add_function_node(self, 
                        function_code: str, 
                        name: str = "Process Function") -> str:
        """
        Add a function node to the flow
        
        Args:
            function_code: JavaScript function code
            name: Name for the node
            
        Returns:
            ID of the created node
        """
        node_id = str(uuid.uuid4())
        function_node = {
            "id": node_id,
            "type": "function",
            "name": name,
            "func": function_code,
            "outputs": 1,
            "x": self.position_x,
            "y": self.position_y,
            "wires": [[]]
        }
        self.flows.append(function_node)
        self.position_y += self.node_spacing
        
        return node_id
    
    def add_inject_node(self, 
                      repeat: str, 
                      name: str = "Trigger") -> str:
        """
        Add an inject node to the flow
        
        Args:
            repeat: Repeat interval (e.g., "1s", "5m")
            name: Name for the node
            
        Returns:
            ID of the created node
        """
        node_id = str(uuid.uuid4())
        inject_node = {
            "id": node_id,
            "type": "inject",
            "name": name,
            "props": [
                {"p": "payload"}
            ],
            "repeat": repeat,
            "crontab": "",
            "once": True,
            "x": self.position_x,
            "y": self.position_y,
            "wires": [[]]
        }
        self.flows.append(inject_node)
        self.position_y += self.node_spacing
        
        return node_id
    
    def add_debug_node(self, name: str = "Debug") -> str:
        """
        Add a debug node to the flow
        
        Args:
            name: Name for the node
            
        Returns:
            ID of the created node
        """
        node_id = str(uuid.uuid4())
        debug_node = {
            "id": node_id,
            "type": "debug",
            "name": name,
            "active": True,
            "x": self.position_x + self.node_spacing,
            "y": self.position_y,
            "wires": []
        }
        self.flows.append(debug_node)
        
        return node_id
    
    def connect_nodes(self, source_id: str, target_id: str, output_idx: int = 0):
        """
        Connect two nodes in the flow
        
        Args:
            source_id: ID of the source node
            target_id: ID of the target node
            output_idx: Index of the output to connect
        """
        for node in self.flows:
            if node["id"] == source_id and "wires" in node:
                # Ensure the output index exists
                while len(node["wires"]) <= output_idx:
                    node["wires"].append([])
                    
                # Add the target to the wires
                node["wires"][output_idx].append(target_id)
                return
    
    def generate_process_function(self, 
                               register: Dict[str, Any], 
                               pattern: str = "sine",
                               period: int = 60) -> str:
        """
        Generate a JavaScript function for simulating register values
        
        Args:
            register: Register configuration
            pattern: Process pattern name
            period: Period in seconds
            
        Returns:
            JavaScript function code
        """
        min_val = register["min"]
        max_val = register["max"]
        
        code = f"""// Simulate {register["name"]} with {pattern} pattern
var now = new Date().getTime() / 1000;
var min = {min_val};
var max = {max_val};
var period = {period};
var t = now % period;
var value;

// Store previous value in flow context
var prevValue = flow.get("prev_{register["name"]}") || null;

"""
        
        if pattern == "constant":
            code += f"value = {(min_val + max_val) / 2};\n"
        elif pattern == "sine":
            code += f"value = min + (max - min) * 0.5 * (1 + Math.sin(2 * Math.PI * t / period));\n"
        elif pattern == "triangle":
            code += f"value = min + (max - min) * (2 * Math.abs(((t % period) / period) - 0.5));\n"
        elif pattern == "sawtooth":
            code += f"value = min + (max - min) * ((t % period) / period);\n"
        elif pattern == "square":
            code += f"value = (t < period/2) ? min : max;\n"
        elif pattern == "random_walk":
            code += """
// Random walk with constraints
if (prevValue === null) {
    value = (min + max) / 2;
} else {
    var step = (max - min) * 0.1 * (Math.random() - 0.5);
    value = Math.max(min, Math.min(max, prevValue + step));
}
"""
        else:
            code += f"value = (min + max) / 2; // Default to constant\n"
            
        # Add randomness for discrete values
        if register["type"] == "coil":
            code += """
// For coil, introduce random changes
if (Math.random() < 0.01) { // 1% chance to change state
    value = (value > 0.5) ? 0 : 1;
}
"""
        elif max_val - min_val < 10:  # Small range like mode
            code += """
// For small ranges, make discrete jumps
if (Math.random() < 0.05) { // 5% chance to change
    value = min + Math.floor(Math.random() * (max - min + 1));
}
"""
            
        # Add occasional anomalies
        code += """
// Add anomalies (1% chance)
if (Math.random() < 0.01) {
    if (Math.random() < 0.5) {
        // Spike
        value = max;
    } else {
        // Drop
        value = min;
    }
}
"""
        
        # Round the value appropriately
        if register["type"] == "coil":
            code += "value = Math.round(value);\n"
        elif max_val - min_val < 10:
            code += "value = Math.round(value);\n"
        else:
            code += "value = Math.round(value * 100) / 100;\n"
            
        # Store current value for next iteration
        code += f"""
// Store value for next time
flow.set("prev_{register["name"]}", value);

// Set payload and pass through
msg.payload = value;
return msg;
"""
        
        return code
        
    def create_device_simulation(self, 
                               device_config: Dict[str, Any],
                               update_interval: str = "1s") -> None:
        """
        Create a complete device simulation flow
        
        Args:
            device_config: Device configuration
            update_interval: How often to update register values
        """
        # Create a new sub-flow for this device
        self.position_x = 100
        self.position_y = 100 + (self.device_id_counter - 2) * 300  # Space devices vertically
        
        # Add a MODBUS server
        server_id = self.add_modbus_server(
            port=device_config["port"],
            name=f"MODBUS Server ({device_config['type']} {device_config['unit_id']})"
        )
        
        # For each register, create the simulation
        for i, register in enumerate(device_config["registers"]):
            # Create new column for each register
            self.position_x = 100 + i * 250
            self.position_y = 100 + (self.device_id_counter - 2) * 300
            
            # Select a pattern appropriate for this register
            if register["name"] in ["status", "alarm", "fault"]:
                pattern = "square"
                period = random.randint(30, 300)  # Status changes less frequently
            elif register["name"] in ["mode", "screen_id", "user_level"]:
                pattern = "constant"  # These tend to stay constant longer
                period = 3600
            elif register["name"] in ["temperature", "pressure", "flow_rate"]:
                pattern = random.choice(["sine", "triangle", "random_walk"])
                period = random.randint(60, 180)  # Process variables change over minutes
            else:
                pattern = random.choice(list(PROCESS_PATTERNS.keys()))
                period = random.randint(30, 120)
                
            # Create an inject node to trigger updates
            inject_id = self.add_inject_node(
                repeat=update_interval,
                name=f"Update {register['name']}"
            )
            
            # Create a function to simulate the value
            function_id = self.add_function_node(
                function_code=self.generate_process_function(register, pattern, period),
                name=f"Simulate {register['name']}"
            )
            
            # Connect the inject to the function
            self.connect_nodes(inject_id, function_id)
            
            # Create a MODBUS response node
            response_id = self.add_modbus_response(
                server_id=server_id,
                device_id=device_config["unit_id"],
                register_type=register["type"],
                start_address=register["address"],
                count=1,
                name=f"Set {register['name']} (Addr: {register['address']})"
            )
            
            # Connect the function to the response
            self.connect_nodes(function_id, response_id)
            
            # Add a debug node
            debug_id = self.add_debug_node(name=f"Debug {register['name']}")
            
            # Connect the function to the debug
            self.connect_nodes(function_id, debug_id)
            
            # Store the node IDs
            device_config["node_ids"][register["name"]] = {
                "inject": inject_id,
                "function": function_id,
                "response": response_id,
                "debug": debug_id
            }
    
    def generate_flow(self, 
                    num_devices: int = 3, 
                    port_start: int = 502,
                    update_interval: str = "1s") -> Dict[str, Any]:
        """
        Generate a complete Node-RED flow with multiple devices
        
        Args:
            num_devices: Number of devices to create
            port_start: Starting port number
            update_interval: How often to update register values
            
        Returns:
            Complete Node-RED flow definition
        """
        devices = []
        
        # Create desired number of devices
        for i in range(num_devices):
            # Select a device type
            device_type = random.choice(list(ICS_DEVICE_TYPES.keys()))
            
            # Create device with incrementing unit ID and port
            device_config = self.create_device(
                device_type=device_type,
                unit_id=i+1,
                port=port_start+i
            )
            
            # Create the simulation flow
            self.create_device_simulation(
                device_config=device_config,
                update_interval=update_interval
            )
            
            devices.append(device_config)
            
        # Add a tab object
        tab_id = str(uuid.uuid4())
        tab = {
            "id": tab_id,
            "type": "tab",
            "label": "ICS Simulation",
            "disabled": False,
            "info": "ICS MODBUS device simulation"
        }
        
        # Add to the start of the flow
        self.flows.insert(0, tab)
        
        # Set the tab property for all nodes
        for node in self.flows[1:]:
            node["z"] = tab_id
            
        return {
            "flows": self.flows,
            "devices": devices
        }
    
    def save_flow(self, filename: str, flow_data: Dict[str, Any]) -> None:
        """
        Save the flow to a file
        
        Args:
            filename: Output filename
            flow_data: Flow data to save
        """
        with open(filename, 'w') as f:
            json.dump(flow_data["flows"], f, indent=2)
            
        print(f"Saved Node-RED flow to {filename}")
        print(f"Generated {len(flow_data['devices'])} simulated devices:")
        for device in flow_data['devices']:
            print(f"  - {device['type']} (Unit ID: {device['unit_id']}, Port: {device['port']})")


def main():
    """Main function to generate Node-RED flows."""
    parser = argparse.ArgumentParser(description='Generate Node-RED flows for MODBUS simulation')
    parser.add_argument('--output', type=str, default='node-red-flows.json',
                      help='Output filename for Node-RED flow JSON')
    parser.add_argument('--devices', type=int, default=3,
                      help='Number of devices to simulate')
    parser.add_argument('--port-start', type=int, default=502,
                      help='Starting port number')
    parser.add_argument('--update-interval', type=str, default='1s',
                      help='Update interval (e.g. 1s, 500ms, 5m)')
    
    args = parser.parse_args()
    
    # Generate the flow
    generator = NodeRedFlowGenerator()
    flow_data = generator.generate_flow(
        num_devices=args.devices,
        port_start=args.port_start,
        update_interval=args.update_interval
    )
    
    # Save to file
    generator.save_flow(args.output, flow_data)
    

if __name__ == "__main__":
    main() 