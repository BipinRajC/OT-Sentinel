#!/usr/bin/env python3
"""
Create Balanced Subset Dataset for Real-Time Testing
---------------------------------------------------
This script creates a smaller, balanced dataset from the main processed dataset
for faster real-time testing with proper attack distribution.
"""

import pandas as pd
import numpy as np
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_balanced_subset(
    input_path: str = "OT-Security-final/trained_models/processed_ics_dataset_cleaned.csv",
    output_path: str = "OT-Security-final/trained_models/realtime_subset_dataset.csv",
    samples_per_class: int = 500,
    total_max_samples: int = 5000
):
    """Create a balanced subset dataset for real-time testing"""
    
    try:
        logger.info(f"Loading dataset from {input_path}")
        df = pd.read_csv(input_path)
        
        logger.info(f"Original dataset shape: {df.shape}")
        
        # Check if 'label' column exists, if not try 'attack_type' or 'class'
        label_column = None
        for col in ['label', 'attack_type', 'class', 'target']:
            if col in df.columns:
                label_column = col
                break
        
        if label_column is None:
            # Check the last column (often the target)
            label_column = df.columns[-1]
            logger.warning(f"No standard label column found, using last column: {label_column}")
        
        logger.info(f"Using label column: {label_column}")
        logger.info(f"Class distribution:\n{df[label_column].value_counts()}")
        
        # Sample balanced data from each class
        balanced_samples = []
        
        for class_label in df[label_column].unique():
            class_data = df[df[label_column] == class_label]
            
            # Sample up to samples_per_class from each class
            sample_size = min(len(class_data), samples_per_class)
            sampled_data = class_data.sample(n=sample_size, random_state=42)
            
            balanced_samples.append(sampled_data)
            logger.info(f"Sampled {sample_size} samples from class '{class_label}'")
        
        # Combine all samples
        balanced_df = pd.concat(balanced_samples, ignore_index=True)
        
        # If still too large, randomly sample to max limit
        if len(balanced_df) > total_max_samples:
            balanced_df = balanced_df.sample(n=total_max_samples, random_state=42)
            logger.info(f"Reduced to {total_max_samples} total samples")
        
        # Shuffle the final dataset
        balanced_df = balanced_df.sample(frac=1, random_state=42).reset_index(drop=True)
        
        # Save subset dataset
        output_dir = Path(output_path).parent
        output_dir.mkdir(parents=True, exist_ok=True)
        
        balanced_df.to_csv(output_path, index=False)
        
        logger.info(f"Created balanced subset dataset: {balanced_df.shape}")
        logger.info(f"Final class distribution:\n{balanced_df[label_column].value_counts()}")
        logger.info(f"Saved to: {output_path}")
        
        return balanced_df
        
    except Exception as e:
        logger.error(f"Error creating subset dataset: {e}")
        return None

if __name__ == "__main__":
    create_balanced_subset() 