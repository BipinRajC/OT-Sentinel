"""
Industrial Process Data Integration
Parsed from ScadaBR configuration for OT Security Dashboard
"""

from datetime import datetime, timedelta
import random
import json

# Industrial Process Configuration
INDUSTRIAL_CONFIG = {
    "process_name": "TenEast Chemical Process",
    "data_source": {
        "name": "TenEast",
        "type": "MODBUS_IP",
        "host": "192.168.95.2",
        "port": 502,
        "slave_id": 1,
        "update_period": 200
    },
    "process_points": [
        {
            "xid": "DP_909767",
            "name": "AValve",
            "description": "Feed1 Control Valve A",
            "unit": "%",
            "type": "valve_position",
            "normal_range": [0, 100],
            "critical_threshold": 95,
            "modbus_register": 0
        },
        {
            "xid": "DP_399996", 
            "name": "ProductValve",
            "description": "Product Output Control Valve",
            "unit": "%",
            "type": "valve_position",
            "normal_range": [0, 100],
            "critical_threshold": 95,
            "modbus_register": 6
        },
        {
            "xid": "DP_253175",
            "name": "AFlow",
            "description": "Feed1 Flow Rate",
            "unit": "kMol/h",
            "type": "flow_rate",
            "normal_range": [0, 500],
            "critical_threshold": 450,
            "modbus_register": 1
        },
        {
            "xid": "DP_481174",
            "name": "ProductFlow",
            "description": "Product Output Flow Rate",
            "unit": "kMol/h", 
            "type": "flow_rate",
            "normal_range": [0, 500],
            "critical_threshold": 450,
            "modbus_register": 7
        },
        {
            "xid": "DP_292928",
            "name": "BValve",
            "description": "Feed2 Control Valve B",
            "unit": "%",
            "type": "valve_position",
            "normal_range": [0, 100],
            "critical_threshold": 95,
            "modbus_register": 2
        },
        {
            "xid": "DP_876667",
            "name": "BFlow",
            "description": "Feed2 Flow Rate",
            "unit": "kMol/h",
            "type": "flow_rate",
            "normal_range": [0, 500],
            "critical_threshold": 450,
            "modbus_register": 3
        },
        {
            "xid": "DP_490067",
            "name": "PurgeValve",
            "description": "Purge Control Valve",
            "unit": "%",
            "type": "valve_position",
            "normal_range": [0, 100],
            "critical_threshold": 95,
            "modbus_register": 4
        },
        {
            "xid": "DP_313787",
            "name": "PurgeFlow",
            "description": "Purge Flow Rate",
            "unit": "kMol/h",
            "type": "flow_rate",
            "normal_range": [0, 200],
            "critical_threshold": 180,
            "modbus_register": 5
        },
        {
            "xid": "DP_159283",
            "name": "Pressure",
            "description": "Reactor Pressure",
            "unit": "kPa",
            "type": "pressure",
            "normal_range": [100, 1000],
            "critical_threshold": 950,
            "modbus_register": 8
        },
        {
            "xid": "DP_816839",
            "name": "Level",
            "description": "Reactor Level",
            "unit": "%",
            "type": "level",
            "normal_range": [10, 90],
            "critical_threshold": 85,
            "modbus_register": 9
        },
        {
            "xid": "DP_653712",
            "name": "AComp",
            "description": "Component A Concentration",
            "unit": "%",
            "type": "composition",
            "normal_range": [0, 100],
            "critical_threshold": 95,
            "modbus_register": 10
        },
        {
            "xid": "DP_991399",
            "name": "BComp",
            "description": "Component B Concentration", 
            "unit": "%",
            "type": "composition",
            "normal_range": [0, 100],
            "critical_threshold": 95,
            "modbus_register": 11
        },
        {
            "xid": "DP_133416",
            "name": "CComp",
            "description": "Component C Concentration",
            "unit": "%",
            "type": "composition",
            "normal_range": [0, 100],
            "critical_threshold": 95,
            "modbus_register": 12
        },
        {
            "xid": "DP_182355",
            "name": "Run",
            "description": "Process Run Status",
            "unit": "bool",
            "type": "digital_control",
            "normal_range": [0, 1],
            "critical_threshold": None,
            "modbus_register": 40
        }
    ]
}

