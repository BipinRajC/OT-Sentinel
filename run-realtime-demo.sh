#!/bin/bash

# Real-time ICS Security Dashboard Demo Script
# --------------------------------------------

set -e

echo "🚀 Starting Real-time ICS Security Dashboard Demo"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_status "Docker is running"

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    print_error "docker-compose.yml not found. Please run this script from the project root."
    exit 1
fi

print_status "Found docker-compose.yml"

# Build and start containers
print_info "Building and starting containers..."
docker-compose up -d --build

# Wait for services to be ready
print_info "Waiting for services to start..."
sleep 10

# Check backend health
print_info "Checking backend health..."
for i in {1..30}; do
    if curl -sf http://localhost:8000/api/health > /dev/null 2>&1; then
        print_status "Backend is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Backend failed to start"
        exit 1
    fi
    sleep 2
done

# Check frontend
print_info "Checking frontend..."
for i in {1..15}; do
    if curl -sf http://localhost:3000 > /dev/null 2>&1; then
        print_status "Frontend is accessible"
        break
    fi
    if [ $i -eq 15 ]; then
        print_error "Frontend failed to start"
        exit 1
    fi
    sleep 2
done

# Check real-time endpoints
print_info "Checking real-time simulation endpoints..."
if curl -sf http://localhost:8000/api/realtime/status > /dev/null 2>&1; then
    print_status "Real-time simulation endpoints are available"
else
    print_warning "Real-time simulation endpoints not available, but system is still functional"
fi

# Show service status
echo
echo "🔍 Service Status"
echo "=================="
docker-compose ps

echo
echo "📊 System Information"
echo "===================="
echo "Backend API: http://localhost:8000"
echo "Frontend Dashboard: http://localhost:3000"
echo "Jupyter ML Environment: http://localhost:8888 (password: jupyter)"
echo "ICS Lab Simulation: SSH to localhost:2222 (user: root, password: password)"

echo
echo "🎯 Real-time Dashboard Access"
echo "============================="
echo "1. Open your browser to: http://localhost:3000"
echo "2. Navigate to the 'Real-time Security' tab"
echo "3. Click 'Start' to begin the simulation"
echo "4. Adjust playback speed with the slider"
echo "5. Use filters to focus on specific traffic types"

echo
echo "🚀 Quick API Tests"
echo "=================="
echo "Test simulation status:"
echo "curl http://localhost:8000/api/realtime/status"
echo
echo "Start simulation:"
echo "curl -X POST http://localhost:8000/api/realtime/control -H 'Content-Type: application/json' -d '{\"action\": \"start\", \"speed\": 1.0}'"
echo
echo "Get recent classifications:"
echo "curl http://localhost:8000/api/realtime/recent?limit=10"

echo
echo "📋 Available Features"
echo "===================="
echo "✓ Real-time ML-based packet classification"
echo "✓ Interactive network graph visualization"
echo "✓ Live traffic monitoring table"
echo "✓ Attack timeline and distribution charts"
echo "✓ Severity-based alerting system"
echo "✓ Adjustable simulation speed controls"
echo "✓ Advanced filtering and search"
echo "✓ WebSocket-based real-time updates"

echo
echo "🎉 Demo System Ready!"
echo "====================="
print_status "All services are running successfully"
print_info "Access the dashboard at: http://localhost:3000"

# Optional: Start simulation automatically
if [ "$1" == "--start-simulation" ]; then
    print_info "Starting simulation automatically..."
    sleep 5
    curl -X POST http://localhost:8000/api/realtime/control \
         -H "Content-Type: application/json" \
         -d '{"action": "start", "speed": 1.0}' \
         > /dev/null 2>&1 && print_status "Simulation started" || print_warning "Failed to start simulation"
fi

echo
echo "To stop the demo, run: docker-compose down"
echo "To view logs, run: docker-compose logs -f [service_name]" 