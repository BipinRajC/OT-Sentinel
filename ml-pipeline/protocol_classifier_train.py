#!/usr/bin/env python3
"""
ICS Protocol Classifier Training Module
---------------------------------------
This module trains a machine learning model to classify industrial protocols
from network traffic data.
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
from typing import List, Dict, Any, Tuple, Optional
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
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


class ProtocolClassifierTrainer:
    """Trains a machine learning model to classify industrial protocols."""
    
    def __init__(self, 
                 models_dir: str = MODELS_DIR,
                 results_dir: str = RESULTS_DIR):
        self.models_dir = models_dir
        self.results_dir = results_dir
        self.scaler = StandardScaler()
        self.best_model = None
        self.feature_columns = None
        self.target_column = None
        
    def load_training_data(self, train_path: str, val_path: str = None) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Load training and validation data
        
        Args:
            train_path: Path to training data CSV
            val_path: Path to validation data CSV
            
        Returns:
            Tuple of (train_df, val_df)
        """
        logger.info(f"Loading training data from {train_path}")
        train_df = pd.read_csv(train_path)
        
        val_df = None
        if val_path:
            logger.info(f"Loading validation data from {val_path}")
            val_df = pd.read_csv(val_path)
            
        return train_df, val_df
    
    def prepare_features(self, 
                       df: pd.DataFrame,
                       feature_cols: Optional[List[str]] = None,
                       target_col: str = 'ics_protocol',
                       scale: bool = True) -> Tuple[np.ndarray, np.ndarray]:
        """
        Prepare features and target for training
        
        Args:
            df: Input DataFrame
            feature_cols: List of feature columns to use
            target_col: Target column name
            scale: Whether to standardize features
            
        Returns:
            Tuple of (X, y) with features and target arrays
        """
        # Identify numeric columns if not specified
        if feature_cols is None:
            feature_cols = df.select_dtypes(include=['int64', 'float64']).columns.tolist()
            if target_col in feature_cols:
                feature_cols.remove(target_col)
                
        logger.info(f"Using features: {feature_cols}")
        self.feature_columns = feature_cols
        self.target_column = target_col
        
        # Extract features and target
        X = df[feature_cols].values
        
        # Handle missing target values
        if target_col in df.columns:
            y = df[target_col].values
        else:
            logger.warning(f"Target column '{target_col}' not found, using placeholder values")
            y = np.zeros(len(df))
            
        # Scale features if requested
        if scale:
            X = self.scaler.fit_transform(X)
            
        return X, y
    
    def evaluate_classifiers(self, 
                          X_train: np.ndarray, 
                          y_train: np.ndarray,
                          X_val: np.ndarray = None,
                          y_val: np.ndarray = None) -> Dict[str, Any]:
        """
        Evaluate multiple classifiers on the dataset
        
        Args:
            X_train: Training features
            y_train: Training targets
            X_val: Validation features
            y_val: Validation targets
            
        Returns:
            Dictionary with classifier evaluation results
        """
        logger.info("Evaluating multiple classifiers")
        
        # If no validation set provided, create one
        if X_val is None or y_val is None:
            X_train, X_val, y_train, y_val = train_test_split(
                X_train, y_train, test_size=0.2, random_state=42
            )
            
        classifiers = {
            'random_forest': RandomForestClassifier(n_estimators=100, random_state=42),
            'svm': SVC(kernel='rbf', probability=True, random_state=42)
        }
        
        results = {}
        for name, clf in classifiers.items():
            logger.info(f"Training {name} classifier")
            
            # Train classifier
            clf.fit(X_train, y_train)
            
            # Evaluate
            train_acc = accuracy_score(y_train, clf.predict(X_train))
            val_acc = accuracy_score(y_val, clf.predict(X_val))
            
            results[name] = {
                'classifier': clf,
                'train_accuracy': train_acc,
                'val_accuracy': val_acc
            }
            
            logger.info(f"{name} - Train accuracy: {train_acc:.4f}, Validation accuracy: {val_acc:.4f}")
            
        # Find best model
        best_name = max(results, key=lambda k: results[k]['val_accuracy'])
        self.best_model = results[best_name]['classifier']
        
        logger.info(f"Best classifier: {best_name} with validation accuracy {results[best_name]['val_accuracy']:.4f}")
        
        return results
    
    def train_random_forest(self, 
                         X_train: np.ndarray, 
                         y_train: np.ndarray,
                         X_val: np.ndarray = None,
                         y_val: np.ndarray = None,
                         param_grid: Optional[Dict] = None) -> RandomForestClassifier:
        """
        Train a Random Forest classifier with hyperparameter tuning
        
        Args:
            X_train: Training features
            y_train: Training targets
            X_val: Validation features
            y_val: Validation targets
            param_grid: Parameter grid for GridSearchCV
            
        Returns:
            Trained Random Forest classifier
        """
        logger.info("Training Random Forest classifier with hyperparameter tuning")
        
        # Default parameter grid if not provided
        if param_grid is None:
            param_grid = {
                'n_estimators': [50, 100, 200],
                'max_depth': [None, 10, 20, 30],
                'min_samples_split': [2, 5, 10],
                'min_samples_leaf': [1, 2, 4]
            }
            
        # Create base classifier
        rf = RandomForestClassifier(random_state=42)
        
        # Hyperparameter tuning with GridSearchCV
        grid_search = GridSearchCV(
            estimator=rf,
            param_grid=param_grid,
            cv=5,
            n_jobs=-1,
            verbose=1,
            scoring='accuracy'
        )
        
        grid_search.fit(X_train, y_train)
        
        # Get best model
        best_rf = grid_search.best_estimator_
        
        logger.info(f"Best parameters: {grid_search.best_params_}")
        logger.info(f"Best cross-validation score: {grid_search.best_score_:.4f}")
        
        # Evaluate on validation set if provided
        if X_val is not None and y_val is not None:
            y_pred = best_rf.predict(X_val)
            val_acc = accuracy_score(y_val, y_pred)
            logger.info(f"Validation accuracy: {val_acc:.4f}")
            
            # Generate classification report
            class_report = classification_report(y_val, y_pred)
            logger.info(f"Classification report:\n{class_report}")
            
        self.best_model = best_rf
        return best_rf
    
    def save_model(self, model_name: str = 'protocol_classifier') -> str:
        """
        Save the trained model and metadata
        
        Args:
            model_name: Base name for model files
            
        Returns:
            Path to saved model
        """
        if self.best_model is None:
            logger.error("No trained model available to save")
            return None
            
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        model_path = os.path.join(self.models_dir, f"{model_name}_{timestamp}.pkl")
        meta_path = os.path.join(self.models_dir, f"{model_name}_{timestamp}_metadata.json")
        
        # Save model
        joblib.dump(self.best_model, model_path)
        
        # Save scaler
        scaler_path = os.path.join(self.models_dir, f"{model_name}_{timestamp}_scaler.pkl")
        joblib.dump(self.scaler, scaler_path)
        
        # Save metadata
        metadata = {
            'model_type': type(self.best_model).__name__,
            'feature_columns': self.feature_columns,
            'target_column': self.target_column,
            'scaler_path': scaler_path,
            'training_date': timestamp,
            'model_params': self.best_model.get_params()
        }
        
        with open(meta_path, 'w') as f:
            json.dump(metadata, f, indent=2)
            
        logger.info(f"Saved model to {model_path}")
        logger.info(f"Saved metadata to {meta_path}")
        
        return model_path
    
    def plot_feature_importance(self, top_n: int = 20) -> str:
        """
        Plot feature importance for tree-based models
        
        Args:
            top_n: Number of top features to show
            
        Returns:
            Path to saved plot
        """
        if self.best_model is None or not hasattr(self.best_model, 'feature_importances_'):
            logger.error("No trained tree-based model with feature importances available")
            return None
            
        # Get feature importances
        importances = self.best_model.feature_importances_
        
        # Create DataFrame for plotting
        importance_df = pd.DataFrame({
            'Feature': self.feature_columns,
            'Importance': importances
        })
        
        # Sort and take top N
        importance_df = importance_df.sort_values('Importance', ascending=False).head(top_n)
        
        # Plot
        plt.figure(figsize=(10, 8))
        sns.barplot(x='Importance', y='Feature', data=importance_df)
        plt.title(f'Top {top_n} Feature Importance for Protocol Classification')
        plt.tight_layout()
        
        # Save plot
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        plot_path = os.path.join(self.results_dir, f"feature_importance_{timestamp}.png")
        plt.savefig(plot_path)
        
        logger.info(f"Saved feature importance plot to {plot_path}")
        
        return plot_path
    
    def plot_confusion_matrix(self, 
                          X_test: np.ndarray, 
                          y_test: np.ndarray,
                          labels: Optional[List[str]] = None) -> str:
        """
        Plot confusion matrix for the best model
        
        Args:
            X_test: Test features
            y_test: Test targets
            labels: List of class labels
            
        Returns:
            Path to saved plot
        """
        if self.best_model is None:
            logger.error("No trained model available for evaluation")
            return None
            
        # Make predictions
        y_pred = self.best_model.predict(X_test)
        
        # Compute confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        
        # Plot
        plt.figure(figsize=(10, 8))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=labels, yticklabels=labels)
        plt.title('Confusion Matrix')
        plt.ylabel('True Label')
        plt.xlabel('Predicted Label')
        plt.tight_layout()
        
        # Save plot
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        plot_path = os.path.join(self.results_dir, f"confusion_matrix_{timestamp}.png")
        plt.savefig(plot_path)
        
        logger.info(f"Saved confusion matrix plot to {plot_path}")
        
        return plot_path


