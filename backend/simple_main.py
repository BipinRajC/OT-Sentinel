#!/usr/bin/env python3
"""
Simplified ICS Security Monitoring System API for testing ARFF endpoints.
"""

import json
import logging
import os
from typing import Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from datetime import datetime
import asyncio

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="ICS Security Monitoring System - Simplified",
    description="Simplified API for testing ARFF endpoints",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Mock ARFF service for testing
class MockARFFService:
    def __init__(self):
        self.connected = True
        self.running = True
        self.data = {
            "timestamp": datetime.now().isoformat(),
            "process_name": "TenEast Chemical Process",
            "parameters": {
                "AValve_Position": 45.2,
                "BValve_Position": 78.5,
                "ProductValve_Position": 12.8,
                "PurgeValve_Position": 3.2,
                "AFlow_Rate": 125.6,
                "BFlow_Rate": 98.4,
                "ProductFlow_Rate": 224.0,
                "PurgeFlow_Rate": 15.2,
                "Reactor_Pressure": 156.8,
                "Reactor_Level": 67.5,
                "Reactor_Temperature": 425.3,
                "AComp_Concentration": 0.34,
                "BComp_Concentration": 0.52,
                "CComp_Concentration": 0.14
            },
            "state": {"value": 0, "description": "Normal Operation"},
            "alarms": [],
            "warnings": []
        }
    
    async def get_data_summary(self):
        return {
            "connection_status": "connected" if self.connected else "disconnected",
            "service_running": self.running,
            "data_source": "TenEast Process Control",
            "last_update": datetime.now().isoformat(),
            "parameters_count": len(self.data["parameters"]),
            "system_health": 100 if self.connected and self.running else 0
        }
    
    async def get_cached_data(self):
        if self.connected:
            # Update timestamp to show real-time data
            self.data["timestamp"] = datetime.now().isoformat()
            return self.data
        return None

# Global service instance
arff_service = MockARFFService()

# ARFF endpoints
@app.get("/api/arff/status")
async def get_arff_status():
    """Get ARFF connection status."""
    summary = await arff_service.get_data_summary()
    return {
        "status": "success",
        "connection_status": summary["connection_status"],
        "service_running": summary["service_running"],
        "system_health": summary["system_health"],
        "data_source": summary["data_source"],
        "last_update": summary["last_update"]
    }

@app.get("/api/arff/data")
async def get_arff_data():
    """Get latest ARFF data."""
    data = await arff_service.get_cached_data()
    
    if not data:
        raise HTTPException(status_code=503, detail="No ARFF data available")
    
    return {
        "status": "success",
        "data": data,
        "summary": await arff_service.get_data_summary()
    }

@app.get("/api/arff/summary")
async def get_arff_summary():
    """Get ARFF dataset summary."""
    return await arff_service.get_data_summary()

@app.post("/api/arff/start")
async def start_arff_streaming():
    """Start ARFF data streaming."""
    arff_service.running = True
    arff_service.connected = True
    return {"status": "success", "message": "ARFF data streaming started"}

@app.post("/api/arff/stop") 
async def stop_arff_streaming():
    """Stop ARFF data streaming."""
    arff_service.running = False
    return {"status": "success", "message": "ARFF data streaming stopped"}

@app.post("/api/arff/connect")
async def connect_arff():
    """Connect to ARFF data source."""
    arff_service.connected = True
    return {"status": "success", "message": "Connected to ARFF data source"}

@app.post("/api/arff/disconnect")
async def disconnect_arff():
    """Disconnect from ARFF data source."""
    arff_service.connected = False
    return {"status": "success", "message": "Disconnected from ARFF data source"}

# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "arff_status": await arff_service.get_data_summary(),
        "timestamp": datetime.now().isoformat()
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "ICS Security Monitoring System API - Simplified",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "arff_status": "/api/arff/status",
            "arff_data": "/api/arff/data",
            "arff_summary": "/api/arff/summary",
            "health": "/api/health"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 