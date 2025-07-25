# OT Security Monitoring Dashboard

A comprehensive real-time security monitoring dashboard for Operational Technology (OT) and Industrial Control Systems (ICS) with advanced visualization, device management, and threat detection capabilities.

## Overview

The OT Security Monitoring Dashboard provides a complete solution for monitoring, analyzing, and securing industrial control systems. It features real-time data visualization, device management, security alert monitoring, network analytics, and system configuration—all in a beautiful, immersive Material-UI interface.

## Features

### Core Capabilities
- **Real-time Dashboard** - Live metrics, charts, and system statistics
- **Security Monitoring** - Alert management with filtering and trend analysis  
- **Device Management** - Complete device control with performance monitoring
- **Network Analytics** - Traffic analysis with protocol distribution
- **System Settings** - Configuration management panel

### Technical Features
- **Multi-Tab Interface** - Professional Material-UI dark theme
- **Real-Time Updates** - WebSocket integration for instant data
- **Interactive Visualizations** - Charts using Recharts (Pie, Bar, Line, Area)
- **Device Status Control** - Online/offline device management
- **Advanced Filtering** - Alert filtering and acknowledgment
- **Responsive Design** - Optimized for all screen sizes
- **Docker Containerized** - Easy deployment and scaling

### Supported Protocols
- Modbus TCP/RTU
- EtherNet/IP
- DNP3
- OPC UA
- BACnet
- IEC 61850

## Docker Deployment (Recommended)

### Prerequisites
- Docker Engine 20.x+
- Docker Compose 2.x+
- 4GB RAM minimum
- 2GB disk space

### Quick Start with Docker

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd OT-Security
   ```

2. **Start the entire system:**
   ```bash
   # Build and start all services
   docker-compose -f docker-compose-dashboard.yml up --build -d
   ```

3. **Access the dashboard:**
   - **Frontend Dashboard:** http://localhost:3000
   - **Backend API:** http://localhost:8000
   - **API Documentation:** http://localhost:8000/docs

4. **View logs:**
   ```bash
   # View all service logs
   docker-compose -f docker-compose-dashboard.yml logs -f
   
   # View specific service logs
   docker-compose -f docker-compose-dashboard.yml logs -f frontend
   docker-compose -f docker-compose-dashboard.yml logs -f backend
   docker-compose -f docker-compose-dashboard.yml logs -f redis
   ```

5. **Stop the system:**
   ```bash
   docker-compose -f docker-compose-dashboard.yml down
   ```

### Docker Services

The system includes three main services:

| Service | Container | Port | Description |
|---------|-----------|------|-------------|
| **Frontend** | `ot-security-frontend` | 3000 | React dashboard with Material-UI |
| **Backend** | `ot-security-backend` | 8000 | FastAPI server with WebSocket support |
| **Redis** | `ot-security-redis` | 6379 | Real-time messaging and caching |

### Production Deployment

For production deployment with custom configurations:

1. **Create environment file:**
   ```bash
   cp .env.example .env
   # Edit .env with your production settings
   ```

2. **Use production compose file:**
   ```bash
   docker-compose -f docker-compose-dashboard.yml -f docker-compose.prod.yml up -d
   ```

## Development Setup (Local)

If you prefer to run the services locally for development:

### Backend Setup

1. **Create virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install fastapi uvicorn redis websockets
   ```

3. **Start Redis (required):**
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis:7-alpine
   
   # Or install locally
   brew install redis  # macOS
   sudo apt install redis-server  # Ubuntu
   redis-server
   ```

4. **Run backend server:**
   ```bash
   python simple_api.py
   ```

### Frontend Setup

1. **Install Node.js dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Start development server:**
   ```bash
   npm start
   ```

3. **Access dashboard:**
   - Frontend: http://localhost:3002
   - Backend API: http://localhost:8000

## Dashboard Features

### Dashboard Overview
- **System Statistics** - Total devices, online status, alerts
- **Real-time Charts** - Device status, alert trends, risk scores  
- **Quick Actions** - System refresh, alert acknowledgment
- **Live Notifications** - Real-time system events

### Security Monitoring
- **Alert Management** - View, filter, and acknowledge security alerts
- **Severity Filtering** - Critical, high, medium, low alerts
- **Alert Trends** - Historical security event analysis
- **Threat Intelligence** - Real-time threat indicators

### Device Management
- **Device Overview** - All registered OT devices
- **Performance Metrics** - CPU, memory, temperature monitoring
- **Device Control** - Start/stop devices, configuration management
- **Status Monitoring** - Real-time online/offline status

### Network Analytics
- **Traffic Analysis** - Real-time network flow monitoring
- **Protocol Distribution** - Industrial protocol usage statistics
- **Bandwidth Monitoring** - Network performance metrics
- **Flow Analysis** - Top network conversations

### System Settings
- **Configuration Management** - System preferences and settings
- **User Management** - Access control and authentication
- **Notification Settings** - Alert preferences and channels
- **System Information** - Version, status, and health metrics

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_HOST` | `0.0.0.0` | Backend API host |
| `API_PORT` | `8000` | Backend API port |
| `REDIS_URL` | `redis://redis:6379` | Redis connection URL |
| `REACT_APP_API_URL` | `http://localhost:8000` | Frontend API endpoint |

### Custom Configuration

Create a `config.yml` file for advanced settings:

```yaml
# config.yml
dashboard:
  refresh_interval: 5  # seconds
  max_alerts: 1000
  theme: "dark"

security:
  enable_alerts: true
  alert_retention: 30  # days
  
monitoring:
  protocols: ["modbus", "dnp3", "ethernet_ip", "opc_ua"]
  scan_interval: 10  # seconds
```

## API Endpoints

The backend provides RESTful APIs:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/devices` | List all devices |
| `GET` | `/api/alerts` | List security alerts |
| `GET` | `/api/traffic/realtime` | Real-time traffic data |
| `GET` | `/api/network/topology` | Network topology |
| `GET` | `/api/dashboard/overview` | Dashboard statistics |
| `POST` | `/api/devices/{id}/toggle` | Toggle device status |
| `WebSocket` | `/ws` | Real-time updates |

## Troubleshooting

### Common Issues

1. **Dashboard not loading:**
   ```bash
   # Check service status
   docker-compose -f docker-compose-dashboard.yml ps
   
   # Restart services
   docker-compose -f docker-compose-dashboard.yml restart
   ```

2. **Backend connection failed:**
   ```bash
   # Check backend logs
   docker-compose -f docker-compose-dashboard.yml logs backend
   
   # Verify Redis connection
   docker-compose -f docker-compose-dashboard.yml exec redis redis-cli ping
   ```

3. **Port conflicts:**
   ```bash
   # Check port usage
   netstat -tulpn | grep :3000
   netstat -tulpn | grep :8000
   
   # Modify ports in docker-compose-dashboard.yml if needed
   ```

### Performance Optimization

- **Memory Usage:** Increase Docker memory limit to 4GB+
- **Redis Performance:** Use persistent volume for Redis data
- **Network:** Ensure low-latency network for real-time updates

## System Requirements

### Minimum Requirements
- **CPU:** 2 cores
- **RAM:** 4GB
- **Storage:** 2GB free space
- **Network:** 100 Mbps

### Recommended Requirements  
- **CPU:** 4+ cores
- **RAM:** 8GB+
- **Storage:** 10GB+ SSD
- **Network:** 1 Gbps

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Material-UI for the beautiful React components
- FastAPI for the high-performance backend framework
- Recharts for interactive data visualizations
- Redis for real-time messaging capabilities

---

**Built with ❤️ for Industrial Cybersecurity**
