#!/usr/bin/env python3
"""
ARFF Data Service for ICS Security Monitoring System.
Fetches real-time data from University of Alabama ICS dataset.
"""

import asyncio
import csv
import json
import logging
import os
import re
import time
from datetime import datetime
from io import StringIO
from typing import Dict, List, Any, Optional
import requests
import redis

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('arff_data_service')

class ARFFDataService:
    """Service for fetching and managing ARFF industrial data."""
    
    def __init__(self):
        """Initialize ARFF data service."""
        self.data_url = "http://www.ece.uah.edu/~thm0009/icsdatasets/gas_final.arff"
        self.data_rows = []
        self.current_index = 0
        self.attributes = []
        self.relation_name = ""
        self.running = False
        self.fetch_interval = float(os.getenv('ARFF_FETCH_INTERVAL', 1.0))  # seconds
        
        # Redis for real-time updates
        self.redis_client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            db=int(os.getenv('REDIS_DB', 0)),
            decode_responses=True
        )
        
        # Attribute mappings for industrial system interpretation
        self.attribute_mappings = {
            'command_address': {'name': 'Command Address', 'unit': 'addr', 'type': 'communication'},
            'response_address': {'name': 'Response Address', 'unit': 'addr', 'type': 'communication'},
            'command_memory': {'name': 'Command Memory', 'unit': 'bytes', 'type': 'memory'},
            'response_memory': {'name': 'Response Memory', 'unit': 'bytes', 'type': 'memory'},
            'command_memory_count': {'name': 'Command Memory Count', 'unit': 'count', 'type': 'memory'},
            'response_memory_count': {'name': 'Response Memory Count', 'unit': 'count', 'type': 'memory'},
            'comm_read_function': {'name': 'Communication Read Function', 'unit': 'func', 'type': 'communication'},
            'comm_write_fun': {'name': 'Communication Write Function', 'unit': 'func', 'type': 'communication'},
            'resp_read_fun': {'name': 'Response Read Function', 'unit': 'func', 'type': 'communication'},
            'resp_write_fun': {'name': 'Response Write Function', 'unit': 'func', 'type': 'communication'},
            'sub_function': {'name': 'Sub Function', 'unit': 'func', 'type': 'communication'},
            'command_length': {'name': 'Command Length', 'unit': 'bytes', 'type': 'communication'},
            'resp_length': {'name': 'Response Length', 'unit': 'bytes', 'type': 'communication'},
            'gain': {'name': 'Control Gain', 'unit': 'ratio', 'type': 'control'},
            'reset': {'name': 'Reset Value', 'unit': 'value', 'type': 'control'},
            'deadband': {'name': 'Deadband', 'unit': 'value', 'type': 'control'},
            'cycletime': {'name': 'Cycle Time', 'unit': 'sec', 'type': 'timing'},
            'rate': {'name': 'Process Rate', 'unit': 'rate', 'type': 'process'},
            'setpoint': {'name': 'Control Setpoint', 'unit': 'value', 'type': 'control'},
            'control_mode': {'name': 'Control Mode', 'unit': 'mode', 'type': 'control'},
            'control_scheme': {'name': 'Control Scheme', 'unit': 'scheme', 'type': 'control'},
            'pump': {'name': 'Pump Status', 'unit': 'status', 'type': 'actuator'},
            'solenoid': {'name': 'Solenoid Status', 'unit': 'status', 'type': 'actuator'},
            'crc_rate': {'name': 'CRC Rate', 'unit': 'rate', 'type': 'communication'},
            'measurement': {'name': 'Process Measurement', 'unit': 'value', 'type': 'sensor'},
            'time': {'name': 'Time Value', 'unit': 'time', 'type': 'timing'},
            'result': {'name': 'System State', 'unit': 'state', 'type': 'status'}
        }
        
        # Result state interpretations
        self.result_states = {
            '0': {'name': 'Normal Operation', 'severity': 'info', 'color': '#4CAF50'},
            '1': {'name': 'Minor Deviation', 'severity': 'low', 'color': '#FF9800'},
            '2': {'name': 'Communication Issue', 'severity': 'medium', 'color': '#FF5722'},
            '3': {'name': 'Control Anomaly', 'severity': 'medium', 'color': '#FF5722'},
            '4': {'name': 'Process Warning', 'severity': 'high', 'color': '#F44336'},
            '5': {'name': 'Security Alert', 'severity': 'critical', 'color': '#E91E63'},
            '6': {'name': 'System Error', 'severity': 'high', 'color': '#F44336'},
            '7': {'name': 'Critical Failure', 'severity': 'critical', 'color': '#B71C1C'}
        }
    
    async def fetch_arff_data(self) -> bool:
        """Fetch and parse ARFF data from the remote URL."""
        try:
            logger.info(f"Fetching ARFF data from {self.data_url}")
            
            # Download the ARFF file
            response = requests.get(self.data_url, timeout=30)
            response.raise_for_status()
            
            # Parse ARFF content
            content = response.text
            return self.parse_arff_content(content)
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching ARFF data: {e}")
            return False
        except Exception as e:
            logger.error(f"Error processing ARFF data: {e}")
            return False
    
    def parse_arff_content(self, content: str) -> bool:
        """Parse ARFF file content."""
        try:
            lines = content.strip().split('\n')
            
            # Parse header
            data_section = False
            self.attributes = []
            
            for line in lines:
                line = line.strip()
                
                if line.startswith('@relation'):
                    self.relation_name = line.split(' ', 1)[1]
                    logger.info(f"Parsing relation: {self.relation_name}")
                
                elif line.startswith('@attribute'):
                    # Parse attribute definition
                    # Format: @attribute 'name' type or @attribute name type
                    match = re.match(r"@attribute\s+(?:'([^']+)'|(\S+))\s+(.+)", line)
                    if match:
                        attr_name = match.group(1) or match.group(2)
                        attr_type = match.group(3)
                        self.attributes.append({
                            'name': attr_name,
                            'type': attr_type,
                            'mapping': self.attribute_mappings.get(attr_name, {
                                'name': attr_name.replace('_', ' ').title(),
                                'unit': 'value',
                                'type': 'general'
                            })
                        })
                
                elif line.startswith('@data'):
                    data_section = True
                    continue
                
                elif data_section and line and not line.startswith('%'):
                    # Parse data row
                    values = [val.strip() for val in line.split(',')]
                    if len(values) == len(self.attributes):
                        row_data = {}
                        for i, value in enumerate(values):
                            attr = self.attributes[i]
                            # Convert numeric values
                            try:
                                if attr['type'] == 'real':
                                    row_data[attr['name']] = float(value)
                                else:
                                    row_data[attr['name']] = value
                            except ValueError:
                                row_data[attr['name']] = value
                        
                        self.data_rows.append(row_data)
            
            logger.info(f"Parsed {len(self.data_rows)} data rows with {len(self.attributes)} attributes")
            return len(self.data_rows) > 0
            
        except Exception as e:
            logger.error(f"Error parsing ARFF content: {e}")
            return False
    
    async def get_next_data_point(self) -> Dict[str, Any]:
        """Get the next data point from the dataset."""
        if not self.data_rows:
            logger.warning("No data rows available")
            return {}
        
        # Get current data point
        current_data = self.data_rows[self.current_index].copy()
        
        # Add metadata
        enriched_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'data_index': self.current_index,
            'total_rows': len(self.data_rows),
            'relation': self.relation_name,
            'raw_data': current_data,
            'processed_data': {},
            'system_state': {},
            'alerts': []
        }
        
        # Process and enrich data
        for attr_name, value in current_data.items():
            attr_info = None
            for attr in self.attributes:
                if attr['name'] == attr_name:
                    attr_info = attr
                    break
            
            if attr_info:
                processed_value = {
                    'value': value,
                    'display_name': attr_info['mapping']['name'],
                    'unit': attr_info['mapping']['unit'],
                    'type': attr_info['mapping']['type'],
                    'raw_name': attr_name
                }
                
                enriched_data['processed_data'][attr_name] = processed_value
        
        # Interpret result state
        result_value = str(current_data.get('result', '0'))
        if result_value in self.result_states:
            state_info = self.result_states[result_value]
            enriched_data['system_state'] = {
                'code': result_value,
                'name': state_info['name'],
                'severity': state_info['severity'],
                'color': state_info['color']
            }
            
            # Generate alerts for non-normal states
            if result_value != '0':
                alert = {
                    'id': f"arff_alert_{self.current_index}_{result_value}",
                    'type': f"ARFF_{state_info['name'].replace(' ', '_').upper()}",
                    'severity': state_info['severity'],
                    'message': f"Gas system state: {state_info['name']}",
                    'timestamp': enriched_data['timestamp'],
                    'data_point': self.current_index
                }
                enriched_data['alerts'].append(alert)
        
        # Move to next data point (cycle when reaching end)
        self.current_index = (self.current_index + 1) % len(self.data_rows)
        
        return enriched_data
    
    async def start_data_streaming(self):
        """Start continuous data streaming."""
        self.running = True
        logger.info("Starting ARFF data streaming...")
        
        # Initial data fetch
        if not await self.fetch_arff_data():
            logger.error("Failed to fetch initial ARFF data")
            return
        
        # Reset index
        self.current_index = 0
        
        while self.running:
            try:
                # Get next data point
                data_point = await self.get_next_data_point()
                
                if data_point:
                    # Publish data to Redis for real-time consumption
                    await self._publish_data_update(data_point)
                    
                    # Store in cache
                    await self._store_data_cache(data_point)
                    
                    logger.debug(f"Published data point {data_point.get('data_index', 0)}")
                
                # Wait for next interval
                await asyncio.sleep(self.fetch_interval)
                
                # Refetch data every 1000 cycles (in case dataset is updated)
                if self.current_index == 0:
                    logger.info("Refetching ARFF data for fresh cycle")
                    await self.fetch_arff_data()
                
            except asyncio.CancelledError:
                logger.info("ARFF data streaming cancelled")
                break
            except Exception as e:
                logger.error(f"Error in data streaming loop: {e}")
                await asyncio.sleep(self.fetch_interval)
        
        logger.info("ARFF data streaming stopped")
    
    async def stop_data_streaming(self):
        """Stop data streaming."""
        self.running = False
    
    async def get_cached_data(self) -> Dict[str, Any]:
        """Get the latest cached data."""
        try:
            cached_data = self.redis_client.get('arff_latest_data')
            if cached_data:
                return json.loads(cached_data)
            else:
                return {}
        except Exception as e:
            logger.error(f"Error getting cached data: {e}")
            return {}
    
    async def get_data_summary(self) -> Dict[str, Any]:
        """Get summary information about the dataset."""
        return {
            'relation': self.relation_name,
            'total_rows': len(self.data_rows),
            'current_index': self.current_index,
            'attributes': [
                {
                    'name': attr['name'],
                    'type': attr['type'],
                    'display_name': attr['mapping']['name'],
                    'unit': attr['mapping']['unit'],
                    'category': attr['mapping']['type']
                }
                for attr in self.attributes
            ],
            'state_definitions': self.result_states,
            'streaming': self.running,
            'fetch_interval': self.fetch_interval
        }
    
    async def _publish_data_update(self, data_point: Dict[str, Any]):
        """Publish data update to Redis for WebSocket broadcasting."""
        try:
            event = {
                'type': 'arff_data_update',
                'data': data_point,
                'timestamp': datetime.utcnow().isoformat()
            }
            self.redis_client.publish('ics_events', json.dumps(event))
        except Exception as e:
            logger.error(f"Error publishing data update: {e}")
    
    async def _store_data_cache(self, data_point: Dict[str, Any]):
        """Store data in Redis cache."""
        try:
            # Store latest data
            self.redis_client.set('arff_latest_data', json.dumps(data_point), ex=300)  # 5 minutes expiry
            
            # Store historical data (keep last 1000 readings)
            historical_data = {
                'timestamp': data_point['timestamp'],
                'data_index': data_point['data_index'],
                'system_state': data_point['system_state'],
                'key_metrics': {
                    'measurement': data_point['raw_data'].get('measurement', 0),
                    'time': data_point['raw_data'].get('time', 0),
                    'pump': data_point['raw_data'].get('pump', 0),
                    'solenoid': data_point['raw_data'].get('solenoid', 0),
                    'result': data_point['raw_data'].get('result', '0')
                }
            }
            
            self.redis_client.lpush('arff_historical_data', json.dumps(historical_data))
            self.redis_client.ltrim('arff_historical_data', 0, 999)  # Keep only last 1000
            
        except Exception as e:
            logger.error(f"Error storing data cache: {e}")

# Global ARFF service instance
arff_service = ARFFDataService()

async def start_arff_service():
    """Start the ARFF data service."""
    await arff_service.start_data_streaming()

async def stop_arff_service():
    """Stop the ARFF data service."""
    await arff_service.stop_data_streaming()

def get_arff_service() -> ARFFDataService:
    """Get the global ARFF service instance."""
    return arff_service 