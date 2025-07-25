#!/usr/bin/env python3
"""
ICS Anomaly Detection Engine.
Detects anomalies in Industrial Control System data using machine learning.
"""

import os
import sys
import logging
import argparse
import json
import time
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('anomaly_detector')

class AnomalyDetector:
    """Anomaly detection for ICS data using Isolation Forest algorithm."""
    
    def __init__(self, model_path=None):
        """Initialize the anomaly detector.
        
        Args:
            model_path (str): Path to the saved model file
        """
        self.model = None
        self.scaler = None
        self.baseline = None
        self.feature_columns = None
        
        if model_path and os.path.exists(model_path):
            self._load_model(model_path)
        else:
            logger.info("No model loaded. Use train() to create a new model.")
    
    def _load_model(self, model_path):
        """Load a trained model from file.
        
        Args:
            model_path (str): Path to the saved model file
            
        Returns:
            bool: True if model loaded successfully, False otherwise
        """
        try:
            model_data = joblib.load(model_path)
            self.model = model_data.get('model')
            self.scaler = model_data.get('scaler')
            self.baseline = model_data.get('baseline')
            self.feature_columns = model_data.get('feature_columns')
            
            logger.info(f"Model loaded from {model_path}")
            return True
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            return False
    
    def _load_baseline(self):
        """Load baseline statistics."""
        if self.baseline is None:
            logger.warning("No baseline statistics available")
        return self.baseline
    
    def train(self, data, contamination=0.01, save_path=None):
        """Train the anomaly detection model.
        
        Args:
            data (DataFrame): Training data
            contamination (float): Contamination parameter for Isolation Forest
            save_path (str): Path to save the trained model
            
        Returns:
            bool: True if model trained successfully, False otherwise
        """
        try:
            logger.info(f"Training anomaly detection model on {len(data)} samples")
            
            # Store feature columns
            self.feature_columns = list(data.select_dtypes(include=[np.number]).columns)
            if not self.feature_columns:
                logger.error("No numeric features found in training data")
                return False
                
            # Get numeric data for training
            X = data[self.feature_columns].copy()
            
            # Scale the data
            self.scaler = StandardScaler()
            X_scaled = self.scaler.fit_transform(X)
            
            # Train the isolation forest model
            self.model = IsolationForest(
                contamination=contamination,
                random_state=42,
                n_jobs=-1
            )
            self.model.fit(X_scaled)
            
            # Compute baseline statistics
            self.baseline = {
                'mean': X.mean().to_dict(),
                'std': X.std().to_dict(),
                'min': X.min().to_dict(),
                'max': X.max().to_dict(),
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info("Model training completed successfully")
            
            # Save the model if requested
            if save_path:
                model_data = {
                    'model': self.model,
                    'scaler': self.scaler,
                    'baseline': self.baseline,
                    'feature_columns': self.feature_columns
                }
                
                joblib.dump(model_data, save_path)
                logger.info(f"Model saved to {save_path}")
            
            return True
        except Exception as e:
            logger.error(f"Error training model: {e}")
            return False
    
    def _preprocess(self, data_points):
        """Preprocess data for the model.
        
        Args:
            data_points (list): List of data points to preprocess
            
        Returns:
            array: Preprocessed data ready for model prediction
        """
        try:
            # Convert to DataFrame if list of dictionaries
            if isinstance(data_points, list) and isinstance(data_points[0], dict):
                df = pd.DataFrame(data_points)
            else:
                df = data_points.copy()
            
            # Select only feature columns used during training
            if self.feature_columns:
                missing_cols = set(self.feature_columns) - set(df.columns)
                if missing_cols:
                    logger.warning(f"Missing columns in input data: {missing_cols}")
                    # Fill missing columns with zeros
                    for col in missing_cols:
                        df[col] = 0
                
                X = df[self.feature_columns].copy()
            else:
                # If no feature columns stored, use all numeric columns
                X = df.select_dtypes(include=[np.number])
            
            # Scale the data
            if self.scaler:
                X_scaled = self.scaler.transform(X)
            else:
                logger.warning("No scaler available, using unscaled data")
                X_scaled = X.values
            
            return X_scaled
        except Exception as e:
            logger.error(f"Error preprocessing data: {e}")
            return None
    
    def detect_anomalies(self, data_points):
        """Detect anomalies in ICS data.
        
        Args:
            data_points (list/DataFrame): Data points to check for anomalies
            
        Returns:
            list: List of detected anomalies with scores
        """
        if not self.model:
            logger.error("No model available. Train or load a model first.")
            return []
        
        if not data_points or (isinstance(data_points, list) and len(data_points) == 0):
            logger.warning("No data points provided for anomaly detection")
            return []
            
        try:
            # Preprocess data
            processed_data = self._preprocess(data_points)
            if processed_data is None:
                return []
            
            # Detect anomalies
            predictions = self.model.predict(processed_data)
            anomaly_scores = self.model.decision_function(processed_data)
            
            # Convert scores to anomaly scores (negative scores are more anomalous)
            anomaly_scores = -anomaly_scores
            
            # Convert to DataFrame if list of dictionaries
            if isinstance(data_points, list) and isinstance(data_points[0], dict):
                df = pd.DataFrame(data_points)
            else:
                df = data_points.copy()
            
            # Find anomalies (where prediction is -1)
            anomalies = []
            for i, pred in enumerate(predictions):
                if pred == -1:  # Anomaly
                    anomaly_data = df.iloc[i].to_dict() if isinstance(df, pd.DataFrame) else data_points[i]
                    anomalies.append({
                        'data_point': anomaly_data,
                        'score': float(anomaly_scores[i]),
                        'timestamp': anomaly_data.get('timestamp', datetime.now().isoformat())
                    })
            
            logger.info(f"Detected {len(anomalies)} anomalies in {len(data_points)} data points")
            return anomalies
        except Exception as e:
            logger.error(f"Error detecting anomalies: {e}")
            return []
    
    def analyze_anomaly(self, anomaly):
        """Analyze an anomaly to identify contributing factors.
        
        Args:
            anomaly (dict): Anomaly data point
            
        Returns:
            dict: Analysis of the anomaly
        """
        if not self.baseline:
            logger.warning("No baseline available for anomaly analysis")
            return {}
            
        try:
            data_point = anomaly['data_point']
            analysis = {'factors': []}
            
            # Compare with baseline
            for feature in self.feature_columns:
                if feature in data_point:
                    value = data_point[feature]
                    mean = self.baseline['mean'].get(feature)
                    std = self.baseline['std'].get(feature)
                    
                    if mean is not None and std is not None and std > 0:
                        z_score = abs((value - mean) / std)
                        
                        # If value is more than 3 std dev from mean, consider it a factor
                        if z_score > 3:
                            analysis['factors'].append({
                                'feature': feature,
                                'value': value,
                                'mean': mean,
                                'std': std,
                                'z_score': z_score,
                                'deviation': f"{value - mean:.2f}"
                            })
            
            # Sort factors by z-score (most anomalous first)
            analysis['factors'] = sorted(analysis['factors'], key=lambda x: x['z_score'], reverse=True)
            
            # Add overall analysis
            if analysis['factors']:
                primary_factor = analysis['factors'][0]
                analysis['primary_factor'] = primary_factor['feature']
                analysis['summary'] = f"Primary anomaly in {primary_factor['feature']} with value {primary_factor['value']} (expected around {primary_factor['mean']:.2f})"
            else:
                analysis['summary'] = "No specific anomalous factors identified"
            
            return analysis
        except Exception as e:
            logger.error(f"Error analyzing anomaly: {e}")
            return {}

# Function matching README example
def detect_anomalies(data_points):
    """Detect anomalies in ICS data."""
    # Load baseline statistics
    baseline = _load_baseline()
    
    # Preprocess data
    processed_data = _preprocess(data_points)
    
    # Detect anomalies
    model = joblib.load('models/anomaly_detector.pkl')
    predictions = model.predict(processed_data)
    anomaly_scores = model.decision_function(processed_data)
    
    anomalies = []
    for i, pred in enumerate(predictions):
        if pred == -1:  # Anomaly
            anomalies.append({
                'data_point': data_points[i],
                'score': anomaly_scores[i],
                'timestamp': data_points[i].get('timestamp')
            })
    
    return anomalies

def _preprocess(data_points):
    """Helper function for README example."""
    # Placeholder implementation
    return None

def _load_baseline():
    """Helper function for README example."""
    # Placeholder implementation
    return None

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ICS Anomaly Detection Engine")
    parser.add_argument("--data", required=True, help="Input data file (CSV or JSON)")
    parser.add_argument("--model", help="Model file path (for loading or saving)")
    parser.add_argument("--train", action="store_true", help="Train a new model on the data")
    parser.add_argument("--contamination", type=float, default=0.01, help="Contamination parameter for Isolation Forest")
    parser.add_argument("--output", help="Output file for detection results (JSON format)")
    
    args = parser.parse_args()
    
    # Load data
    try:
        if args.data.endswith('.csv'):
            data = pd.read_csv(args.data)
        elif args.data.endswith('.json'):
            with open(args.data, 'r') as f:
                data = pd.DataFrame(json.load(f))
        else:
            logger.error("Unsupported data file format. Use CSV or JSON.")
            sys.exit(1)
            
        logger.info(f"Loaded {len(data)} data points from {args.data}")
    except Exception as e:
        logger.error(f"Error loading data: {e}")
        sys.exit(1)
    
    # Initialize detector
    detector = AnomalyDetector(model_path=args.model if not args.train else None)
    
    # Train or detect
    if args.train:
        logger.info("Training new model...")
        detector.train(data, contamination=args.contamination, save_path=args.model)
    else:
        if not detector.model:
            logger.error("No model loaded and --train not specified")
            sys.exit(1)
            
        # Detect anomalies
        logger.info("Detecting anomalies...")
        anomalies = detector.detect_anomalies(data)
        
        # Analyze anomalies
        for anomaly in anomalies:
            analysis = detector.analyze_anomaly(anomaly)
            anomaly['analysis'] = analysis
        
        # Output results
        if args.output:
            try:
                with open(args.output, 'w') as f:
                    json.dump({
                        'anomalies': anomalies,
                        'total_data_points': len(data),
                        'total_anomalies': len(anomalies),
                        'timestamp': datetime.now().isoformat()
                    }, f, indent=2, default=str)
                logger.info(f"Results saved to {args.output}")
            except Exception as e:
                logger.error(f"Error saving results: {e}")
        else:
            # Print summary
            print(f"Detected {len(anomalies)} anomalies in {len(data)} data points")
            for i, anomaly in enumerate(anomalies[:5]):  # Show first 5 anomalies
                print(f"\nAnomaly {i+1}:")
                print(f"Score: {anomaly['score']:.4f}")
                print(f"Analysis: {anomaly['analysis'].get('summary', 'No analysis')}") 