class IndustrialDataGenerator:
    """Generate realistic industrial process data"""
    
    def __init__(self):
        self.current_values = {}
        self.trends = {}
        self.process_running = True
        self.initialize_values()
    
    def initialize_values(self):
        """Initialize all process values"""
        for point in INDUSTRIAL_CONFIG["process_points"]:
            if point["type"] == "digital_control":
                self.current_values[point["xid"]] = True
            else:
                # Start with values in middle of normal range
                min_val, max_val = point["normal_range"]
                self.current_values[point["xid"]] = (min_val + max_val) / 2
                self.trends[point["xid"]] = random.choice([-1, 0, 1])
    
    def update_values(self):
        """Update all process values with realistic trends"""
        process_running = self.current_values.get("DP_182355", True)
        
        for point in INDUSTRIAL_CONFIG["process_points"]:
            xid = point["xid"]
            if point["type"] == "digital_control":
                continue
                
            current = self.current_values[xid]
            min_val, max_val = point["normal_range"]
            
            if not process_running:
                # Process stopped - values drift to safe levels
                if point["type"] in ["valve_position", "flow_rate"]:
                    target = min_val
                else:
                    target = (min_val + max_val) / 2
                self.current_values[xid] = current * 0.95 + target * 0.05
            else:
                # Normal operation with realistic process dynamics
                variation = self.get_variation(point["type"])
                trend = self.trends[xid]
                
                # Add process correlations
                if point["name"] == "AFlow":
                    valve_pos = self.current_values.get("DP_909767", 50)
                    target = valve_pos * 4.5  # Flow proportional to valve
                elif point["name"] == "BFlow":
                    valve_pos = self.current_values.get("DP_292928", 50)
                    target = valve_pos * 4.5
                elif point["name"] == "ProductFlow":
                    valve_pos = self.current_values.get("DP_399996", 50)
                    a_flow = self.current_values.get("DP_253175", 0)
                    b_flow = self.current_values.get("DP_876667", 0)
                    target = min(valve_pos * 4.5, (a_flow + b_flow) * 0.8)
                elif point["name"] == "Pressure":
                    # Pressure affected by flows
                    total_in = (self.current_values.get("DP_253175", 0) + 
                               self.current_values.get("DP_876667", 0))
                    total_out = (self.current_values.get("DP_481174", 0) + 
                                self.current_values.get("DP_313787", 0))
                    if total_in > total_out:
                        trend = 1
                    elif total_in < total_out:
                        trend = -1
                    target = current + trend * variation
                else:
                    target = current + trend * variation
                
                # Apply change
                new_value = current * 0.9 + target * 0.1
                
                # Keep in bounds
                new_value = max(min_val, min(max_val, new_value))
                self.current_values[xid] = new_value
                
                # Randomly change trend
                if random.random() < 0.1:
                    self.trends[xid] = random.choice([-1, 0, 1])
    
    def get_variation(self, point_type):
        """Get typical variation for different point types"""
        variations = {
            "valve_position": 2.0,
            "flow_rate": 15.0,
            "pressure": 25.0,
            "level": 1.5,
            "composition": 3.0
        }
        return variations.get(point_type, 1.0)
    
    def get_current_data(self):
        """Get current process data"""
        self.update_values()
        
        data = []
        for point in INDUSTRIAL_CONFIG["process_points"]:
            xid = point["xid"]
            value = self.current_values[xid]
            
            # Check for alarms
            alarm_status = "normal"
            if point["critical_threshold"] and value > point["critical_threshold"]:
                alarm_status = "critical"
            elif point["critical_threshold"] and value > point["critical_threshold"] * 0.8:
                alarm_status = "warning"
            
            data.append({
                "id": xid,
                "name": point["name"],
                "description": point["description"],
                "value": round(value, 2) if point["type"] != "digital_control" else bool(value),
                "unit": point["unit"],
                "type": point["type"],
                "alarm_status": alarm_status,
                "timestamp": datetime.utcnow().isoformat(),
                "register": point["modbus_register"]
            })
        
        return data
    
    def generate_alerts(self):
        """Generate process alerts based on current conditions"""
        alerts = []
        current_data = self.get_current_data()
        
        for point_data in current_data:
            if point_data["alarm_status"] == "critical":
                alerts.append({
                    "id": f"ALERT_{point_data['id']}_{int(datetime.utcnow().timestamp())}",
                    "device_id": "industrial_process",
                    "device_ip": "192.168.95.2",
                    "alert_type": f"Critical {point_data['type'].replace('_', ' ').title()}",
                    "severity": "critical",
                    "description": f"{point_data['description']} exceeded critical threshold: {point_data['value']} {point_data['unit']}",
                    "timestamp": datetime.utcnow().isoformat(),
                    "acknowledged": False,
                    "point_name": point_data["name"]
                })
            elif point_data["alarm_status"] == "warning":
                alerts.append({
                    "id": f"WARN_{point_data['id']}_{int(datetime.utcnow().timestamp())}",
                    "device_id": "industrial_process", 
                    "device_ip": "192.168.95.2",
                    "alert_type": f"High {point_data['type'].replace('_', ' ').title()}",
                    "severity": "high",
                    "description": f"{point_data['description']} approaching critical level: {point_data['value']} {point_data['unit']}",
                    "timestamp": datetime.utcnow().isoformat(),
                    "acknowledged": False,
                    "point_name": point_data["name"]
                })
        
        return alerts

