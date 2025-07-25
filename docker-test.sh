#!/bin/bash

# OT Security Dashboard Docker Test Script
echo "🐳 Testing OT Security Dashboard Docker Setup..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Build and start services
echo "🚀 Building and starting services..."
docker-compose -f docker-compose-dashboard.yml up --build -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 30

# Check service status
echo "📋 Checking service status..."
docker-compose -f docker-compose-dashboard.yml ps

# Test backend API
echo "🔧 Testing backend API..."
if curl -f http://localhost:8000/api/devices &> /dev/null; then
    echo "✅ Backend API is responding"
else
    echo "❌ Backend API is not responding"
fi

# Test frontend
echo "🎨 Testing frontend..."
if curl -f http://localhost:3000 &> /dev/null; then
    echo "✅ Frontend is responding"
else
    echo "❌ Frontend is not responding"
fi

# Test Redis
echo "📦 Testing Redis..."
if docker-compose -f docker-compose-dashboard.yml exec -T redis redis-cli ping | grep -q PONG; then
    echo "✅ Redis is responding"
else
    echo "❌ Redis is not responding"
fi

echo ""
echo "🎯 Dashboard URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "📊 To view logs: docker-compose -f docker-compose-dashboard.yml logs -f"
echo "🛑 To stop: docker-compose -f docker-compose-dashboard.yml down"
