#!/usr/bin/env python3
"""
Create a sample dataset for the OT-Sentinel simulation
"""

import pandas as pd
import json
import random
import numpy as np
from datetime import datetime, timedelta

def create_sample_dataset():
    """Create a sample CSV dataset for simulation"""
    
    # Generate realistic network traffic data
    data = []
    
    # Attack types and their probabilities
    attack_types = {
        'normal': 0.6,
        'dos': 0.12,
        'probe': 0.1,
        'r2l': 0.08,
        'u2r': 0.05,
        'modbus_attack': 0.05
    }
    
    # Generate 1000 sample records
    for i in range(1000):
        # Choose attack type based on probability
        rand = random.random()
        cumulative = 0
        selected_attack = 'normal'
        
        for attack, prob in attack_types.items():
            cumulative += prob
            if rand <= cumulative:
                selected_attack = attack
                break
        
        # Generate realistic features
        record = {
            'timestamp': (datetime.now() - timedelta(seconds=i)).isoformat(),
            'src_ip': f"192.168.1.{random.randint(1, 254)}",
            'dst_ip': f"192.168.1.{random.randint(1, 254)}",
            'protocol': random.choice(['TCP', 'UDP', 'ICMP', 'Modbus']),
            'packet_size': random.randint(64, 1500),
            'label': selected_attack,
            'category': 'attack' if selected_attack != 'normal' else 'normal'
        }
        
        # Add 20 numerical features (typical for network analysis)
        for j in range(20):
            # Generate features with different distributions for different attack types
            if selected_attack == 'normal':
                record[f'feature_{j}'] = np.random.normal(0, 0.5)
            elif selected_attack == 'dos':
                record[f'feature_{j}'] = np.random.normal(1.5, 0.8)
            elif selected_attack == 'probe':
                record[f'feature_{j}'] = np.random.normal(-1.2, 0.6)
            elif selected_attack == 'r2l':
                record[f'feature_{j}'] = np.random.normal(0.8, 1.0)
            elif selected_attack == 'u2r':
                record[f'feature_{j}'] = np.random.normal(-0.5, 0.7)
            else:  # modbus_attack
                record[f'feature_{j}'] = np.random.normal(2.0, 1.2)
        
        data.append(record)
    
    # Create DataFrame and save
    df = pd.DataFrame(data)
    df.to_csv('trained_models/balanced_subset.csv', index=False)
    print(f"Created dataset with {len(df)} records")
    print(f"Attack distribution:")
    print(df['label'].value_counts())
    
    return df

if __name__ == "__main__":
    create_sample_dataset() 