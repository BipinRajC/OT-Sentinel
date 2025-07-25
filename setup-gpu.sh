#!/bin/bash

# OT Security System GPU Setup Script
# ===================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BOLD}${BLUE}$1${NC}"
    echo "=========================="
}

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header "🚀 OT Security System - GPU Setup"

# Set Docker socket
export DOCKER_HOST=unix:///var/run/docker.sock

# Check system requirements
print_info "Checking system requirements..."

# Check if running as non-root
if [ "$EUID" -eq 0 ]; then
    print_error "Please run this script as a regular user (not root)"
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please run ./install-prerequisites.sh first."
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please run ./install-prerequisites.sh first."
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker."
    print_info "Run: sudo systemctl start docker"
    exit 1
fi

print_status "Docker and Docker Compose are available"

# Check NVIDIA GPU and drivers
print_info "Checking GPU setup..."

if ! command -v nvidia-smi &> /dev/null; then
    print_error "NVIDIA drivers not found. Please install NVIDIA drivers first."
    print_info "Install NVIDIA drivers: sudo pacman -S nvidia nvidia-utils"
    exit 1
fi

# Check NVIDIA Docker runtime with updated image
print_info "Testing NVIDIA Docker runtime..."
if ! docker run --rm --gpus all ubuntu:22.04 nvidia-smi > /dev/null 2>&1; then
    print_error "NVIDIA Docker runtime not properly configured."
    print_info "Please run ./install-prerequisites.sh to install NVIDIA Container Toolkit"
    exit 1
fi

print_status "GPU and NVIDIA Docker runtime are properly configured"

# Display GPU information
print_info "GPU Information:"
nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader,nounits

# Check project structure
print_info "Checking project structure..."

if [ ! -f "docker-compose-gpu.yml" ]; then
    print_error "docker-compose-gpu.yml not found. Please run this script from the project root."
    exit 1
fi

if [ ! -d "trained_models" ]; then
    print_error "trained_models directory not found."
    exit 1
fi

if [ ! -f "trained_models/processed_ics_dataset_cleaned.csv" ]; then
    print_error "Dataset file not found: trained_models/processed_ics_dataset_cleaned.csv"
    exit 1
fi

print_status "Project structure is valid"

# Stop any existing containers
print_info "Stopping any existing containers..."
docker-compose -f docker-compose-gpu.yml down --remove-orphans 2>/dev/null || true

# Build and start containers with GPU support
print_header "🔧 Building and Starting Containers"
print_info "This may take several minutes for the first run..."

docker-compose -f docker-compose-gpu.yml build --no-cache
docker-compose -f docker-compose-gpu.yml up -d

# Wait for services
print_info "Waiting for services to initialize..."
sleep 15

# Health checks
print_header "🔍 Health Checks"

# Check Redis
print_info "Checking Redis..."
if docker-compose -f docker-compose-gpu.yml exec -T redis redis-cli ping | grep -q "PONG"; then
    print_status "Redis is running"
else
    print_error "Redis health check failed"
fi

# Check Backend
print_info "Checking Backend API..."
for i in {1..30}; do
    if curl -sf http://localhost:8000/api/health > /dev/null 2>&1; then
        print_status "Backend API is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Backend API health check failed"
        print_info "Check logs: docker-compose -f docker-compose-gpu.yml logs backend"
        exit 1
    fi
    sleep 3
done

# Check Frontend
print_info "Checking Frontend..."
for i in {1..20}; do
    if curl -sf http://localhost:3000 > /dev/null 2>&1; then
        print_status "Frontend is accessible"
        break
    fi
    if [ $i -eq 20 ]; then
        print_error "Frontend health check failed"
        print_info "Check logs: docker-compose -f docker-compose-gpu.yml logs frontend"
        exit 1
    fi
    sleep 3
done

# Verify GPU access in container
print_header "🎯 GPU Verification"
print_info "Verifying GPU access in backend container..."
docker-compose -f docker-compose-gpu.yml exec backend /app/check_gpu.sh

# Check real-time endpoints
print_info "Checking real-time simulation endpoints..."
if curl -sf http://localhost:8000/api/realtime/status > /dev/null 2>&1; then
    print_status "Real-time simulation endpoints are available"
else
    print_warning "Real-time simulation endpoints not ready yet"
fi

# Display service status
print_header "📋 Service Status"
docker-compose -f docker-compose-gpu.yml ps

# Success message
print_header "🎉 Setup Complete!"
echo
print_status "OT Security System is running with GPU acceleration"
echo
echo -e "${BOLD}Access URLs:${NC}"
echo "• Frontend Dashboard: http://localhost:3000"
echo "• Backend API: http://localhost:8000"
echo "• API Documentation: http://localhost:8000/docs"
echo
echo -e "${BOLD}Quick Start:${NC}"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Navigate to 'Real-time Security' tab"
echo "3. Click 'Start' to begin ML-powered simulation"
echo "4. Monitor GPU usage with: watch nvidia-smi"
echo
echo -e "${BOLD}Useful Commands:${NC}"
echo "• View logs: docker-compose -f docker-compose-gpu.yml logs -f"
echo "• Stop system: docker-compose -f docker-compose-gpu.yml down"
echo "• Restart: docker-compose -f docker-compose-gpu.yml restart"
echo "• GPU check: docker-compose -f docker-compose-gpu.yml exec backend /app/check_gpu.sh"
echo
print_status "Setup completed successfully!" 