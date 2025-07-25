#!/usr/bin/env python3
"""
ICS Security Data Ingestion Module
-----------------------------------
This module handles data collection, preprocessing, and ingestion for the ICS
security monitoring machine learning pipeline.
"""

import os
import logging
import pandas as pd
import numpy as np
from datetime import datetime
from scapy.all import rdpcap, sniff, wrpcap
from pathlib import Path
import joblib
from typing import List, Dict, Any, Tuple, Optional, Union
import json
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Default paths
DATA_DIR = os.getenv('DATA_DIR', os.path.join(os.path.dirname(__file__), '../data'))
PCAP_DIR = os.path.join(DATA_DIR, 'pcaps')
PROCESSED_DIR = os.path.join(DATA_DIR, 'processed')
MODELS_DIR = os.path.join(os.path.dirname(__file__), '../models')

# Ensure directories exist
for dir_path in [DATA_DIR, PCAP_DIR, PROCESSED_DIR, MODELS_DIR]:
    os.makedirs(dir_path, exist_ok=True)


class ICSSensorDataCollector:
    """Collects data from ICS sensors and network traffic."""
    
    def __init__(self, 
                 pcap_dir: str = PCAP_DIR, 
                 processed_dir: str = PROCESSED_DIR):
        self.pcap_dir = pcap_dir
        self.processed_dir = processed_dir
        
    def capture_live_traffic(self, 
                          interface: str, 
                          capture_time: int = 60, 
                          output_file: Optional[str] = None) -> str:
        """
        Capture live network traffic from specified interface
        
        Args:
            interface: Network interface to capture from
            capture_time: Time in seconds to capture
            output_file: Output PCAP filename
            
        Returns:
            Path to saved PCAP file
        """
        if output_file is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = os.path.join(self.pcap_dir, f"ics_traffic_{timestamp}.pcap")
        
        logger.info(f"Capturing traffic on {interface} for {capture_time} seconds...")
        packets = sniff(iface=interface, timeout=capture_time)
        wrpcap(output_file, packets)
        logger.info(f"Captured {len(packets)} packets, saved to {output_file}")
        
        return output_file
    
    def load_pcap_file(self, pcap_file: str) -> List:
        """
        Load packets from a PCAP file
        
        Args:
            pcap_file: Path to PCAP file
            
        Returns:
            List of packets
        """
        logger.info(f"Loading packets from {pcap_file}")
        return rdpcap(pcap_file)
    
    def extract_features_from_pcap(self, 
                                 pcap_file: str, 
                                 protocol_filter: Optional[str] = None) -> pd.DataFrame:
        """
        Extract features from PCAP file for ML processing
        
        Args:
            pcap_file: Path to PCAP file
            protocol_filter: Filter for specific protocol
            
        Returns:
            DataFrame with extracted features
        """
        packets = self.load_pcap_file(pcap_file)
        logger.info(f"Extracting features from {len(packets)} packets")
        
        features = []
        for i, pkt in enumerate(packets):
            # Basic packet features
            pkt_dict = {
                'timestamp': float(pkt.time),
                'length': len(pkt),
                'protocol': None
            }
            
            # TCP/UDP features
            if 'TCP' in pkt:
                pkt_dict['protocol'] = 'TCP'
                pkt_dict['src_port'] = pkt['TCP'].sport
                pkt_dict['dst_port'] = pkt['TCP'].dport
                pkt_dict['tcp_flags'] = pkt['TCP'].flags
                
            elif 'UDP' in pkt:
                pkt_dict['protocol'] = 'UDP'
                pkt_dict['src_port'] = pkt['UDP'].sport
                pkt_dict['dst_port'] = pkt['UDP'].dport
            
            # IP features if present
            if 'IP' in pkt:
                pkt_dict['src_ip'] = pkt['IP'].src
                pkt_dict['dst_ip'] = pkt['IP'].dst
                pkt_dict['ttl'] = pkt['IP'].ttl
            
            # Modbus detection (TCP port 502)
            if pkt_dict.get('protocol') == 'TCP' and (pkt_dict.get('src_port') == 502 or pkt_dict.get('dst_port') == 502):
                pkt_dict['ics_protocol'] = 'MODBUS'
                
                # Try to extract MODBUS function code if port is 502 and has payload
                if hasattr(pkt, 'load') and len(pkt.load) >= 8:
                    pkt_dict['modbus_function_code'] = pkt.load[7]
            
            features.append(pkt_dict)
            
            if i % 10000 == 0 and i > 0:
                logger.info(f"Processed {i} packets")
        
        df = pd.DataFrame(features)
        
        # Apply protocol filter if specified
        if protocol_filter:
            df = df[df['protocol'] == protocol_filter]
            
        # Save processed data
        out_file = os.path.join(
            self.processed_dir, 
            f"processed_{os.path.basename(pcap_file).replace('.pcap', '.csv')}"
        )
        df.to_csv(out_file, index=False)
        logger.info(f"Saved {len(df)} processed records to {out_file}")
        
        return df
    
    def batch_process_pcaps(self, pcap_pattern: str = "*.pcap") -> Dict[str, pd.DataFrame]:
        """
        Process multiple PCAP files in batch
        
        Args:
            pcap_pattern: Glob pattern for PCAP files
            
        Returns:
            Dictionary of DataFrames with processed data
        """
        results = {}
        for pcap_file in Path(self.pcap_dir).glob(pcap_pattern):
            logger.info(f"Processing {pcap_file}")
            results[pcap_file.name] = self.extract_features_from_pcap(str(pcap_file))
        
        return results


