#!/bin/bash
# Docker container entrypoint script

# Exit on any error
set -e

# Log function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Handle special case for container type
CONTAINER_TYPE=${CONTAINER_TYPE:-unknown}

log "Starting container: ${CONTAINER_TYPE}"

# Execute based on container type
case "${CONTAINER_TYPE}" in
    ics-lab)
        log "Initializing ICS Lab environment"
        # Create necessary directories
        mkdir -p /app/data /app/logs
        
        # Start services based on parameters
        if [ "${START_MODBUS_SERVER}" = "true" ]; then
            log "Starting Modbus TCP server"
            python3 /app/simulation/modbus_server.py &
        fi
        
        if [ "${START_RTU_SIMULATION}" = "true" ]; then
            log "Starting RTU simulation"
            python3 /app/simulation/rtu_simulation.py &
        fi
        
        # Execute command or start supervisord
        if [ $# -gt 0 ]; then
            exec "$@"
        else
            log "Starting supervisord"
            exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
        fi
        ;;
        
    pfsense-inline)
        log "Initializing Network Security Monitoring"
        
        # Setup network interfaces for monitoring
        if [ "${ENABLE_INLINE_MODE}" = "true" ]; then
            log "Configuring network interfaces for inline mode"
            ip link set eth0 up
            ip link set eth1 up
            # Additional network setup as needed
        fi
        
        # Start IDS services if enabled
        if [ "${START_SURICATA}" = "true" ]; then
            log "Starting Suricata IDS"
            suricata -c /etc/suricata/suricata.yaml -i eth0 &
        fi
        
        if [ "${START_ZEEK}" = "true" ]; then
            log "Starting Zeek Network Monitor"
            /usr/local/zeek/bin/zeek -i eth0 local
        fi
        
        # Execute command or start supervisord
        if [ $# -gt 0 ]; then
            exec "$@"
        else
            log "Starting supervisord"
            exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
        fi
        ;;
        
    jupyter-ml)
        log "Initializing Jupyter ML environment"
        
        # Create necessary directories
        mkdir -p /app/notebooks /app/data /app/models /app/results
        
        # Set permissions
        chown -R jupyter:jupyter /app
        
        # Execute command or start Jupyter
        if [ $# -gt 0 ]; then
            exec "$@"
        else
            log "Starting Jupyter Lab"
            su -c "jupyter lab --ip=0.0.0.0 --port=8888 --no-browser --NotebookApp.token='' --NotebookApp.password=''" jupyter
        fi
        ;;
        
    *)
        log "Unknown container type: ${CONTAINER_TYPE}"
        
        # Execute passed command or default to bash
        if [ $# -gt 0 ]; then
            exec "$@"
        else
            exec /bin/bash
        fi
        ;;
esac 