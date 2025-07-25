#!/bin/bash
#
# Fortiphyd GRFICS Setup Script
# -----------------------------
# This script automates the setup of the Fortiphyd GRFICS ICS simulation environment
# for use with the ICS Security Monitoring System
#

set -e

# Configuration
FORTIPHYD_DIR="$HOME/fortiphyd"
GRFICS_DIR="$FORTIPHYD_DIR/GRFICS"
DOCKER_COMPOSE_FILE="$GRFICS_DIR/docker-compose.yml"
CONFIG_DIR="$(dirname "$(realpath "$0")")/../config"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Log functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check Git
    if ! command -v git &> /dev/null; then
        log_error "Git is not installed. Please install Git first."
        exit 1
    fi
    
    log_info "All prerequisites satisfied."
}

# Clone Fortiphyd GRFICS repository
clone_fortiphyd() {
    if [ -d "$GRFICS_DIR" ]; then
        log_warn "GRFICS directory already exists at $GRFICS_DIR."
        read -p "Do you want to update it? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Updating GRFICS repository..."
            cd "$GRFICS_DIR"
            git pull
        fi
    else
        log_info "Cloning Fortiphyd GRFICS repository..."
        mkdir -p "$FORTIPHYD_DIR"
        cd "$FORTIPHYD_DIR"
        git clone https://github.com/Fortiphyd/GRFICS.git
        
        if [ $? -ne 0 ]; then
            log_error "Failed to clone GRFICS repository."
            exit 1
        fi
    fi
}

# Patch GRFICS configuration
patch_grfics_config() {
    log_info "Patching GRFICS configuration..."
    
    # Backup original docker-compose file
    if [ -f "$DOCKER_COMPOSE_FILE" ]; then
        cp "$DOCKER_COMPOSE_FILE" "${DOCKER_COMPOSE_FILE}.bak"
        log_info "Backed up original docker-compose.yml to ${DOCKER_COMPOSE_FILE}.bak"
    fi
    
    # Modify the docker-compose file to expose required ports
    # This is a simple example; actual modifications may be more complex
    if [ -f "$CONFIG_DIR/grfics-docker-compose.yml" ]; then
        cp "$CONFIG_DIR/grfics-docker-compose.yml" "$DOCKER_COMPOSE_FILE"
        log_info "Applied custom GRFICS docker-compose configuration."
    else
        log_warn "Custom GRFICS configuration not found at $CONFIG_DIR/grfics-docker-compose.yml."
        log_warn "Using original configuration, but some features may not work correctly."
    fi
    
    # Create necessary config directories
    mkdir -p "$GRFICS_DIR/config/hmi"
    mkdir -p "$GRFICS_DIR/config/plc"
    mkdir -p "$GRFICS_DIR/config/rtu"
    
    # Copy custom configuration files if they exist
    for component in hmi plc rtu; do
        if [ -d "$CONFIG_DIR/grfics/$component" ]; then
            cp -r "$CONFIG_DIR/grfics/$component"/* "$GRFICS_DIR/config/$component/"
            log_info "Applied custom $component configuration."
        fi
    done
}

# Start GRFICS environment
start_grfics() {
    log_info "Starting GRFICS environment..."
    
    cd "$GRFICS_DIR"
    docker-compose up -d
    
    if [ $? -ne 0 ]; then
        log_error "Failed to start GRFICS environment."
        exit 1
    fi
    
    log_info "GRFICS environment started successfully."
    log_info "HMI is available at http://localhost:5007"
    log_info "Engineering Workstation is available at http://localhost:6901 (password: vncpassword)"
}

# Stop GRFICS environment
stop_grfics() {
    log_info "Stopping GRFICS environment..."
    
    cd "$GRFICS_DIR"
    docker-compose down
    
    if [ $? -ne 0 ]; then
        log_error "Failed to stop GRFICS environment."
        exit 1
    fi
    
    log_info "GRFICS environment stopped successfully."
}

# Setup network capture
setup_network_capture() {
    log_info "Setting up network capture for GRFICS..."
    
    # Create directory for captures
    mkdir -p "$FORTIPHYD_DIR/captures"
    
    # Start tcpdump in a docker container attached to the GRFICS network
    docker run -d \
        --name grfics-capture \
        --network grfics_default \
        --cap-add=NET_ADMIN \
        --cap-add=NET_RAW \
        -v "$FORTIPHYD_DIR/captures:/captures" \
        alpine:latest \
        /bin/sh -c "apk add --no-cache tcpdump && tcpdump -i any -w /captures/grfics_capture_\$(date +%Y%m%d_%H%M%S).pcap"
    
    if [ $? -ne 0 ]; then
        log_warn "Failed to set up network capture. This is not critical but will limit monitoring capabilities."
    else
        log_info "Network capture started. PCAP files will be saved to $FORTIPHYD_DIR/captures"
    fi
}

# Print usage information
usage() {
    echo "Usage: $0 [OPTION]"
    echo "Sets up and manages the Fortiphyd GRFICS ICS simulation environment."
    echo ""
    echo "Options:"
    echo "  start       Set up and start GRFICS environment"
    echo "  stop        Stop GRFICS environment"
    echo "  restart     Restart GRFICS environment"
    echo "  capture     Start network capture on GRFICS environment"
    echo "  status      Check status of GRFICS environment"
    echo "  help        Display this help message"
    echo ""
}

# Check status of GRFICS environment
check_status() {
    log_info "Checking status of GRFICS environment..."
    
    if [ -d "$GRFICS_DIR" ]; then
        cd "$GRFICS_DIR"
        docker-compose ps
    else
        log_error "GRFICS directory not found at $GRFICS_DIR."
        log_error "Please run '$0 start' to set up the GRFICS environment."
        exit 1
    fi
}

# Main script execution
main() {
    case "$1" in
        start)
            check_prerequisites
            clone_fortiphyd
            patch_grfics_config
            start_grfics
            ;;
        stop)
            stop_grfics
            ;;
        restart)
            stop_grfics
            start_grfics
            ;;
        capture)
            setup_network_capture
            ;;
        status)
            check_status
            ;;
        help|--help|-h)
            usage
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

main "$@" 