class ICSSensorDataPreprocessor:
    """Preprocesses ICS sensor data for machine learning."""
    
    def __init__(self, processed_dir: str = PROCESSED_DIR):
        self.processed_dir = processed_dir
        
    def load_dataset(self, filepath: str) -> pd.DataFrame:
        """
        Load a processed dataset
        
        Args:
            filepath: Path to processed CSV file
            
        Returns:
            Pandas DataFrame with loaded data
        """
        logger.info(f"Loading dataset from {filepath}")
        return pd.read_csv(filepath)
    
    def normalize_features(self, 
                         df: pd.DataFrame, 
                         numeric_cols: Optional[List[str]] = None) -> pd.DataFrame:
        """
        Normalize numeric features to 0-1 range
        
        Args:
            df: Input DataFrame
            numeric_cols: List of numeric columns to normalize
            
        Returns:
            DataFrame with normalized features
        """
        if numeric_cols is None:
            numeric_cols = df.select_dtypes(include=['int64', 'float64']).columns.tolist()
            
        logger.info(f"Normalizing features: {numeric_cols}")
        
        result = df.copy()
        for col in numeric_cols:
            if col in df.columns:
                min_val = df[col].min()
                max_val = df[col].max()
                if max_val > min_val:
                    result[col] = (df[col] - min_val) / (max_val - min_val)
                    
        return result
    
    def encode_categorical(self, 
                         df: pd.DataFrame,
                         cat_cols: Optional[List[str]] = None) -> Tuple[pd.DataFrame, Dict]:
        """
        One-hot encode categorical features
        
        Args:
            df: Input DataFrame
            cat_cols: List of categorical columns to encode
            
        Returns:
            Tuple of (encoded DataFrame, encoding mappings)
        """
        if cat_cols is None:
            cat_cols = df.select_dtypes(include=['object']).columns.tolist()
            
        logger.info(f"Encoding categorical features: {cat_cols}")
        
        result = df.copy()
        encoders = {}
        
        for col in cat_cols:
            if col in df.columns:
                # Create mapping dictionary
                unique_values = df[col].dropna().unique()
                value_map = {val: idx for idx, val in enumerate(unique_values)}
                encoders[col] = value_map
                
                # Apply mapping
                result[col] = df[col].map(value_map)
                
        return result, encoders
    
    def split_data(self, 
                 df: pd.DataFrame, 
                 train_ratio: float = 0.7,
                 val_ratio: float = 0.15,
                 test_ratio: float = 0.15,
                 shuffle: bool = True) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        Split data into training, validation and test sets
        
        Args:
            df: Input DataFrame
            train_ratio: Ratio of training data
            val_ratio: Ratio of validation data
            test_ratio: Ratio of test data
            shuffle: Whether to shuffle data before splitting
            
        Returns:
            Tuple of (train_df, val_df, test_df)
        """
        assert abs(train_ratio + val_ratio + test_ratio - 1.0) < 1e-10, "Ratios must sum to 1"
        
        logger.info(f"Splitting data into {train_ratio:.0%}/{val_ratio:.0%}/{test_ratio:.0%}")
        
        # Shuffle if requested
        if shuffle:
            df = df.sample(frac=1).reset_index(drop=True)
            
        # Calculate split indices
        n = len(df)
        train_end = int(n * train_ratio)
        val_end = train_end + int(n * val_ratio)
        
        # Split the data
        train_df = df.iloc[:train_end].copy()
        val_df = df.iloc[train_end:val_end].copy()
        test_df = df.iloc[val_end:].copy()
        
        logger.info(f"Split result: {len(train_df)} train, {len(val_df)} validation, {len(test_df)} test samples")
        
        return train_df, val_df, test_df
    
    def save_preprocessed_data(self, 
                             train_df: pd.DataFrame, 
                             val_df: pd.DataFrame, 
                             test_df: pd.DataFrame,
                             dataset_name: str) -> Dict[str, str]:
        """
        Save preprocessed datasets
        
        Args:
            train_df: Training DataFrame
            val_df: Validation DataFrame
            test_df: Test DataFrame
            dataset_name: Base name for the dataset
            
        Returns:
            Dictionary with paths to saved files
        """
        timestamp = datetime.now().strftime("%Y%m%d")
        base_path = os.path.join(self.processed_dir, f"{dataset_name}_{timestamp}")
        
        train_path = f"{base_path}_train.csv"
        val_path = f"{base_path}_val.csv"
        test_path = f"{base_path}_test.csv"
        
        train_df.to_csv(train_path, index=False)
        val_df.to_csv(val_path, index=False)
        test_df.to_csv(test_path, index=False)
        
        logger.info(f"Saved preprocessed datasets: {train_path}, {val_path}, {test_path}")
        
        return {
            'train': train_path,
            'validation': val_path,
            'test': test_path
        }
    
    def save_preprocessing_metadata(self, 
                                  metadata: Dict[str, Any], 
                                  dataset_name: str) -> str:
        """
        Save preprocessing metadata
        
        Args:
            metadata: Dictionary with preprocessing metadata
            dataset_name: Base name for the dataset
            
        Returns:
            Path to saved metadata file
        """
        timestamp = datetime.now().strftime("%Y%m%d")
        metadata_path = os.path.join(self.processed_dir, f"{dataset_name}_{timestamp}_metadata.json")
        
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
            
        logger.info(f"Saved preprocessing metadata to {metadata_path}")
        
        return metadata_path


# Main execution
if __name__ == "__main__":
    logger.info("Starting ICS Data Ingestion")
    
    # Sample usage
    collector = ICSSensorDataCollector()
    preprocessor = ICSSensorDataPreprocessor()
    
    # Example: Process existing PCAP file
    sample_pcap = os.path.join(PCAP_DIR, "sample_ics_traffic.pcap")
    
    # Check if sample data exists (in real usage, you'd have actual data)
    if not os.path.exists(sample_pcap):
        logger.warning(f"Sample PCAP not found: {sample_pcap}. "
                     f"This script is intended to be used with existing data.")
        logger.info("To capture live traffic, use: collector.capture_live_traffic(interface='eth0')")
    else:
        # Process the PCAP
        df = collector.extract_features_from_pcap(sample_pcap)
        
        # Preprocess
        df_norm = preprocessor.normalize_features(df)
        df_encoded, encoders = preprocessor.encode_categorical(df_norm)
        
        # Split data
        train_df, val_df, test_df = preprocessor.split_data(df_encoded)
        
        # Save
        paths = preprocessor.save_preprocessed_data(train_df, val_df, test_df, "ics_traffic")
        metadata = {
            'original_pcap': sample_pcap,
            'feature_count': len(df.columns),
            'sample_count': len(df),
            'encoders': encoders,
            'processing_timestamp': datetime.now().isoformat()
        }
        preprocessor.save_preprocessing_metadata(metadata, "ics_traffic")
        
    logger.info("Data ingestion complete") 