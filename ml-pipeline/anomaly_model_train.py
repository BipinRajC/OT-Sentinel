#!/usr/bin/env python3
"""
ICS Anomaly Detection Model Training Module
------------------------------------------
This module trains machine learning models to detect anomalies in ICS network traffic 
and behavior patterns.
"""

import os
import logging
import pandas as pd
import numpy as np
from datetime import datetime
import joblib
from pathlib import Path
import json
import matplotlib.pyplot as plt
import seaborn as sns
from typing import List, Dict, Any, Tuple, Optional, Union
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix, precision_recall_curve, average_precision_score
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
from sklearn.svm import OneClassSVM
import tensorflow as tf
from tensorflow.keras.models import Model, Sequential
from tensorflow.keras.layers import Dense, Dropout, Input, BatchNormalization
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
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
PROCESSED_DIR = os.path.join(DATA_DIR, 'processed')
MODELS_DIR = os.path.join(os.path.dirname(__file__), '../models')
RESULTS_DIR = os.path.join(os.path.dirname(__file__), '../results')

# Ensure directories exist
for dir_path in [DATA_DIR, PROCESSED_DIR, MODELS_DIR, RESULTS_DIR]:
    os.makedirs(dir_path, exist_ok=True)


class AnomalyModelTrainer:
    """Trains machine learning models for anomaly detection in ICS data."""
    
    def __init__(self, 
                 models_dir: str = MODELS_DIR,
                 results_dir: str = RESULTS_DIR):
        self.models_dir = models_dir
        self.results_dir = results_dir
        self.scaler = StandardScaler()
        self.best_model = None
        self.feature_columns = None
        self.threshold = None
        self.model_type = None
        self.reconstruction_error = None
        
    def load_training_data(self, 
                         train_path: str, 
                         val_path: str = None,
                         only_normal: bool = True) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Load training and validation data for anomaly detection
        
        Args:
            train_path: Path to training data CSV
            val_path: Path to validation data CSV
            only_normal: Whether to use only normal data for training
            
        Returns:
            Tuple of (train_df, val_df)
        """
        logger.info(f"Loading training data from {train_path}")
        train_df = pd.read_csv(train_path)
        
        # Filter for normal data if requested
        if only_normal and 'is_anomaly' in train_df.columns:
            train_df = train_df[train_df['is_anomaly'] == 0]
            logger.info(f"Filtered to {len(train_df)} normal training samples")
            
        val_df = None
        if val_path:
            logger.info(f"Loading validation data from {val_path}")
            val_df = pd.read_csv(val_path)
            
        return train_df, val_df
    
    def prepare_features(self, 
                       df: pd.DataFrame,
                       feature_cols: Optional[List[str]] = None,
                       scale: bool = True) -> np.ndarray:
        """
        Prepare features for anomaly detection
        
        Args:
            df: Input DataFrame
            feature_cols: List of feature columns to use
            scale: Whether to standardize features
            
        Returns:
            Array of prepared features
        """
        # Identify numeric columns if not specified
        if feature_cols is None:
            feature_cols = df.select_dtypes(include=['int64', 'float64']).columns.tolist()
            # Exclude target columns
            for col in ['is_anomaly', 'ics_protocol', 'label']:
                if col in feature_cols:
                    feature_cols.remove(col)
                    
        logger.info(f"Using features: {feature_cols}")
        self.feature_columns = feature_cols
        
        # Extract features
        X = df[feature_cols].values
            
        # Scale features if requested
        if scale:
            X = self.scaler.fit_transform(X)
            
        return X
    
    def train_isolation_forest(self, 
                            X_train: np.ndarray,
                            contamination: float = 0.01,
                            n_estimators: int = 100,
                            **kwargs) -> IsolationForest:
        """
        Train an Isolation Forest model for anomaly detection
        
        Args:
            X_train: Training features
            contamination: Expected proportion of outliers
            n_estimators: Number of estimators
            **kwargs: Additional parameters for IsolationForest
            
        Returns:
            Trained Isolation Forest model
        """
        logger.info(f"Training Isolation Forest with contamination={contamination}, n_estimators={n_estimators}")
        model = IsolationForest(
            contamination=contamination,
            n_estimators=n_estimators,
            random_state=42,
            **kwargs
        )
        
        model.fit(X_train)
        
        # Calculate threshold based on decision function
        scores = model.decision_function(X_train)
        # Convert to anomaly score (negative of decision function)
        anomaly_scores = -scores
        
        # Use 99th percentile as threshold for anomaly
        self.threshold = np.percentile(anomaly_scores, 99)
        logger.info(f"Anomaly score threshold: {self.threshold}")
        
        self.best_model = model
        self.model_type = 'isolation_forest'
        return model
    
    def train_autoencoder(self, 
                       X_train: np.ndarray,
                       X_val: Optional[np.ndarray] = None,
                       encoding_dim: int = 10,
                       epochs: int = 50,
                       batch_size: int = 32,
                       learning_rate: float = 0.001) -> Tuple[Model, float]:
        """
        Train an autoencoder neural network for anomaly detection
        
        Args:
            X_train: Training features
            X_val: Validation features
            encoding_dim: Dimension of the encoding layer
            epochs: Training epochs
            batch_size: Batch size
            learning_rate: Learning rate
            
        Returns:
            Tuple of (trained autoencoder model, reconstruction error threshold)
        """
        input_dim = X_train.shape[1]
        logger.info(f"Training autoencoder with input_dim={input_dim}, encoding_dim={encoding_dim}")
        
        # Build the autoencoder model
        input_layer = Input(shape=(input_dim,))
        
        # Encoder
        encoder = Dense(input_dim, activation='relu')(input_layer)
        encoder = BatchNormalization()(encoder)
        encoder = Dense(input_dim // 2, activation='relu')(encoder)
        encoder = BatchNormalization()(encoder)
        encoder = Dense(encoding_dim, activation='relu')(encoder)
        
        # Decoder
        decoder = Dense(input_dim // 2, activation='relu')(encoder)
        decoder = BatchNormalization()(decoder)
        decoder = Dense(input_dim, activation='relu')(decoder)
        decoder = BatchNormalization()(decoder)
        decoder = Dense(input_dim, activation='sigmoid')(decoder)
        
        # Autoencoder
        autoencoder = Model(inputs=input_layer, outputs=decoder)
        autoencoder.compile(optimizer=Adam(learning_rate=learning_rate), loss='mse')
        
        # Early stopping to prevent overfitting
        callbacks = [
            EarlyStopping(monitor='val_loss', patience=5, mode='min', restore_best_weights=True)
        ]
        
        # If validation data is provided, use it
        validation_data = None
        if X_val is not None:
            validation_data = (X_val, X_val)
        
        # Train the model
        history = autoencoder.fit(
            X_train, X_train,
            epochs=epochs,
            batch_size=batch_size,
            shuffle=True,
            validation_data=validation_data,
            callbacks=callbacks,
            verbose=1
        )
        
        # Plot training history
        self._plot_training_history(history, 'autoencoder')
        
        # Calculate reconstruction error
        predictions = autoencoder.predict(X_train)
        mse = np.mean(np.power(X_train - predictions, 2), axis=1)
        
        # Use 99th percentile as threshold
        threshold = np.percentile(mse, 99)
        logger.info(f"Reconstruction error threshold: {threshold}")
        
        self.best_model = autoencoder
        self.model_type = 'autoencoder'
        self.threshold = threshold
        self.reconstruction_error = mse
        
        return autoencoder, threshold
    
    def train_one_class_svm(self, 
                          X_train: np.ndarray, 
                          nu: float = 0.01,
                          kernel: str = 'rbf',
                          **kwargs) -> OneClassSVM:
        """
        Train a One-Class SVM model for anomaly detection
        
        Args:
            X_train: Training features
            nu: Upper bound on the fraction of outliers
            kernel: Kernel type to use
            **kwargs: Additional parameters for OneClassSVM
            
        Returns:
            Trained One-Class SVM model
        """
        logger.info(f"Training One-Class SVM with nu={nu}, kernel={kernel}")
        model = OneClassSVM(nu=nu, kernel=kernel, **kwargs)
        model.fit(X_train)
        
        # Calculate decision scores
        scores = model.decision_function(X_train)
        # Lower score indicates outlier
        anomaly_scores = -scores
        
        # Use 99th percentile as threshold
        self.threshold = np.percentile(anomaly_scores, 99)
        logger.info(f"Anomaly score threshold: {self.threshold}")
        
        self.best_model = model
        self.model_type = 'one_class_svm'
        return model
    
    def evaluate_model(self, 
                     X_test: np.ndarray, 
                     y_test: Optional[np.ndarray] = None) -> Dict[str, Any]:
        """
        Evaluate anomaly detection model
        
        Args:
            X_test: Test features
            y_test: True anomaly labels (0 for normal, 1 for anomaly)
            
        Returns:
            Dictionary with evaluation metrics
        """
        if self.best_model is None:
            logger.error("No trained model available for evaluation")
            return {}
            
        results = {}
        
        if self.model_type == 'autoencoder':
            # Get predictions
            predictions = self.best_model.predict(X_test)
            mse = np.mean(np.power(X_test - predictions, 2), axis=1)
            y_pred = (mse > self.threshold).astype(int)
            anomaly_scores = mse
            
        elif self.model_type == 'isolation_forest':
            # Get anomaly scores (-1 for anomalies, 1 for normal)
            raw_pred = self.best_model.predict(X_test)
            # Convert to 0, 1 (where 1 is anomaly)
            y_pred = (raw_pred == -1).astype(int)
            # Get anomaly scores
            anomaly_scores = -self.best_model.decision_function(X_test)
            
        elif self.model_type == 'one_class_svm':
            # Get anomaly scores
            raw_pred = self.best_model.predict(X_test)
            # Convert to 0, 1 (where 1 is anomaly)
            y_pred = (raw_pred == -1).astype(int)
            # Get anomaly scores
            anomaly_scores = -self.best_model.decision_function(X_test)
            
        results['predictions'] = y_pred
        results['anomaly_scores'] = anomaly_scores
        
        # If true labels are provided, calculate metrics
        if y_test is not None:
            # Confusion matrix
            cm = confusion_matrix(y_test, y_pred)
            results['confusion_matrix'] = cm
            
            # Calculate precision-recall curve
            precision, recall, thresholds = precision_recall_curve(y_test, anomaly_scores)
            results['precision'] = precision
            results['recall'] = recall
            results['thresholds'] = thresholds
            
            # Average precision score
            ap = average_precision_score(y_test, anomaly_scores)
            results['average_precision'] = ap
            
            logger.info(f"Evaluation results - Average Precision: {ap:.4f}")
            logger.info(f"Confusion Matrix:\n{cm}")
            
            # Plot precision-recall curve
            self._plot_precision_recall_curve(precision, recall, ap)
            
        return results
    
    def save_model(self, model_name: str = 'anomaly_detector') -> Dict[str, str]:
        """
        Save the trained model and metadata
        
        Args:
            model_name: Base name for model files
            
        Returns:
            Dictionary with paths to saved files
        """
        if self.best_model is None:
            logger.error("No trained model available to save")
            return {}
            
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # File paths
        result_paths = {}
        
        if self.model_type == 'autoencoder':
            # Save Keras model
            model_path = os.path.join(self.models_dir, f"{model_name}_{self.model_type}_{timestamp}")
            self.best_model.save(model_path)
            result_paths['model'] = model_path
        else:
            # Save scikit-learn model
            model_path = os.path.join(self.models_dir, f"{model_name}_{self.model_type}_{timestamp}.pkl")
            joblib.dump(self.best_model, model_path)
            result_paths['model'] = model_path
        
        # Save scaler
        scaler_path = os.path.join(self.models_dir, f"{model_name}_{self.model_type}_scaler_{timestamp}.pkl")
        joblib.dump(self.scaler, scaler_path)
        result_paths['scaler'] = scaler_path
        
        # Save metadata
        metadata = {
            'model_type': self.model_type,
            'feature_columns': self.feature_columns,
            'threshold': float(self.threshold),
            'scaler_path': scaler_path,
            'training_date': timestamp
        }
        
        # Add model-specific metadata
        if self.model_type == 'isolation_forest':
            metadata['model_params'] = {
                'n_estimators': self.best_model.n_estimators,
                'contamination': self.best_model.contamination
            }
        elif self.model_type == 'one_class_svm':
            metadata['model_params'] = {
                'nu': self.best_model.nu,
                'kernel': self.best_model.kernel
            }
        elif self.model_type == 'autoencoder':
            metadata['model_params'] = {
                'encoding_dim': self.best_model.get_layer(index=2).output_shape[1],
                'input_dim': self.best_model.input_shape[1]
            }
        
        meta_path = os.path.join(self.models_dir, f"{model_name}_{self.model_type}_metadata_{timestamp}.json")
        with open(meta_path, 'w') as f:
            json.dump(metadata, f, indent=2)
            
        result_paths['metadata'] = meta_path
        
        logger.info(f"Saved model to {model_path}")
        logger.info(f"Saved metadata to {meta_path}")
        
        return result_paths
    
    def _plot_training_history(self, history, model_name: str) -> str:
        """
        Plot training history for deep learning models
        
        Args:
            history: Keras history object
            model_name: Name for the plot file
            
        Returns:
            Path to saved plot
        """
        plt.figure(figsize=(10, 6))
        plt.plot(history.history['loss'])
        if 'val_loss' in history.history:
            plt.plot(history.history['val_loss'])
            plt.legend(['train', 'validation'])
        else:
            plt.legend(['train'])
        plt.title('Model Loss')
        plt.ylabel('Loss')
        plt.xlabel('Epoch')
        plt.tight_layout()
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        plot_path = os.path.join(self.results_dir, f"{model_name}_history_{timestamp}.png")
        plt.savefig(plot_path)
        
        logger.info(f"Saved training history plot to {plot_path}")
        
        return plot_path
    
    def _plot_precision_recall_curve(self, 
                                  precision: np.ndarray, 
                                  recall: np.ndarray, 
                                  ap: float) -> str:
        """
        Plot precision-recall curve
        
        Args:
            precision: Precision values
            recall: Recall values
            ap: Average precision score
            
        Returns:
            Path to saved plot
        """
        plt.figure(figsize=(10, 6))
        plt.plot(recall, precision, lw=2)
        plt.xlabel('Recall')
        plt.ylabel('Precision')
        plt.title(f'Precision-Recall Curve (AP = {ap:.3f})')
        plt.grid()
        plt.tight_layout()
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        plot_path = os.path.join(self.results_dir, f"precision_recall_{self.model_type}_{timestamp}.png")
        plt.savefig(plot_path)
        
        logger.info(f"Saved precision-recall curve to {plot_path}")
        
        return plot_path
    
    def plot_anomaly_scores(self, 
                         anomaly_scores: np.ndarray, 
                         threshold: float,
                         y_true: Optional[np.ndarray] = None) -> str:
        """
        Plot distribution of anomaly scores
        
        Args:
            anomaly_scores: Anomaly scores
            threshold: Threshold for anomaly classification
            y_true: True labels if available
            
        Returns:
            Path to saved plot
        """
        plt.figure(figsize=(12, 6))
        
        if y_true is not None:
            # Plot scores for normal and anomalous points separately
            normal_scores = anomaly_scores[y_true == 0]
            anomaly_scores_subset = anomaly_scores[y_true == 1]
            
            plt.hist(normal_scores, bins=50, alpha=0.5, label='Normal')
            plt.hist(anomaly_scores_subset, bins=50, alpha=0.5, label='Anomaly')
            plt.legend()
        else:
            # Plot all scores
            plt.hist(anomaly_scores, bins=50)
            
        plt.axvline(threshold, color='r', linestyle='--', label=f'Threshold: {threshold:.3f}')
        plt.xlabel('Anomaly Score')
        plt.ylabel('Count')
        plt.title('Distribution of Anomaly Scores')
        plt.legend()
        plt.tight_layout()
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        plot_path = os.path.join(self.results_dir, f"anomaly_scores_{self.model_type}_{timestamp}.png")
        plt.savefig(plot_path)
        
        logger.info(f"Saved anomaly scores plot to {plot_path}")
        
        return plot_path


# Main execution
if __name__ == "__main__":
    logger.info("Starting Anomaly Detection Model Training")
    
    # Sample usage
    trainer = AnomalyModelTrainer()
    
    # Find most recent preprocessed dataset
    data_files = list(Path(PROCESSED_DIR).glob("*_train.csv"))
    if not data_files:
        logger.error(f"No training data found in {PROCESSED_DIR}")
        exit(1)
        
    # Use most recent file
    latest_file = max(data_files, key=lambda x: x.stat().st_mtime)
    basename = latest_file.name.replace("_train.csv", "")
    
    train_path = str(latest_file)
    val_path = os.path.join(PROCESSED_DIR, f"{basename}_val.csv")
    test_path = os.path.join(PROCESSED_DIR, f"{basename}_test.csv")
    
    # Load data
    train_df, val_df = trainer.load_training_data(train_path, val_path, only_normal=True)
    test_df = pd.read_csv(test_path)
    
    # Prepare features
    X_train = trainer.prepare_features(train_df)
    X_val = trainer.prepare_features(val_df) if val_df is not None else None
    X_test = trainer.prepare_features(test_df)
    
    # Generate y_test if 'is_anomaly' column exists
    y_test = None
    if 'is_anomaly' in test_df.columns:
        y_test = test_df['is_anomaly'].values
    
    # Train multiple models and select the best one
    
    # 1. Isolation Forest
    logger.info("Training Isolation Forest model")
    trainer.train_isolation_forest(X_train, contamination=0.01)
    if_results = trainer.evaluate_model(X_test, y_test)
    if_model_paths = trainer.save_model('isolation_forest')
    
    # 2. Autoencoder
    logger.info("Training Autoencoder model")
    trainer.train_autoencoder(X_train, X_val, encoding_dim=min(10, X_train.shape[1]//2))
    ae_results = trainer.evaluate_model(X_test, y_test)
    ae_model_paths = trainer.save_model('autoencoder')
    
    # 3. One-Class SVM (might be slow for large datasets)
    if X_train.shape[0] < 10000:  # Only run for smaller datasets
        logger.info("Training One-Class SVM model")
        trainer.train_one_class_svm(X_train, nu=0.01)
        svm_results = trainer.evaluate_model(X_test, y_test)
        svm_model_paths = trainer.save_model('one_class_svm')
    
    logger.info("Anomaly detection model training complete") 