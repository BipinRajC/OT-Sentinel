# ICS Security Monitoring System - Setup Guide

This document provides step-by-step instructions to set up and run the ICS Security Monitoring System.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (version 19.03 or later)
- [Docker Compose](https://docs.docker.com/compose/install/) (version 1.27 or later)
- [Git](https://git-scm.com/downloads) (optional, for cloning the repository)

## Quick Start

The easiest way to get the system running is to use the included startup script:

```bash
./start.sh
```

This script will:
1. Check if Docker and Docker Compose are installed
2. Create an `.env` file with default configuration values (if it doesn't exist)
3. Build and start all the containers
4. Verify that the services are running
5. Display the URLs for accessing the system

## Manual Setup

If you prefer to set up the system manually, follow these steps:

### 1. Configure Environment Variables

Create a `.env` file in the project root with the following content:

```
# Database configuration
POSTGRES_USER=icsuser
POSTGRES_PASSWORD=icspassword
POSTGRES_DB=ics_security
DATABASE_URL=postgresql://icsuser:icspassword@postgres:5432/ics_security

# Redis configuration
REDIS_URL=redis://redis:6379/0

# Backend configuration
BACKEND_PORT=8000

# Frontend configuration
FRONTEND_PORT=3000
REACT_APP_API_URL=http://localhost:8000/api
```

### 2. Build and Start the Containers

```bash
docker-compose build
docker-compose up -d
```

### 3. Verify the Services

You should be able to access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- API Documentation: http://localhost:8000/docs

## Development Setup

If you want to run the system in development mode with live reloading:

### Backend Development

```bash
# Install Python dependencies
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run the development server
uvicorn api.main:app --reload
```

### Frontend Development

```bash
# Install Node.js dependencies
cd frontend
npm install

# Run the development server
npm start
```

## Testing the System

The ICS Security Monitoring System includes several components that you can test:

### 1. Simulation Environment

You can start the ICS simulation environment with:

```bash
python -m simulation.fortiphyd_setup.simulator
```

### 2. Scanning for Devices

To scan for devices on your network:

```bash
python -m asset_discovery.active_discovery.scanner --network 192.168.1.0/24 --output devices.json
```

### 3. Parsing MODBUS Traffic

If you have PCAP files with MODBUS traffic, you can parse them with:

```bash
python -m parsers.modbus_parser.parser --pcap traffic.pcap --output parsed.json
```

### 4. Anomaly Detection

To train and test the anomaly detection engine:

```bash
# Train a model
python -m detection.anomaly_detection.detector --data training_data.csv --train --model models/anomaly_detector.pkl

# Detect anomalies
python -m detection.anomaly_detection.detector --data test_data.csv --model models/anomaly_detector.pkl --output anomalies.json
```

## Troubleshooting

### Common Issues

1. **Docker containers not starting properly**:
   - Check the container logs: `docker-compose logs`
   - Ensure all required ports are available

2. **Database connection issues**:
   - Verify the database credentials in the `.env` file
   - Make sure the database container is running: `docker-compose ps postgres`

3. **WebSocket connection failures**:
   - Check if the backend API is accessible
   - Ensure your browser supports WebSockets

### Logs

You can view logs for all containers with:

```bash
docker-compose logs
```

Or for a specific service:

```bash
docker-compose logs backend
```

## Stopping the System

To stop all containers:

```bash
docker-compose down
```

To stop and remove all containers, networks, and volumes:

```bash
docker-compose down -v
``` 