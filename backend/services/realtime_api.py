#!/usr/bin/env python3
"""
Real-time Simulation API Endpoints
----------------------------------
FastAPI endpoints for real-time ICS security simulation and ML inference.
"""

import asyncio
import json
import logging
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .realtime_simulation_service import get_simulation_service

# Configure logging
logger = logging.getLogger(__name__)

# Create API router
router = APIRouter(prefix="/api/realtime", tags=["Real-time Simulation"])

# Pydantic models for request/response
class SimulationControlRequest(BaseModel):
    """Request model for simulation control"""
    action: str  # start, stop, pause, resume, reset
    speed: Optional[float] = None

class RandomModeRequest(BaseModel):
    """Request model for random mode control"""
    enabled: bool

class SimulationStatusResponse(BaseModel):
    """Response model for simulation status"""
    is_running: bool
    is_paused: bool
    current_row: int
    total_rows: int
    progress_percent: float
    playback_speed: float
    attack_counts: Dict[str, int]
    recent_classifications_count: int
    active_connections: int
    random_mode: bool
    processed_packets: int
    remaining_packets: int

# Global background task for simulation
simulation_task = None

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time classification results"""
    await websocket.accept()
    
    service = get_simulation_service()
    service.add_websocket_connection(websocket)
    
    try:
        # Send initial status
        status = service.get_simulation_status()
        await websocket.send_text(json.dumps({
            "type": "status",
            "data": status
        }))
        
        # Send recent classifications
        recent = service.get_recent_classifications(limit=50)
        await websocket.send_text(json.dumps({
            "type": "initial_data",
            "data": recent
        }))
        
        # Keep connection alive and handle incoming messages
        while True:
            try:
                # Wait for messages from client
                message = await websocket.receive_text()
                data = json.loads(message)
                
                # Handle client requests
                if data.get("type") == "get_status":
                    status = service.get_simulation_status()
                    await websocket.send_text(json.dumps({
                        "type": "status",
                        "data": status
                    }))
                elif data.get("type") == "get_network_graph":
                    graph_data = service.get_network_graph_data()
                    await websocket.send_text(json.dumps({
                        "type": "network_graph",
                        "data": graph_data
                    }))
                elif data.get("type") == "get_timeline":
                    timeline = service.get_attack_timeline(minutes=60)
                    await websocket.send_text(json.dumps({
                        "type": "attack_timeline",
                        "data": timeline
                    }))
                    
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"Error in WebSocket communication: {e}")
                break
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        service.remove_websocket_connection(websocket)

@router.post("/control", response_model=Dict[str, Any])
async def control_simulation(
    request: SimulationControlRequest,
    background_tasks: BackgroundTasks
):
    """Control the real-time simulation"""
    service = get_simulation_service()
    global simulation_task
    
    try:
        if request.action == "start":
            if service.is_running:
                return {"status": "error", "message": "Simulation is already running"}
            
            # Set speed if provided
            if request.speed is not None:
                service.set_playback_speed(request.speed)
            
            # Start simulation in background
            background_tasks.add_task(service.start_simulation)
            
            return {
                "status": "success",
                "message": "Simulation started",
                "data": service.get_simulation_status()
            }
            
        elif request.action == "stop":
            await service.stop_simulation()
            return {
                "status": "success",
                "message": "Simulation stopped",
                "data": service.get_simulation_status()
            }
            
        elif request.action == "pause":
            await service.pause_simulation()
            return {
                "status": "success",
                "message": "Simulation paused",
                "data": service.get_simulation_status()
            }
            
        elif request.action == "resume":
            await service.resume_simulation()
            return {
                "status": "success",
                "message": "Simulation resumed",
                "data": service.get_simulation_status()
            }
            
        elif request.action == "reset":
            await service.stop_simulation()
            service.reset_simulation()
            return {
                "status": "success",
                "message": "Simulation reset",
                "data": service.get_simulation_status()
            }
            
        elif request.action == "set_speed":
            if request.speed is None:
                raise HTTPException(status_code=400, detail="Speed parameter required")
            service.set_playback_speed(request.speed)
            return {
                "status": "success",
                "message": f"Playback speed set to {request.speed}",
                "data": service.get_simulation_status()
            }
            
        else:
            raise HTTPException(status_code=400, detail=f"Invalid action: {request.action}")
            
    except Exception as e:
        logger.error(f"Error controlling simulation: {e}")
        return {
            "status": "error",
            "message": str(e)
        }

@router.get("/status", response_model=Dict[str, Any])
async def get_simulation_status():
    """Get current simulation status"""
    service = get_simulation_service()
    return {
        "status": "success",
        "data": service.get_simulation_status()
    }

@router.post("/random-mode", response_model=Dict[str, Any])
async def control_random_mode(request: RandomModeRequest):
    """Control random sampling mode"""
    service = get_simulation_service()
    
    try:
        service.toggle_random_mode(request.enabled)
        return {
            "status": "success",
            "message": f"Random mode {'enabled' if request.enabled else 'disabled'}",
            "data": service.get_simulation_status()
        }
    except Exception as e:
        logger.error(f"Error controlling random mode: {e}")
        return {
            "status": "error",
            "message": str(e)
        }

@router.post("/reset-random", response_model=Dict[str, Any])
async def reset_random_indices():
    """Reset random indices pool for fresh random sampling"""
    service = get_simulation_service()
    
    try:
        if not service.random_mode:
            return {
                "status": "warning",
                "message": "Random mode is not enabled",
                "data": service.get_simulation_status()
            }
        
        service.reset_random_indices()
        return {
            "status": "success",
            "message": "Random indices reset successfully",
            "data": service.get_simulation_status()
        }
    except Exception as e:
        logger.error(f"Error resetting random indices: {e}")
        return {
            "status": "error",
            "message": str(e)
    }

@router.get("/recent", response_model=Dict[str, Any])
async def get_recent_classifications(limit: int = 100):
    """Get recent classification results"""
    service = get_simulation_service()
    try:
        recent = service.get_recent_classifications(limit=limit)
        return {
            "status": "success",
            "data": recent,
            "count": len(recent)
        }
    except Exception as e:
        logger.error(f"Error getting recent classifications: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/timeline", response_model=Dict[str, Any])
async def get_attack_timeline(minutes: int = 60):
    """Get attack timeline for the last N minutes"""
    service = get_simulation_service()
    try:
        timeline = service.get_attack_timeline(minutes=minutes)
        return {
            "status": "success",
            "data": timeline,
            "count": len(timeline)
        }
    except Exception as e:
        logger.error(f"Error getting attack timeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/network-graph", response_model=Dict[str, Any])
async def get_network_graph():
    """Get network graph data from recent classifications"""
    service = get_simulation_service()
    try:
        graph_data = service.get_network_graph_data()
        return {
            "status": "success",
            "data": graph_data
        }
    except Exception as e:
        logger.error(f"Error getting network graph data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/statistics", response_model=Dict[str, Any])
async def get_simulation_statistics():
    """Get comprehensive simulation statistics"""
    service = get_simulation_service()
    try:
        status = service.get_simulation_status()
        recent = service.get_recent_classifications(limit=1000)
        timeline = service.get_attack_timeline(minutes=60)
        
        # Calculate additional statistics
        total_attacks = sum(status["attack_counts"].values())
        total_normal = len(recent) - total_attacks
        
        # Attack severity distribution
        severity_counts = {}
        for classification in recent:
            severity = classification.get("severity", "normal")
            severity_counts[severity] = severity_counts.get(severity, 0) + 1
        
        # Protocol distribution
        protocol_counts = {}
        for classification in recent:
            protocol = classification.get("protocol", "Unknown")
            protocol_counts[protocol] = protocol_counts.get(protocol, 0) + 1
        
        # Recent attack rate (attacks per minute)
        recent_attack_rate = len(timeline) / max(1, len(timeline) / 60) if timeline else 0
        
        return {
            "status": "success",
            "data": {
                "simulation_status": status,
                "total_packets_processed": len(recent),
                "total_attacks": total_attacks,
                "total_normal": total_normal,
                "attack_rate_percent": (total_attacks / max(1, len(recent))) * 100,
                "attack_counts": status["attack_counts"],
                "severity_distribution": severity_counts,
                "protocol_distribution": protocol_counts,
                "recent_attack_rate": recent_attack_rate,
                "timeline_count": len(timeline)
            }
        }
    except Exception as e:
        logger.error(f"Error getting simulation statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/demo-data", response_model=Dict[str, Any])
async def generate_demo_data():
    """Generate demo data for testing when dataset is not available"""
    import random
    from datetime import datetime, timedelta
    
    try:
        # Generate mock classification results
        demo_data = []
        attack_types = ["normal", "dos", "probe", "r2l", "u2r", "modbus_attack"]
        protocols = ["TCP", "UDP", "Modbus", "ICMP"]
        severities = ["normal", "low", "medium", "high", "critical"]
        
        base_time = datetime.now()
        
        for i in range(100):
            attack_type = random.choice(attack_types)
            is_attack = attack_type != "normal"
            
            result = {
                "timestamp": (base_time - timedelta(seconds=i)).isoformat(),
                "packet_id": i,
                "source_ip": f"192.168.1.{random.randint(1, 254)}",
                "destination_ip": f"192.168.1.{random.randint(1, 254)}",
                "protocol": random.choice(protocols),
                "packet_size": random.randint(64, 1500),
                "predicted_class": attack_type,
                "confidence": random.uniform(0.6, 0.99),
                "anomaly_score": random.uniform(0.1, 0.9) if is_attack else random.uniform(0.0, 0.3),
                "features": {f"feature_{j}": random.uniform(-1, 1) for j in range(10)},
                "attack_type": attack_type if is_attack else None,
                "severity": random.choice(severities) if is_attack else "normal"
            }
            demo_data.append(result)
        
        return {
            "status": "success",
            "message": "Demo data generated",
            "data": demo_data,
            "count": len(demo_data)
        }
        
    except Exception as e:
        logger.error(f"Error generating demo data: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 