#!/usr/bin/env python3
"""
System Startup Script for ICS Security Monitoring System
Starts the complete system with proper environment configuration
"""

import os
import sys
import subprocess
import time
import signal
from pathlib import Path

def check_dependencies():
    """Check if required dependencies are installed."""
    print("Checking dependencies...")
    
    try:
        import redis
        import pymodbus
        import fastapi
        import uvicorn
        import sqlalchemy
        import psycopg2
        print("✓ All Python dependencies found")
    except ImportError as e:
        print(f"✗ Missing Python dependency: {e}")
        print("Please run: pip install -r backend/requirements.txt")
        return False
    
    # Check if Redis is running
    try:
        import redis
        r = redis.Redis(host='localhost', port=6379, db=0)
        r.ping()
        print("✓ Redis is running")
    except Exception as e:
        print(f"✗ Redis connection failed: {e}")
        print("Please start Redis server: redis-server")
        return False
    
    return True

def setup_environment():
    """Setup environment variables if .env doesn't exist."""
    env_file = Path('.env')
    
    if not env_file.exists():
        print("Creating .env file with default values...")
        
        default_env = """# ICS Security Monitoring System - Environment Variables
# IMPORTANT: Update these values for your environment

# API Keys - REPLACE WITH YOUR ACTUAL GEMINI API KEY
GOOGLE_GEMINI_API_KEY=AIzaSyC-eF8ERBW2Qqa-rTxM5RECrEIrGk7HXkU

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost/ics_security
REDIS_URL=redis://localhost:6379/0
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Modbus Configuration
MODBUS_HOST=192.168.95.2
MODBUS_PORT=502
MODBUS_UNIT_ID=1
MODBUS_TIMEOUT=5
MODBUS_RETRIES=3

# Security
SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Real-time Updates
WEBSOCKET_HEARTBEAT_INTERVAL=30
MODBUS_POLL_INTERVAL=1

# Development
DEBUG=True
LOG_LEVEL=INFO
API_HOST=0.0.0.0
API_PORT=8000

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
"""
        
        with open(env_file, 'w') as f:
            f.write(default_env)
        
        print("✓ Created .env file")
        print("⚠️  Please update the GOOGLE_GEMINI_API_KEY in .env with your actual API key")
    else:
        print("✓ .env file exists")

def start_backend():
    """Start the backend services."""
    print("\n🚀 Starting Backend Services...")
    
    backend_dir = Path('backend')
    if not backend_dir.exists():
        print("✗ Backend directory not found")
        return None
    
    # Change to backend directory and start the system
    os.chdir(backend_dir)
    
    try:
        # Use python3 explicitly for better compatibility
        python_cmd = 'python3' if subprocess.run(['which', 'python3'], capture_output=True).returncode == 0 else sys.executable
        process = subprocess.Popen([
            python_cmd, 'main.py'
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        print(f"✓ Backend started with PID: {process.pid}")
        return process
    except Exception as e:
        print(f"✗ Failed to start backend: {e}")
        return None

def start_frontend():
    """Start the frontend development server."""
    print("\n🌐 Starting Frontend...")
    
    frontend_dir = Path('../frontend')
    if not frontend_dir.exists():
        print("✗ Frontend directory not found")
        return None
    
    try:
        # Check if node_modules exists
        if not (frontend_dir / 'node_modules').exists():
            print("Installing frontend dependencies...")
            subprocess.run(['npm', 'install'], cwd=frontend_dir, check=True)
        
        # Start the development server
        process = subprocess.Popen([
            'npm', 'start'
        ], cwd=frontend_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        print(f"✓ Frontend started with PID: {process.pid}")
        return process
    except Exception as e:
        print(f"✗ Failed to start frontend: {e}")
        return None

def print_system_info():
    """Print system information and URLs."""
    print("\n" + "="*60)
    print("🏭 ICS Security Monitoring System - RUNNING")
    print("="*60)
    print(f"🔧 Backend API:     http://localhost:8000")
    print(f"🌐 Frontend UI:     http://localhost:3000")
    print(f"📡 WebSocket:       ws://localhost:8000/ws")
    print(f"❤️  Health Check:   http://localhost:8000/api/health")
    print(f"🤖 AI Chat:         http://localhost:8000/api/ai/chat")
    print(f"🔌 Modbus Status:   http://localhost:8000/api/modbus/status")
    print(f"📊 Modbus Data:     http://localhost:8000/api/modbus/data")
    print("="*60)
    print("📝 Logs: Check terminal output for real-time system logs")
    print("⚡ Modbus Target: 192.168.95.2:502")
    print("🛑 Press Ctrl+C to stop all services")
    print("="*60)

def main():
    """Main function to start the complete system."""
    print("🏭 ICS Security Monitoring System Startup")
    print("=" * 50)
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Setup environment
    setup_environment()
    
    # Start backend
    backend_process = start_backend()
    if not backend_process:
        sys.exit(1)
    
    # Wait a bit for backend to start
    time.sleep(3)
    
    # Start frontend (optional)
    frontend_process = None
    try:
        frontend_process = start_frontend()
    except Exception as e:
        print(f"⚠️  Frontend start failed: {e}")
        print("   You can start it manually with: cd frontend && npm start")
    
    # Print system information
    print_system_info()
    
    # Handle shutdown gracefully
    def signal_handler(signum, frame):
        print("\n\n🛑 Shutting down system...")
        
        if frontend_process:
            print("Stopping frontend...")
            frontend_process.terminate()
        
        if backend_process:
            print("Stopping backend...")
            backend_process.terminate()
        
        print("✓ System shutdown complete")
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Keep the script running
    try:
        while True:
            time.sleep(1)
            
            # Check if processes are still running
            if backend_process.poll() is not None:
                print("⚠️  Backend process died")
                break
                
    except KeyboardInterrupt:
        signal_handler(signal.SIGINT, None)

if __name__ == "__main__":
    main() 