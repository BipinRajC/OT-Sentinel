"""
Database connection and session management for the ICS Security Monitoring System.
"""

import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Get database URL from environment variable or use default
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://icsuser:icspassword@postgres:5432/ics_security"
)

# Create engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Logger
logger = logging.getLogger(__name__)

def get_db():
    """
    Get database session.
    
    Yields:
        Session: Database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        
def init_db():
    """
    Initialize database with tables and seed data.
    """
    from . import models
    from .mock_data import get_mock_devices, get_mock_alerts, get_mock_connections
    
    # Create tables
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        return
    
    # Check if we already have data
    db = SessionLocal()
    try:
        existing_devices = db.query(models.Device).count()
        if existing_devices > 0:
            logger.info(f"Database already has {existing_devices} devices, skipping seed data")
            return
            
        # Seed with mock data
        logger.info("Seeding database with mock data...")
        
        # Add mock devices
        for device_data in get_mock_devices():
            protocols = device_data.pop('protocols', [])
            device = models.Device(**device_data)
            db.add(device)
        
        # Commit devices first to get IDs
        db.commit()
        
        # Add mock alerts
        for alert_data in get_mock_alerts():
            alert = models.Alert(**alert_data)
            db.add(alert)
        
        # Add mock connections
        for conn_data in get_mock_connections():
            conn = models.Connection(**conn_data)
            db.add(conn)
            
        db.commit()
        logger.info("Database seeded successfully")
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding database: {e}")
    finally:
        db.close() 