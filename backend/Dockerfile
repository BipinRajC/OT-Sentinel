FROM python:3.11-slim

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    GOOGLE_GEMINI_API_KEY=AIzaSyC-eF8ERBW2Qqa-rTxM5RECrEIrGk7HXkU \
    REDIS_HOST=redis \
    REDIS_PORT=6379 \
    REDIS_DB=0 \
    MODBUS_HOST=192.168.95.2 \
    MODBUS_PORT=502 \
    MODBUS_UNIT_ID=1 \
    DATABASE_URL=postgresql://icsuser:icspassword@postgres:5432/ics_security

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        netcat-openbsd \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend application
COPY backend/ /app/
COPY industrial_data.py /app/
COPY simple_api.py /app/
COPY trained_models/ /app/trained_models/

# Create necessary directories
RUN mkdir -p /app/data /app/logs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Expose the port
EXPOSE 8000

# Run the full API with industrial process endpoints
CMD ["python", "-m", "uvicorn", "simple_api:app", "--host", "0.0.0.0", "--port", "8000"]