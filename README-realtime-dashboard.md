# Real-time ICS Security Simulation and Visualization Dashboard

This document describes the real-time simulation and visualization dashboard for ICS/OT network security monitoring using the trained ensemble ML model.

## Overview

The real-time dashboard simulates live ICS network traffic by progressively feeding data from the cleaned dataset to the trained ML ensemble model. It provides real-time classification, visualization, and monitoring capabilities with a modern web interface.

## Features

### 🔄 Real-time Data Simulation
- **Progressive Data Feed**: Reads CSV data row-by-row in timestamp order
- **Adjustable Playback Speed**: Control simulation speed from 0.1x to 5x
- **Pause/Resume/Stop Controls**: Full simulation control
- **Progress Tracking**: Visual progress indicator and statistics

### 🤖 ML Inference Pipeline
- **Ensemble Model**: Uses pre-trained ensemble model with perfect performance
- **Preprocessing**: Identical preprocessing pipeline as training (scaler, feature selection, label encoding)
- **Real-time Classification**: Classifies each packet with confidence scores
- **Attack Detection**: Identifies attack types and severity levels

### 📊 Dashboard Visualizations

#### 1. Live Traffic Table
- **Recent Classifications**: Scrollable table of most recent packet classifications
- **Color-coded Severity**: Visual severity indicators
- **Filtering**: Filter by severity, attack type, and protocol
- **Real-time Updates**: Auto-scrolling with new classifications

#### 2. Attack Timeline
- **Time-series Chart**: Shows attack frequency over time
- **Attack Distribution**: Pie chart of attack type distribution
- **Recent Attacks List**: Table of recent attack details

#### 3. Network Graph
- **Interactive Graph**: D3.js-powered network visualization
- **IP Nodes**: Source/destination IPs as nodes, sized by traffic volume
- **Traffic Edges**: Connections colored by attack type
- **Risk Scoring**: Node colors indicate risk levels
- **Interactive Controls**: Drag nodes, adjust parameters, hover for details

#### 4. Statistics Dashboard
- **Real-time Metrics**: Total packets, attacks detected, attack rate
- **Distribution Charts**: Severity and protocol distributions
- **Performance Indicators**: Detection rates and system health

### 🚨 Alert System
- **Real-time Alerts**: Banner notifications for critical attacks
- **Severity-based Styling**: Color-coded alerts by severity level
- **Auto-dismiss**: Alerts automatically disappear after 5 seconds
- **Attack Context**: Shows attack type, source IP, and timestamp

### 🎛️ User Controls
- **Simulation Control**: Start, pause, resume, stop, reset simulation
- **Speed Adjustment**: Slider to control playback speed
- **View Filters**: Filter data by multiple criteria
- **Display Options**: Toggle labels, adjust graph parameters

## Technical Implementation

### Backend Architecture

#### Real-time Simulation Service (`realtime_simulation_service.py`)
```python
class RealTimeSimulationService:
    - Progressive CSV reading with timestamp ordering
    - ML model loading and inference pipeline
    - WebSocket broadcasting for real-time updates
    - Statistics tracking and aggregation
```

#### API Endpoints (`realtime_api.py`)
- **WebSocket**: `/api/realtime/ws` - Real-time data streaming
- **Control**: `POST /api/realtime/control` - Simulation control
- **Status**: `GET /api/realtime/status` - Current simulation status
- **Data**: `GET /api/realtime/recent` - Recent classifications
- **Timeline**: `GET /api/realtime/timeline` - Attack timeline
- **Network**: `GET /api/realtime/network-graph` - Network graph data
- **Statistics**: `GET /api/realtime/statistics` - Comprehensive stats

### Frontend Architecture

#### Real-time Dashboard (`RealTimeSecurityDashboard.js`)
```javascript
- WebSocket connection management
- Real-time data updates and state management
- Tabbed interface with multiple visualization modes
- Filtering and control systems
```

#### Network Graph (`RealTimeNetworkGraph.js`)
```javascript
- D3.js force-directed graph
- Interactive node and edge manipulation
- Real-time updates with smooth transitions
- Risk-based color coding and sizing
```

## Data Flow

1. **Dataset Loading**: Service loads CSV dataset with timestamp column
2. **Progressive Reading**: Reads data chunks in timestamp order
3. **Preprocessing**: Applies same preprocessing as training pipeline
4. **ML Inference**: Ensemble model classifies each packet
5. **Real-time Broadcasting**: Results streamed via WebSocket
6. **Visualization Updates**: Frontend updates charts and tables
7. **Statistics Aggregation**: Running statistics calculated and displayed

## Installation and Setup