# Main execution
if __name__ == "__main__":
    logger.info("Starting Protocol Classifier Training")
    
    # Sample usage
    trainer = ProtocolClassifierTrainer()
    
    # Find most recent preprocessed dataset with protocol labels
    data_files = list(Path(PROCESSED_DIR).glob("*_train.csv"))
    if not data_files:
        logger.error(f"No training data found in {PROCESSED_DIR}")
        exit(1)
        
    # Use most recent file
    latest_file = max(data_files, key=lambda x: x.stat().st_mtime)
    basename = latest_file.name.replace("_train.csv", "")
    
    train_path = str(latest_file)
    val_path = os.path.join(PROCESSED_DIR, f"{basename}_val.csv")
    
    # Load data
    train_df, val_df = trainer.load_training_data(train_path, val_path)
    
    # Check if protocol column exists
    if 'ics_protocol' not in train_df.columns:
        logger.error("Training data does not contain 'ics_protocol' column")
        exit(1)
        
    # Prepare features
    X_train, y_train = trainer.prepare_features(train_df)
    X_val, y_val = trainer.prepare_features(val_df)
    
    # Evaluate classifiers
    results = trainer.evaluate_classifiers(X_train, y_train, X_val, y_val)
    
    # Train best model with hyperparameter tuning
    trainer.train_random_forest(X_train, y_train, X_val, y_val)
    
    # Save model
    model_path = trainer.save_model()
    
    # Plot feature importance
    trainer.plot_feature_importance()
    
    # Plot confusion matrix
    trainer.plot_confusion_matrix(X_val, y_val)
    
    logger.info("Protocol classifier training complete") 