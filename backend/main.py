#!/usr/bin/env python3
"""
Main entry point for the ICS Security Monitoring System Backend.
Starts both the FastAPI server and the real-time monitoring service.
"""

import asyncio
import logging
import multiprocessing
import signal
import sys
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

from fastapi import FastAPI
import uvicorn

# Load environment variables
load_dotenv()

from api.main import app
from services.realtime_service import start_real_time_monitoring
from services.modbus_service import get_modbus_service, start_modbus_service
from services.arff_data_service import start_arff_service

# Configure logging
log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
logging.basicConfig(
    level=getattr(logging, log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('main')

# Global variables for process management
monitoring_process = None
api_process = None
modbus_process = None
arff_process = None

def run_api_server():
    """Run the FastAPI server in a separate process."""
    host = os.getenv('API_HOST', '0.0.0.0')
    port = int(os.getenv('API_PORT', 8000))
    debug = os.getenv('DEBUG', 'False').lower() == 'true'
    
    uvicorn.run(
        "api.main:app",
        host=host,
        port=port,
        reload=debug,
        log_level=os.getenv('LOG_LEVEL', 'info').lower()
    )

def run_monitoring_service():
    """Run the real-time monitoring service in a separate process."""
    asyncio.run(start_real_time_monitoring())

def run_modbus_service():
    """Run the Modbus data service in a separate process."""
    async def _run_service():
        """Run the modbus service with better error handling."""
        try:
            # Get service instance
            modbus_service = get_modbus_service()
            
            # Connect to device
            await modbus_service.connect()
            
            # Start polling in a task
            polling_task = asyncio.create_task(modbus_service.start_polling())
            
            # Keep the service running
            try:
                await asyncio.sleep(float('inf'))
            except asyncio.CancelledError:
                logger.info("Modbus service main task cancelled")
            finally:
                # Clean up
                polling_task.cancel()
                try:
                    await polling_task
                except asyncio.CancelledError:
                    pass
                await modbus_service.disconnect()
                
        except Exception as e:
            logger.error(f"Fatal error in Modbus service: {e}")
    
    # Run the async function
    asyncio.run(_run_service())

def run_arff_service():
    """Run the ARFF data service in a separate process."""
    asyncio.run(start_arff_service())

def signal_handler(signum, frame):
    """Handle shutdown signals."""
    logger.info(f"Received signal {signum}, shutting down...")
    
    processes = [
        ("ARFF", arff_process),
        ("Modbus", modbus_process),
        ("Monitoring", monitoring_process), 
        ("API", api_process)
    ]
    
    for name, process in processes:
        if process and process.is_alive():
            logger.info(f"Terminating {name} process...")
            process.terminate()
            process.join(timeout=5)
            if process.is_alive():
                logger.warning(f"Force killing {name} process...")
                process.kill()
                process.join(timeout=2)
    
    logger.info("Shutdown complete")
    sys.exit(0)

def main():
    """Main function to start all services."""
    global monitoring_process, api_process, modbus_process, arff_process
    
    logger.info("Starting ICS Security Monitoring System...")
    logger.info(f"Environment: {'Development' if os.getenv('DEBUG', 'False').lower() == 'true' else 'Production'}")
    logger.info(f"Modbus Target: {os.getenv('MODBUS_HOST', '192.168.95.2')}:{os.getenv('MODBUS_PORT', 502)}")
    logger.info(f"ARFF Data Source: University of Alabama ICS Dataset")
    
    # Set up signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        # Start ARFF service process first
        logger.info("Starting ARFF data service...")
        arff_process = multiprocessing.Process(target=run_arff_service, name="ARFFService")
        arff_process.start()
        
        # Start Modbus service process
        logger.info("Starting Modbus data service...")
        modbus_process = multiprocessing.Process(target=run_modbus_service, name="ModbusService")
        modbus_process.start()
        
        # Start API server process
        logger.info("Starting API server...")
        api_process = multiprocessing.Process(target=run_api_server, name="APIServer")
        api_process.start()
        
        # Start monitoring service process
        logger.info("Starting real-time monitoring service...")
        monitoring_process = multiprocessing.Process(target=run_monitoring_service, name="MonitoringService")
        monitoring_process.start()
        
        logger.info("All services started successfully!")
        logger.info(f"API Server: http://localhost:{os.getenv('API_PORT', 8000)}")
        logger.info(f"WebSocket: ws://localhost:{os.getenv('API_PORT', 8000)}/ws")
        logger.info(f"Health Check: http://localhost:{os.getenv('API_PORT', 8000)}/api/health")
        logger.info("Press Ctrl+C to stop all services")
        
        # Monitor processes and restart if they die
        restart_attempts = {}
        max_restart_attempts = 3
        
        while True:
            processes_to_check = [
                ("API", api_process, run_api_server),
                ("Monitoring", monitoring_process, run_monitoring_service),
                ("Modbus", modbus_process, run_modbus_service),
                ("ARFF", arff_process, run_arff_service)
            ]
            
            for name, process, target_func in processes_to_check:
                if not process.is_alive():
                    restart_count = restart_attempts.get(name, 0)
                    
                    if restart_count < max_restart_attempts:
                        logger.error(f"{name} process died, restarting... (attempt {restart_count + 1}/{max_restart_attempts})")
                        
                        # Create new process
                        new_process = multiprocessing.Process(target=target_func, name=f"{name}Service")
                        new_process.start()
                        
                        # Update global variable
                        if name == "API":
                            api_process = new_process
                        elif name == "Monitoring":
                            monitoring_process = new_process
                        elif name == "Modbus":
                            modbus_process = new_process
                        elif name == "ARFF":
                            arff_process = new_process
                        
                        restart_attempts[name] = restart_count + 1
                    else:
                        logger.critical(f"{name} process died too many times. Manual intervention required.")
                        signal_handler(signal.SIGTERM, None)
            
            # Check every 5 seconds
            import time
            time.sleep(5)
            
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
        signal_handler(signal.SIGINT, None)
    except Exception as e:
        logger.error(f"Error in main process: {e}")
        signal_handler(signal.SIGTERM, None)

if __name__ == "__main__":
    main()
