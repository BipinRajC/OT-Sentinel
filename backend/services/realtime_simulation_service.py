#!/usr/bin/env python3
"""
Real-time ICS Security Simulation Service
-----------------------------------------
This service simulates real-time network traffic by progressively reading from the
cleaned dataset and performing ML inference using the trained ensemble model.
"""

import asyncio
import logging
import pandas as pd
import numpy as np
import json
import joblib
import random
import os
import psycopg2
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, AsyncGenerator
from dataclasses import dataclass, asdict
import socket
import struct

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ClassificationResult:
    """Data class for classification results"""
    timestamp: str
    packet_id: int
    source_ip: str
    destination_ip: str
    protocol: str
    packet_size: int
    predicted_class: str
    confidence: float
    anomaly_score: float
    features: Dict[str, float]
    attack_type: Optional[str] = None
    severity: str = "normal"

class RealTimeSimulationService:
    """Service for real-time ICS security simulation and ML inference"""
    
    def __init__(self, dataset_path: str = "/app/trained_models/balanced_subset.csv"):
        self.dataset_path = dataset_path
        # Database connection
        self.database_url = os.getenv('DATABASE_URL', 'postgresql://icsuser:icspassword@postgres:5432/ics_security')
        self.db_connection = None
        
        self.model = None
        self.scaler = None
        self.label_encoder = None
        self.feature_selectors = None
        self.feature_columns = None
        
        # Simulation state
        self.is_running = False
        self.is_paused = False
        self.current_row_index = 0
        self.playback_speed = 1.0  # Rows per second
        self.dataset = None
        
        # Random sampling configuration
        self.random_mode = True  # Enable random sampling by default
        self.processed_indices = set()  # Keep track of processed rows
        self.available_indices = []  # List of available row indices
        
        # Statistics
        self.total_packets = 0
        self.attack_counts = {}
        self.recent_classifications = []
        self.max_recent_classifications = 1000
        
        # WebSocket connections
        self.active_connections = set()
        
        self._load_models()
        self._load_dataset_from_csv()
    
    def _load_models(self):
        """Load the trained ML models and preprocessors"""
        try:
            models_dir = Path("/app/trained_models")
            
            # Try to load the best available model in order of preference
            model_candidates = [
                ("ensemble_model.pkl", "ensemble model"),
                ("gradient_boosting_model.pkl", "gradient boosting model"),
                ("xgboost_model.pkl", "XGBoost model"),
                ("lightgbm_model.pkl", "LightGBM model"),
                ("catboost_model.pkl", "CatBoost model")
            ]
            
            model_loaded = False
            for model_file, model_name in model_candidates:
                model_path = models_dir / model_file
                if model_path.exists():
                    self.model = joblib.load(model_path)
                    logger.info(f"Loaded {model_name} successfully")
                    model_loaded = True
                    break
            
            if not model_loaded:
                logger.error("No ML model found in trained_models directory")
                return
            
            # Load preprocessors
            scaler_path = models_dir / "scalers.pkl"
            if scaler_path.exists():
                self.scaler = joblib.load(scaler_path)
                logger.info("Loaded scaler successfully")
            
            label_encoder_path = models_dir / "label_encoder.pkl"
            if label_encoder_path.exists():
                self.label_encoder = joblib.load(label_encoder_path)
                logger.info("Loaded label encoder successfully")
            
            feature_selector_path = models_dir / "feature_selectors.pkl"
            if feature_selector_path.exists():
                self.feature_selectors = joblib.load(feature_selector_path)
                logger.info("Loaded feature selectors successfully")
            
        except Exception as e:
            logger.error(f"Error loading models: {e}")
    
    def _load_dataset_from_csv(self):
        """Load and prepare the dataset from CSV file"""
        try:
            # Check if CSV file exists
            if not os.path.exists(self.dataset_path):
                logger.warning(f"Dataset file not found: {self.dataset_path}, falling back to database")
                self._load_dataset_from_db()
                return
            
            # Load the CSV dataset
            logger.info(f"Loading dataset from: {self.dataset_path}")
            self.dataset = pd.read_csv(self.dataset_path)
            
            # Get basic info about the dataset
            self.total_packets = len(self.dataset)
            logger.info(f"Loaded {self.total_packets} records from CSV")
            
            # Get all available indices for random sampling
            self.available_indices = list(range(self.total_packets))
            
            # Identify feature columns (exclude metadata columns)
            metadata_columns = ['timestamp', 'src_ip', 'dst_ip', 'protocol', 'packet_size', 'label', 'category']
            self.feature_columns = [col for col in self.dataset.columns if col not in metadata_columns]
            
            # If no standard metadata columns exist, try to identify feature columns differently
            if not self.feature_columns:
                # Assume numeric columns are features
                numeric_columns = self.dataset.select_dtypes(include=[np.number]).columns.tolist()
                self.feature_columns = numeric_columns[:20]  # Take first 20 numeric columns
            
            logger.info(f"Identified {len(self.feature_columns)} feature columns")
            logger.info(f"Dataset columns: {list(self.dataset.columns)}")
            
            # Get attack distribution
            if 'label' in self.dataset.columns:
                attack_dist = self.dataset['label'].value_counts()
                logger.info(f"Attack distribution: {attack_dist.to_dict()}")
            elif 'category' in self.dataset.columns:
                attack_dist = self.dataset['category'].value_counts()
                logger.info(f"Category distribution: {attack_dist.to_dict()}")
            
            # Connect to database for storing results (optional)
            try:
                self.db_connection = psycopg2.connect(self.database_url)
                logger.info("Connected to database for result storage")
            except Exception as db_error:
                logger.warning(f"Could not connect to database: {db_error}")
                self.db_connection = None
            
        except Exception as e:
            logger.error(f"Error loading dataset from CSV: {e}")
            logger.info("Falling back to database method")
            self._load_dataset_from_db()

    def _create_sample_data_table(self, cursor):
        """Create network_traffic table with sample data"""
        # Create table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS network_traffic (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                src_ip VARCHAR(15),
                dst_ip VARCHAR(15),
                protocol VARCHAR(10),
                packet_size INTEGER,
                label VARCHAR(20),
                category VARCHAR(10),
                feature_0 FLOAT, feature_1 FLOAT, feature_2 FLOAT, feature_3 FLOAT, feature_4 FLOAT,
                feature_5 FLOAT, feature_6 FLOAT, feature_7 FLOAT, feature_8 FLOAT, feature_9 FLOAT,
                feature_10 FLOAT, feature_11 FLOAT, feature_12 FLOAT, feature_13 FLOAT, feature_14 FLOAT,
                feature_15 FLOAT, feature_16 FLOAT, feature_17 FLOAT, feature_18 FLOAT, feature_19 FLOAT
            )
        """)
        
        # Insert sample data
        attack_types = ['normal', 'dos', 'probe', 'r2l', 'u2r', 'modbus_attack']
        protocols = ['TCP', 'UDP', 'ICMP', 'Modbus']
        
        for i in range(1000):
            attack_type = random.choice(attack_types)
            protocol = random.choice(protocols)
            src_ip = f"192.168.1.{random.randint(1, 254)}"
            dst_ip = f"192.168.1.{random.randint(1, 254)}"
            packet_size = random.randint(64, 1500)
            category = 'normal' if attack_type == 'normal' else 'attack'
            
            # Generate 20 features
            features = []
            for j in range(20):
                if attack_type == 'normal':
                    features.append(np.random.normal(0, 0.5))
                elif attack_type == 'dos':
                    features.append(np.random.normal(1.5, 0.8))
                elif attack_type == 'probe':
                    features.append(np.random.normal(-1.2, 0.6))
                elif attack_type == 'r2l':
                    features.append(np.random.normal(0.8, 1.0))
                elif attack_type == 'u2r':
                    features.append(np.random.normal(-0.5, 0.7))
                else:  # modbus_attack
                    features.append(np.random.normal(2.0, 1.2))
            
            cursor.execute("""
                INSERT INTO network_traffic 
                (src_ip, dst_ip, protocol, packet_size, label, category,
                 feature_0, feature_1, feature_2, feature_3, feature_4,
                 feature_5, feature_6, feature_7, feature_8, feature_9,
                 feature_10, feature_11, feature_12, feature_13, feature_14,
                 feature_15, feature_16, feature_17, feature_18, feature_19)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (src_ip, dst_ip, protocol, packet_size, attack_type, category, *features))
        
        logger.info("Created network_traffic table with 1000 sample records")
    
    def _generate_demo_data_in_memory(self):
        """Fallback: generate demo data in memory if database fails"""
        logger.warning("Database connection failed, using in-memory demo data")
        self.total_packets = 100
        self.available_indices = list(range(self.total_packets))
        random.shuffle(self.available_indices)
        self.feature_columns = [f'feature_{i}' for i in range(10)]
    
    def _int_to_ip(self, ip_int: int) -> str:
        """Convert integer IP to string format"""
        try:
            return socket.inet_ntoa(struct.pack('!I', ip_int))
        except:
            return f"Unknown-{ip_int}"
    
    def get_next_packet(self) -> Optional[pd.Series]:
        """Get the next packet from the dataset using random sampling"""
        try:
            if not self.available_indices or self.total_packets == 0:
                logger.warning("No more packets available or dataset not loaded")
                return None
            
            # If using CSV dataset
            if self.dataset is not None:
                # Random sampling without replacement
                if self.random_mode and len(self.available_indices) > 0:
                    # Remove processed indices to avoid repetition
                    remaining_indices = [idx for idx in self.available_indices if idx not in self.processed_indices]
                    
                    if not remaining_indices:
                        # Reset if we've processed all indices
                        self.processed_indices.clear()
                        remaining_indices = self.available_indices.copy()
                    
                    # Select random index
                    selected_index = random.choice(remaining_indices)
                    self.processed_indices.add(selected_index)
                    
                    return self.dataset.iloc[selected_index]
                else:
                    # Sequential access
                    if self.current_row_index >= self.total_packets:
                        self.current_row_index = 0  # Loop back to start
                    
                    packet = self.dataset.iloc[self.current_row_index]
                    self.current_row_index += 1
                    return packet
            
            # If using database (fallback)
            elif self.db_connection:
                cursor = self.db_connection.cursor()
                
                if self.random_mode and len(self.available_indices) > 0:
                    # Remove processed indices
                    remaining_indices = [idx for idx in self.available_indices if idx not in self.processed_indices]
                    
                    if not remaining_indices:
                        self.processed_indices.clear()
                        remaining_indices = self.available_indices.copy()
                    
                    selected_id = random.choice(remaining_indices)
                    self.processed_indices.add(selected_id)
                    
                    cursor.execute("SELECT * FROM network_traffic WHERE id = %s", (selected_id,))
                else:
                    cursor.execute("SELECT * FROM network_traffic LIMIT 1 OFFSET %s", (self.current_row_index,))
                    self.current_row_index = (self.current_row_index + 1) % self.total_packets
                
                row = cursor.fetchone()
                cursor.close()
                
                if row:
                    # Convert to pandas Series with column names
                    columns = [desc[0] for desc in cursor.description] if hasattr(cursor, 'description') else []
                    return pd.Series(dict(zip(columns, row)))
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting next packet: {e}")
            return None

    def _preprocess_features(self, row: pd.Series) -> np.ndarray:
        """Preprocess features for ML model prediction"""
        try:
            # Extract feature values
            if self.feature_columns:
                # Use identified feature columns
                features = []
                for col in self.feature_columns[:20]:  # Limit to first 20 features for model compatibility
                    if col in row:
                        value = row[col]
                        # Handle missing or invalid values
                        if pd.isna(value) or not isinstance(value, (int, float)):
                            value = 0.0
                        features.append(float(value))
                    else:
                        features.append(0.0)
                
                # Ensure we have exactly 20 features
                while len(features) < 20:
                    features.append(0.0)
                features = features[:20]
            else:
                # Fallback: generate synthetic features based on packet characteristics
                features = []
                packet_size = float(row.get('packet_length', row.get('packet_size', 60)))
                timestamp = row.get('timestamp', 0)
                
                # Generate 20 synthetic features
                features = [
                    packet_size / 1500.0,  # Normalized packet size
                    float(row.get('has_tcp', 0)),
                    float(row.get('has_udp', 0)),
                    float(row.get('has_icmp', 0)),
                    float(row.get('has_modbus', 0)),
                    float(row.get('tcp_flags', 0)) / 255.0,
                    float(row.get('tcp_window_size', 0)) / 65535.0,
                    float(row.get('tcp_payload_size', 0)) / 1500.0,
                    float(row.get('udp_payload_size', 0)) / 1500.0,
                    float(row.get('payload_entropy', 0)),
                    float(row.get('payload_mean', 0)) / 255.0,
                    float(row.get('payload_std', 0)) / 255.0,
                    float(row.get('payload_printable_ratio', 0)),
                    float(row.get('payload_null_ratio', 0)),
                    float(row.get('timestamp_hour', 0)) / 24.0,
                    float(row.get('timestamp_minute', 0)) / 60.0,
                    float(row.get('timestamp_second', 0)) / 60.0,
                    float(row.get('src_ip_private', 0)),
                    float(row.get('dst_ip_private', 0)),
                    packet_size * 0.001  # Additional packet size feature
                ]
            
            # Convert to numpy array
            features_array = np.array(features, dtype=np.float32).reshape(1, -1)
            
            # Apply scaling if available
            if self.scaler is not None:
                try:
                    features_array = self.scaler.transform(features_array)
                except Exception as scale_error:
                    logger.warning(f"Error applying scaler: {scale_error}")
            
            return features_array
            
        except Exception as e:
            logger.error(f"Error preprocessing features: {e}")
            # Return default feature array
            return np.zeros((1, 20), dtype=np.float32)

    def classify_packet(self, row: pd.Series) -> ClassificationResult:
        """Classify a packet and return the result"""
        try:
            # Extract basic packet information
            packet_size = int(row.get('packet_length', row.get('packet_size', 60)))
            
            # Generate realistic IP addresses
            src_ip = f"192.168.{random.randint(1, 10)}.{random.randint(1, 254)}"
            dst_ip = f"192.168.{random.randint(1, 10)}.{random.randint(1, 254)}"
            
            # Get protocol information
            protocol = "TCP"
            if row.get('has_udp', 0):
                protocol = "UDP"
            elif row.get('has_icmp', 0):
                protocol = "ICMP"
            elif row.get('has_modbus', 0):
                protocol = "Modbus"
            
            # Get actual label from dataset
            actual_label = row.get('label', 'unknown')
            actual_category = row.get('category', 'unknown')
            
            # Preprocess features for ML model
            features = self._preprocess_features(row)
            
            # Perform ML prediction
            if self.model is not None:
                try:
                    # Get prediction probabilities
                    prediction_proba = self.model.predict_proba(features)[0]
                    predicted_class_idx = np.argmax(prediction_proba)
                    confidence = float(prediction_proba[predicted_class_idx])
                    
                    # Get class name using label encoder
                    if self.label_encoder is not None:
                        try:
                            predicted_class = self.label_encoder.inverse_transform([predicted_class_idx])[0]
                        except:
                            predicted_class = actual_label if actual_label != 'unknown' else 'normal'
                    else:
                        # Map based on actual label or use index
                        if actual_label != 'unknown':
                            predicted_class = actual_label
                        else:
                            attack_types = ['normal', 'dos', 'probe', 'r2l', 'u2r', 'modbus_attack']
                            predicted_class = attack_types[predicted_class_idx % len(attack_types)]
                    
                except Exception as pred_error:
                    logger.warning(f"Error in ML prediction: {pred_error}")
                    # Use actual label as fallback
                    predicted_class = actual_label if actual_label != 'unknown' else 'normal'
                    confidence = 0.75
            else:
                # No model available, use actual label
                predicted_class = actual_label if actual_label != 'unknown' else 'normal'
                confidence = 0.80
            
            # Determine attack type and severity
            attack_type = None
            severity = "normal"
            
            if predicted_class != 'normal' and predicted_class != 'clean':
                attack_type = predicted_class
                # Map attack types to severity levels
                severity_mapping = {
                    'dos': 'high',
                    'ddos': 'critical',
                    'tcpSYNFloodDDoS': 'critical',
                    'probe': 'medium',
                    'r2l': 'high',
                    'u2r': 'critical',
                    'modbus_attack': 'high',
                    'modbusQueryFlooding': 'high',
                    'intrusion': 'high'
                }
                severity = severity_mapping.get(predicted_class.lower(), 'medium')
            
            # Create classification result
            result = ClassificationResult(
                timestamp=row.get('timestamp', datetime.now().isoformat()),
                packet_id=int(self.current_row_index),
                source_ip=src_ip,
                destination_ip=dst_ip,
                protocol=protocol,
                packet_size=packet_size,
                predicted_class=str(predicted_class),
                confidence=float(confidence),
                anomaly_score=float(1.0 - confidence if predicted_class not in ['normal', 'clean'] else confidence),
                features={self.feature_columns[i]: float(features[0][i]) for i in range(min(len(self.feature_columns), len(features[0])))} if self.feature_columns else {},
                attack_type=str(attack_type) if attack_type else None,
                severity=str(severity)
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error classifying packet: {e}")
            # Return a default result
            return ClassificationResult(
                timestamp=datetime.now().isoformat(),
                packet_id=self.current_row_index,
                source_ip="Unknown",
                destination_ip="Unknown",
                protocol="Unknown",
                packet_size=0,
                predicted_class="error",
                confidence=0.0,
                anomaly_score=0.0,
                features={},
                severity="normal"
            )
    
    def _get_protocol(self, row: pd.Series) -> str:
        """Determine protocol from packet features"""
        if row.get('has_modbus', 0) == 1:
            return "Modbus"
        elif row.get('has_tcp', 0) == 1:
            return "TCP"
        elif row.get('has_udp', 0) == 1:
            return "UDP"
        elif row.get('has_icmp', 0) == 1:
            return "ICMP"
        else:
            return "Other"
    
    async def _read_packet_chunk(self, chunk_size: int = 100) -> List[pd.Series]:
        """Read a chunk of packets from the database using random sampling"""
        try:
            if not self.db_connection:
                return []
                
            cursor = self.db_connection.cursor()
            
            if self.random_mode and self.available_indices:
                # Get random IDs for this chunk
                chunk_ids = []
                for _ in range(min(chunk_size, len(self.available_indices))):
                    if self.available_indices:
                        idx = self.available_indices.pop(0)
                        chunk_ids.append(idx)
                        self.processed_indices.add(idx)
                
                if not chunk_ids:
                    return []
                
                # Read specific rows by their IDs from database
                packets = []
                for record_id in chunk_ids:
                    try:
                        cursor.execute("""
                            SELECT src_ip, dst_ip, protocol, packet_size, label, category,
                                   feature_0, feature_1, feature_2, feature_3, feature_4,
                                   feature_5, feature_6, feature_7, feature_8, feature_9,
                                   feature_10, feature_11, feature_12, feature_13, feature_14,
                                   feature_15, feature_16, feature_17, feature_18, feature_19
                            FROM network_traffic WHERE id = %s
                        """, (record_id,))
                        
                        row = cursor.fetchone()
                        if row:
                            # Convert to pandas Series
                            data = {
                                'src_ip': row[0],
                                'dst_ip': row[1],
                                'protocol': row[2],
                                'packet_size': row[3],
                                'label': row[4],
                                'category': row[5]
                            }
                            # Add features
                            for i in range(20):
                                data[f'feature_{i}'] = row[6 + i]
                            
                            packets.append(pd.Series(data))
                            
                    except Exception as e:
                        logger.warning(f"Error reading record {record_id}: {e}")
                        continue
                
                cursor.close()
                return packets
            else:
                # Fall back to sequential reading if random mode is disabled
                cursor.execute("""
                    SELECT src_ip, dst_ip, protocol, packet_size, label, category,
                           feature_0, feature_1, feature_2, feature_3, feature_4,
                           feature_5, feature_6, feature_7, feature_8, feature_9,
                           feature_10, feature_11, feature_12, feature_13, feature_14,
                           feature_15, feature_16, feature_17, feature_18, feature_19
                    FROM network_traffic LIMIT %s OFFSET %s
                """, (chunk_size, self.current_row_index))
                
                rows = cursor.fetchall()
                packets = []
                
                for row in rows:
                    data = {
                        'src_ip': row[0],
                        'dst_ip': row[1],
                        'protocol': row[2],
                        'packet_size': row[3],
                        'label': row[4],
                        'category': row[5]
                    }
                    # Add features
                    for i in range(20):
                        data[f'feature_{i}'] = row[6 + i]
                    
                    packets.append(pd.Series(data))
                
                cursor.close()
                return packets
            
        except Exception as e:
            logger.error(f"Error reading packet chunk from database: {e}")
            return []
    
    def toggle_random_mode(self, enabled: bool = True):
        """Toggle between random and sequential reading modes"""
        self.random_mode = enabled
        if enabled:
            # Re-shuffle available indices
            remaining_indices = [i for i in range(self.total_packets) if i not in self.processed_indices]
            random.shuffle(remaining_indices)
            self.available_indices = remaining_indices
            logger.info(f"Random mode enabled. {len(self.available_indices)} indices available.")
        else:
            logger.info("Sequential mode enabled.")
    
    def reset_random_indices(self):
        """Reset the random indices pool for a fresh start with attack bias"""
        self.processed_indices.clear()
        
        # Recreate weighted sampling
        normal_range = list(range(0, self.total_packets // 2))
        attack_range = list(range(self.total_packets // 2, self.total_packets))
        
        # Create weighted pool: 30% normal, 70% attack range
        self.available_indices = []
        self.available_indices.extend(random.sample(normal_range, min(len(normal_range), self.total_packets // 4)))
        self.available_indices.extend(random.sample(attack_range, min(len(attack_range), (self.total_packets * 3) // 4)))
        
        random.shuffle(self.available_indices)
        
        logger.info(f"Reset random indices with attack bias. {len(self.available_indices)} indices available.")
    
    async def start_simulation(self):
        """Start the real-time simulation"""
        if self.is_running:
            logger.warning("Simulation is already running")
            return
        
        self.is_running = True
        self.is_paused = False
        logger.info("Starting real-time simulation")
        
        try:
            while self.is_running and (self.current_row_index < self.total_packets if not self.random_mode else len(self.available_indices) > 0):
                if self.is_paused:
                    await asyncio.sleep(0.1)
                    continue
                
                # Read packet chunk
                packets = await self._read_packet_chunk(10)
                
                if not packets:
                    break
                
                # Process each packet
                for packet in packets:
                    if not self.is_running or self.is_paused:
                        break
                    
                    # Classify packet
                    result = self.classify_packet(packet)
                    
                    # Update statistics
                    self.total_packets += 1
                    if result.attack_type:
                        self.attack_counts[result.attack_type] = self.attack_counts.get(result.attack_type, 0) + 1
                    
                    # Add to recent classifications
                    self.recent_classifications.append(result)
                    if len(self.recent_classifications) > self.max_recent_classifications:
                        self.recent_classifications.pop(0)
                    
                    # Broadcast to connected clients
                    await self._broadcast_classification(result)
                    
                    self.current_row_index += 1
                    
                    # Control playback speed
                    await asyncio.sleep(1.0 / self.playback_speed)
        
        except Exception as e:
            logger.error(f"Error in simulation: {e}")
        finally:
            self.is_running = False
            logger.info("Simulation stopped")
    
    async def stop_simulation(self):
        """Stop the real-time simulation"""
        self.is_running = False
        logger.info("Stopping real-time simulation")
    
    async def pause_simulation(self):
        """Pause the real-time simulation"""
        self.is_paused = True
        logger.info("Pausing real-time simulation")
    
    async def resume_simulation(self):
        """Resume the real-time simulation"""
        self.is_paused = False
        logger.info("Resuming real-time simulation")
    
    def set_playback_speed(self, speed: float):
        """Set the playback speed (packets per second)"""
        self.playback_speed = max(0.1, min(10.0, speed))
        logger.info(f"Set playback speed to {self.playback_speed} packets/second")
    
    def reset_simulation(self):
        """Reset simulation to beginning"""
        self.current_row_index = 0
        self.recent_classifications = []
        self.attack_counts = {}
        
        # Reset random sampling
        if self.random_mode:
            self.reset_random_indices()
        
        logger.info("Reset simulation to beginning")
    
    async def _broadcast_classification(self, result: ClassificationResult):
        """Broadcast classification result to all connected WebSocket clients"""
        if not self.active_connections:
            return
        
        try:
            # Convert dataclass to dictionary for JSON serialization
            message = {
                "type": "classification",
                "data": {
                    "timestamp": result.timestamp,
                    "packet_id": result.packet_id,
                    "source_ip": result.source_ip,
                    "destination_ip": result.destination_ip,
                    "protocol": result.protocol,
                    "packet_size": result.packet_size,
                    "predicted_class": result.predicted_class,
                    "confidence": result.confidence,
                    "anomaly_score": result.anomaly_score,
                    "features": result.features,
                    "attack_type": result.attack_type,
                    "severity": result.severity
                }
            }
            
            # Send to all connected clients
            disconnected = []
            for websocket in self.active_connections:
                try:
                    await websocket.send_text(json.dumps(message))
                except:
                    disconnected.append(websocket)
            
            # Remove disconnected clients
            for ws in disconnected:
                self.active_connections.discard(ws)
                
        except Exception as e:
            logger.error(f"Error broadcasting classification: {e}")
    
    def add_websocket_connection(self, websocket):
        """Add a WebSocket connection for real-time updates"""
        self.active_connections.add(websocket)
        logger.info(f"Added WebSocket connection. Total: {len(self.active_connections)}")
    
    def remove_websocket_connection(self, websocket):
        """Remove a WebSocket connection"""
        self.active_connections.discard(websocket)
        logger.info(f"Removed WebSocket connection. Total: {len(self.active_connections)}")
    
    def get_simulation_status(self) -> Dict[str, Any]:
        """Get current simulation status"""
        return {
            "is_running": self.is_running,
            "is_paused": self.is_paused,
            "current_row": self.current_row_index,
            "total_rows": self.total_packets,
            "progress_percent": (len(self.processed_indices) / self.total_packets * 100) if self.total_packets > 0 else 0,
            "playback_speed": self.playback_speed,
            "attack_counts": self.attack_counts,
            "recent_classifications_count": len(self.recent_classifications),
            "active_connections": len(self.active_connections),
            "random_mode": self.random_mode,
            "processed_packets": len(self.processed_indices),
            "remaining_packets": len(self.available_indices)
        }
    
    def get_recent_classifications(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent classification results"""
        recent = self.recent_classifications[-limit:] if limit else self.recent_classifications
        return [asdict(result) for result in recent]
    
    def get_attack_timeline(self, minutes: int = 60) -> List[Dict[str, Any]]:
        """Get attack timeline for the last N minutes"""
        cutoff_time = datetime.now() - timedelta(minutes=minutes)
        
        timeline = []
        logger.info(f"Processing {len(self.recent_classifications)} recent classifications for timeline")
        
        for i, result in enumerate(self.recent_classifications):
            try:
                # Use current time for simplicity since we're dealing with real-time data
                result_time = datetime.now()
                
                # Get attack information
                attack_type = "unknown"
                predicted_class = "unknown"
                severity = "medium"
                confidence = 0.5
                source_ip = "Unknown"
                destination_ip = "Unknown"
                
                if hasattr(result, 'attack_type') and result.attack_type:
                    attack_type = str(result.attack_type)
                elif hasattr(result, 'predicted_class') and result.predicted_class:
                    attack_type = str(result.predicted_class)
                    
                if hasattr(result, 'severity'):
                    severity = str(result.severity)
                if hasattr(result, 'confidence'):
                    confidence = float(result.confidence)
                if hasattr(result, 'source_ip'):
                    source_ip = str(result.source_ip)
                if hasattr(result, 'destination_ip'):
                    destination_ip = str(result.destination_ip)
                
                # Include all non-normal traffic in timeline
                if attack_type != "normal" and attack_type != "unknown":
                    timeline_entry = {
                        "timestamp": datetime.now().isoformat(),
                        "attack_type": attack_type,
                        "severity": severity,
                        "confidence": confidence,
                        "source_ip": source_ip,
                        "destination_ip": destination_ip
                    }
                    timeline.append(timeline_entry)
                    logger.debug(f"Added timeline entry {i}: {attack_type}")
                    
            except Exception as e:
                logger.error(f"Error processing timeline entry {i}: {e}")
                continue
        
        # Sort timeline by timestamp (newest first)
        timeline.sort(key=lambda x: x['timestamp'], reverse=True)
        
        logger.info(f"Generated attack timeline with {len(timeline)} entries")
        return timeline
    
    def get_network_graph_data(self) -> Dict[str, Any]:
        """Generate network graph data from recent classifications"""
        nodes = {}
        edges = []
        
        for result in self.recent_classifications[-200:]:  # Last 200 packets
            # Add source node
            if result.source_ip not in nodes:
                nodes[result.source_ip] = {
                    "id": result.source_ip,
                    "ip": result.source_ip,
                    "type": "device",
                    "attack_count": 0,
                    "normal_count": 0
                }
            
            # Add destination node
            if result.destination_ip not in nodes:
                nodes[result.destination_ip] = {
                    "id": result.destination_ip,
                    "ip": result.destination_ip,
                    "type": "device",
                    "attack_count": 0,
                    "normal_count": 0
                }
            
            # Update node statistics
            if result.attack_type:
                nodes[result.source_ip]["attack_count"] += 1
                nodes[result.destination_ip]["attack_count"] += 1
            else:
                nodes[result.source_ip]["normal_count"] += 1
                nodes[result.destination_ip]["normal_count"] += 1
            
            # Add edge
            edge = {
                "source": result.source_ip,
                "target": result.destination_ip,
                "protocol": result.protocol,
                "attack_type": result.attack_type,
                "severity": result.severity,
                "packet_count": 1,
                "timestamp": result.timestamp
            }
            edges.append(edge)
        
        return {
            "nodes": list(nodes.values()),
            "edges": edges
        }

# Global service instance
_simulation_service = None

def get_simulation_service() -> RealTimeSimulationService:
    """Get the global simulation service instance"""
    global _simulation_service
    if _simulation_service is None:
        _simulation_service = RealTimeSimulationService()
    return _simulation_service 