### Prerequisites
- Docker and Docker Compose
- Python 3.11+
- Node.js 16+
- Trained ML models in `trained_models/` directory
- Cleaned dataset: `processed_ics_dataset_cleaned.csv`

### Quick Start

1. **Start the Complete System**:
   ```bash
   docker-compose up -d
   ```

2. **Access the Dashboard**:
   - Open browser to `http://localhost:3000`
   - Navigate to "Real-time Security" tab
   - Click "Start" to begin simulation

3. **Control the Simulation**:
   - Use playback speed slider (0.1x to 5x)
   - Pause/Resume as needed
   - Apply filters to focus on specific traffic

### Manual Setup

1. **Backend Setup**:
   ```bash
   cd backend
   pip install -r requirements.txt
   python -m uvicorn simple_api:app --host 0.0.0.0 --port 8000
   ```

2. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm start
   ```

## Model Requirements

### Required Files
- `ensemble_model.pkl` - Trained ensemble classifier
- `scalers.pkl` - Feature scaling parameters
- `label_encoder.pkl` - Attack type label encoder
- `feature_selectors.pkl` - Feature selection parameters
- `processed_ics_dataset_cleaned.csv` - Cleaned dataset with timestamp column

### Expected Data Format
```csv
packet_length,timestamp,has_ip,has_tcp,has_udp,has_icmp,has_modbus,ip_version,...,label,category
64,2023-01-01T00:00:01.000Z,1,1,0,0,0,4,...,normal,normal
```

## Configuration

### Environment Variables
```bash
# API Configuration
API_HOST=0.0.0.0
API_PORT=8000

# Dataset Path
DATASET_PATH=/app/trained_models/processed_ics_dataset_cleaned.csv

# Model Paths
MODELS_DIR=/app/trained_models

# WebSocket Configuration
WS_MAX_CONNECTIONS=100
```

### Simulation Parameters
- **Default Playback Speed**: 1.0 packets/second
- **Max Recent Classifications**: 1000 packets
- **WebSocket Update Interval**: Real-time
- **Statistics Update Interval**: 10 seconds

## API Reference

### WebSocket Messages

#### Client → Server
```json
{
  "type": "get_status",
  "data": {}
}
```

#### Server → Client
```json
{
  "type": "classification",
  "data": {
    "timestamp": "2023-01-01T00:00:01.000Z",
    "packet_id": 1,
    "source_ip": "192.168.1.100",
    "destination_ip": "192.168.1.200",
    "protocol": "Modbus",
    "packet_size": 64,
    "predicted_class": "modbus_attack",
    "confidence": 0.95,
    "anomaly_score": 0.8,
    "attack_type": "modbus_attack",
    "severity": "critical"
  }
}
```

### REST API Examples

#### Start Simulation
```bash
curl -X POST http://localhost:8000/api/realtime/control \
  -H "Content-Type: application/json" \
  -d '{"action": "start", "speed": 2.0}'
```

#### Get Statistics
```bash
curl http://localhost:8000/api/realtime/statistics
```

## Performance Considerations

### Scalability
- **Memory Usage**: ~500MB for 1M packet dataset
- **CPU Usage**: Moderate during active simulation
- **WebSocket Connections**: Supports up to 100 concurrent connections
- **Real-time Performance**: <100ms latency for classification and broadcast

### Optimization
- Chunked data reading for large datasets
- Efficient WebSocket broadcasting
- Optimized D3.js rendering with canvas fallback
- Configurable update intervals

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check if backend is running on port 8000
   - Verify CORS configuration
   - Check browser console for errors

2. **Models Not Loading**
   - Ensure all `.pkl` files are in `trained_models/` directory
   - Check file permissions
   - Verify model format compatibility

3. **Dataset Not Found**
   - Confirm CSV file exists and is readable
   - Check file path configuration
   - Verify CSV format and columns

4. **Performance Issues**
   - Reduce playback speed
   - Decrease update frequency
   - Limit number of displayed packets

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=DEBUG
docker-compose up
```

## Security Considerations

- **Network Isolation**: Run in isolated Docker network
- **API Security**: Consider adding authentication for production
- **Data Privacy**: Ensure sensitive network data is properly handled
- **Resource Limits**: Set appropriate container resource limits

## Future Enhancements

- **Multi-dataset Support**: Switch between different datasets
- **Custom Model Upload**: Allow users to upload their own models
- **Export Functionality**: Export classifications and statistics
- **Advanced Analytics**: Machine learning-based trend analysis
- **Mobile Responsiveness**: Optimize for mobile devices
- **Real-time Collaboration**: Multi-user dashboard sharing

## License

This implementation is part of the ICS Security Monitoring System and follows the same licensing terms. 