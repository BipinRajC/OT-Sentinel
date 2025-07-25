#!/bin/bash

# ICS Security Monitoring System Startup Script

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print banner
echo -e "${BLUE}"
echo "====================================================="
echo "  ICS Security Monitoring System - Startup Script"
echo "====================================================="
echo -e "${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed.${NC}"
    echo "Please install Docker before running this script."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed.${NC}"
    echo "Please install Docker Compose before running this script."
    exit 1
fi

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file with default values...${NC}"
    cat > .env << EOF
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
EOF
    echo -e "${GREEN}Created .env file.${NC}"
else
    echo -e "${GREEN}.env file already exists.${NC}"
fi

# Function to handle errors
function handle_error {
    echo -e "${RED}Error: $1${NC}"
    exit 1
}

# Build and start the containers
echo -e "${YELLOW}Building and starting Docker containers...${NC}"
docker-compose build || handle_error "Failed to build Docker containers."
docker-compose up -d || handle_error "Failed to start Docker containers."

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 10

# Check if containers are running
if ! docker-compose ps | grep -q "Up"; then
    echo -e "${RED}Error: Some containers failed to start.${NC}"
    docker-compose logs
    exit 1
fi

# Success message
echo -e "${GREEN}ICS Security Monitoring System is now running!${NC}"
echo -e "Frontend: ${BLUE}http://localhost:3000${NC}"
echo -e "Backend API: ${BLUE}http://localhost:8000/api${NC}"
echo -e "API Documentation: ${BLUE}http://localhost:8000/docs${NC}"

echo -e "${YELLOW}"
echo "====================================================="
echo "  To stop the system, run: docker-compose down"
echo "====================================================="
echo -e "${NC}"

exit 0 