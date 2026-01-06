FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for lighter-sdk native binaries
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app.py .

# Environment variables (override at runtime)
ENV LIGHTER_API_KEY=""
ENV LIGHTER_ACCOUNT_INDEX="0"
ENV LIGHTER_API_KEY_INDEX="3"
ENV LIGHTER_ENVIRONMENT="mainnet"
ENV FLASK_PORT="3001"
ENV API_SECRET=""

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Run with gunicorn for production
CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:3001", "--timeout", "120", "app:app"]