# Global instance
industrial_generator = IndustrialDataGenerator()

# Industrial Control System Data
# TenEast Process Control System Configuration

INDUSTRIAL_DATA = {
    "graphicalViews": [
        {
            "user": "admin",
            "anonymousAccess": "NONE",
            "viewComponents": [
                {
                    "type": "SCRIPT",
                    "dataPointXid": "DP_399996",
                    "bkgdColorOverride": "",
                    "displayControls": False,
                    "nameOverride": "",
                    "script": "return(value.toFixed(1) + \"%\");",
                    "settableOverride": False,
                    "x": 767,
                    "y": 320
                },
                {
                    "type": "SCRIPT",
                    "dataPointXid": "DP_481174",
                    "bkgdColorOverride": "",
                    "displayControls": False,
                    "nameOverride": "",
                    "script": "return(value.toFixed(1) + \" kMol/h\");",
                    "settableOverride": False,
                    "x": 650,
                    "y": 350
                },
                {
                    "type": "SCRIPT",
                    "dataPointXid": "DP_253175",
                    "bkgdColorOverride": "",
                    "displayControls": False,
                    "nameOverride": "",
                    "script": "return(value.toFixed(1) + \" kMol/h\");",
                    "settableOverride": False,
                    "x": 220,
                    "y": 351
                },
                {
                    "type": "SCRIPT",
                    "dataPointXid": "DP_909767",
                    "bkgdColorOverride": "",
                    "displayControls": False,
                    "nameOverride": "",
                    "script": "return(value.toFixed(1) + \"%\");",
                    "settableOverride": False,
                    "x": 145,
                    "y": 319
                },
                {
                    "type": "SCRIPT",
                    "dataPointXid": "DP_876667",
                    "bkgdColorOverride": "",
                    "displayControls": False,
                    "nameOverride": "",
                    "script": "return(value.toFixed(1) + \" kMol/h\");",
                    "settableOverride": False,
                    "x": 220,
                    "y": 264
                },
                {
                    "type": "SCRIPT",
                    "dataPointXid": "DP_292928",
                    "bkgdColorOverride": "",
                    "displayControls": False,
                    "nameOverride": "",
                    "script": "return(value.toFixed(1) + \"%\");",
                    "settableOverride": False,
                    "x": 144,
                    "y": 233
                },
                {
                    "type": "SCRIPT",
                    "dataPointXid": "DP_816839",
                    "bkgdColorOverride": "",
                    "displayControls": False,
                    "nameOverride": "",
                    "script": "return(\"Level: \" + value.toFixed(1) + \"%\");",
                    "settableOverride": False,
                    "x": 437,
                    "y": 328
                },
                {
                    "type": "SCRIPT",
                    "dataPointXid": "DP_159283",
                    "bkgdColorOverride": "",
                    "displayControls": False,
                    "nameOverride": "",
                    "script": "return(\"Pressure: \" + value.toFixed(1) + \" kPa\");",
                    "settableOverride": False,
                    "x": 419,
                    "y": 305
                },
                {
                    "type": "SCRIPT",
                    "dataPointXid": "DP_313787",
                    "bkgdColorOverride": "",
                    "displayControls": False,
                    "nameOverride": "",
                    "script": "return(value.toFixed(1) + \" kMol/h\");",
                    "settableOverride": False,
                    "x": 653,
                    "y": 264
                },
                {
                    "type": "SCRIPT",
                    "dataPointXid": "DP_490067",
                    "bkgdColorOverride": "",
                    "displayControls": False,
                    "nameOverride": "",
                    "script": "return(value.toFixed(1) + \"%\");",
                    "settableOverride": False,
                    "x": 760,
                    "y": 237
                },
                {
                    "type": "HTML",
                    "content": "Purge",
                    "x": 882,
                    "y": 284
                },
                {
                    "type": "HTML",
                    "content": "Product",
                    "x": 880,
                    "y": 372
                },
                {
                    "type": "HTML",
                    "content": "Feed1",
                    "x": 36,
                    "y": 286
                },
                {
                    "type": "HTML",
                    "content": "Feed2",
                    "x": 38,
                    "y": 374
                },
                {
                    "type": "BINARY_GRAPHIC",
                    "dataPointXid": "DP_182355",
                    "imageSet": "Leds32",
                    "bkgdColorOverride": "",
                    "displayControls": False,
                    "displayText": False,
                    "nameOverride": "",
                    "oneImageIndex": 8,
                    "settableOverride": False,
                    "x": 668,
                    "y": 49,
                    "zeroImageIndex": 4
                },
                {
                    "type": "BUTTON",
                    "dataPointXid": "DP_182355",
                    "bkgdColorOverride": "",
                    "displayControls": False,
                    "height": 0,
                    "nameOverride": "",
                    "script": "var s = '';if (value)  s += \"<input type='button' value='STOP' onclick='mango.view.setPoint(\"+ point.id +\",\"+ pointComponent.id +\", false);return false;' />\"; else s += \"<input type='button' value='START' onclick='mango.view.setPoint(\"+ point.id +\",\"+ pointComponent.id +\", true);return true;' />\"; return s;",
                    "settableOverride": False,
                    "whenOffLabel": "START",
                    "whenOnLabel": "STOP",
                    "width": 0,
                    "x": 666,
                    "y": 89
                }
            ],
            "sharingUsers": [],
            "name": "TenEastView1",
            "xid": "GV_910998"
        }
    ],
    "dataSources": [
        {
            "xid": "DS_939670",
            "type": "MODBUS_IP",
            "alarmLevels": {
                "DATA_SOURCE_EXCEPTION": "URGENT",
                "POINT_READ_EXCEPTION": "URGENT",
                "POINT_WRITE_EXCEPTION": "URGENT"
            },
            "updatePeriodType": "MILLISECONDS",
            "transportType": "TCP",
            "contiguousBatches": False,
            "createSlaveMonitorPoints": False,
            "enabled": True,
            "encapsulated": False,
            "host": "192.168.95.2",
            "maxReadBitCount": 2000,
            "maxReadRegisterCount": 125,
            "maxWriteRegisterCount": 120,
            "name": "TenEast",
            "port": 502,
            "quantize": False,
            "retries": 2,
            "timeout": 500,
            "updatePeriods": 200
        }
    ],
    "dataPoints": [
        {
            "xid": "DP_909767",
            "name": "AValve",
            "deviceName": "TenEast",
            "engineeringUnits": "%",
            "enabled": True,
            "pointLocator": {
                "range": "INPUT_REGISTER",
                "modbusDataType": "TWO_BYTE_INT_UNSIGNED",
                "multiplier": 0.0015259022,
                "offset": 0,
                "slaveId": 1
            }
        },
        {
            "xid": "DP_399996",
            "name": "ProductValve",
            "deviceName": "TenEast",
            "engineeringUnits": "%",
            "enabled": True,
            "pointLocator": {
                "range": "INPUT_REGISTER",
                "modbusDataType": "TWO_BYTE_INT_UNSIGNED",
                "multiplier": 0.0015259022,
                "offset": 6,
                "slaveId": 1
            }
        },
        {
            "xid": "DP_253175",
            "name": "AFlow",
            "deviceName": "TenEast",
            "engineeringUnits": "kMol/h",
            "enabled": True,
            "pointLocator": {
                "range": "INPUT_REGISTER",
                "modbusDataType": "TWO_BYTE_INT_UNSIGNED",
                "multiplier": 0.00762951,
                "offset": 1,
                "slaveId": 1
            }
        },
        {
            "xid": "DP_481174",
            "name": "ProductFlow",
            "deviceName": "TenEast",
            "engineeringUnits": "kMol/h",
            "enabled": True,
            "pointLocator": {
                "range": "INPUT_REGISTER",
                "modbusDataType": "TWO_BYTE_INT_UNSIGNED",
                "multiplier": 0.00762951,
                "offset": 7,
                "slaveId": 1
            }
        },
        {
            "xid": "DP_292928",
            "name": "BValve",
            "deviceName": "TenEast",
            "engineeringUnits": "%",
            "enabled": True,
            "pointLocator": {
                "range": "INPUT_REGISTER",
                "modbusDataType": "TWO_BYTE_INT_UNSIGNED",
                "multiplier": 0.0015259022,
                "offset": 2,
                "slaveId": 1
            }
        },
        {
            "xid": "DP_876667",
            "name": "BFlow",
            "deviceName": "TenEast",
            "engineeringUnits": "kMol/h",
            "enabled": True,
            "pointLocator": {
                "range": "INPUT_REGISTER",
                "modbusDataType": "TWO_BYTE_INT_UNSIGNED",
                "multiplier": 0.00762951,
                "offset": 3,
                "slaveId": 1
            }
        },
        {
            "xid": "DP_490067",
            "name": "PurgeValve",
            "deviceName": "TenEast",
            "engineeringUnits": "%",
            "enabled": True,
            "pointLocator": {
                "range": "INPUT_REGISTER",
                "modbusDataType": "TWO_BYTE_INT_UNSIGNED",
                "multiplier": 0.0015259022,
                "offset": 4,
                "slaveId": 1
            }
        },
        {
            "xid": "DP_313787",
            "name": "PurgeFlow",
            "deviceName": "TenEast",
            "engineeringUnits": "kMol/h",
            "enabled": True,
            "pointLocator": {
                "range": "INPUT_REGISTER",
                "modbusDataType": "TWO_BYTE_INT_UNSIGNED",
                "multiplier": 0.00762951,
                "offset": 5,
                "slaveId": 1
            }
        },
        {
            "xid": "DP_159283",
            "name": "Pressure",
            "deviceName": "TenEast",
            "engineeringUnits": "kPa",
            "enabled": True,
            "pointLocator": {
                "range": "INPUT_REGISTER",
                "modbusDataType": "TWO_BYTE_INT_UNSIGNED",
                "multiplier": 0.04882887,
                "offset": 8,
                "slaveId": 1
            }
        },
        {
            "xid": "DP_816839",
            "name": "Level",
            "deviceName": "TenEast",
            "engineeringUnits": "%",
            "enabled": True,
            "pointLocator": {
                "range": "INPUT_REGISTER",
                "modbusDataType": "TWO_BYTE_INT_UNSIGNED",
                "multiplier": 0.0015259022,
                "offset": 9,
                "slaveId": 1
            }
        },
        {
            "xid": "DP_653712",
            "name": "AComp",
            "deviceName": "TenEast",
            "engineeringUnits": "%",
            "enabled": True,
            "pointLocator": {
                "range": "INPUT_REGISTER",
                "modbusDataType": "TWO_BYTE_INT_UNSIGNED",
                "multiplier": 0.0015259022,
                "offset": 10,
                "slaveId": 1
            }
        },
        {
            "xid": "DP_991399",
            "name": "BComp",
            "deviceName": "TenEast",
            "engineeringUnits": "%",
            "enabled": True,
            "pointLocator": {
                "range": "INPUT_REGISTER",
                "modbusDataType": "TWO_BYTE_INT_UNSIGNED",
                "multiplier": 0.0015259022,
                "offset": 11,
                "slaveId": 1
            }
        },
        {
            "xid": "DP_133416",
            "name": "CComp",
            "deviceName": "TenEast",
            "engineeringUnits": "%",
            "enabled": True,
            "pointLocator": {
                "range": "INPUT_REGISTER",
                "modbusDataType": "TWO_BYTE_INT_UNSIGNED",
                "multiplier": 0.0015259022,
                "offset": 12,
                "slaveId": 1
            }
        },
        {
            "xid": "DP_182355",
            "name": "Run",
            "deviceName": "TenEast",
            "engineeringUnits": "",
            "enabled": True,
            "pointLocator": {
                "range": "COIL_STATUS",
                "modbusDataType": "BINARY",
                "multiplier": 1.0,
                "offset": 40,
                "slaveId": 1,
                "settableOverride": True
            }
        }
    ],
    "users": [
        {
            "admin": True,
            "disabled": False,
            "email": "admin@yourMangoDomain.com",
            "homeUrl": "views.shtm",
            "password": "0DPiKuNIrrVmD8IUCuw1hQxNqZc=",
            "phone": "",
            "receiveOwnAuditEvents": False,
            "username": "admin"
        }
    ],
    "watchLists": [
        {
            "xid": "WL_218386",
            "user": "admin",
            "dataPoints": [
                "DP_816839", "DP_159283", "DP_253175", "DP_909767",
                "DP_876667", "DP_292928", "DP_481174", "DP_399996",
                "DP_313787", "DP_490067", "DP_653712", "DP_991399", "DP_133416"
            ],
            "sharingUsers": [],
            "name": "TenEastHistory"
        }
    ]
}
