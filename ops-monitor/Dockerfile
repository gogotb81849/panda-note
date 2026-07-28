# ============================================================
# 熊猫笔记 - 运维监控面板 Dockerfile
# Python 3.12-slim, install pip deps, copy source, expose 8899
# ============================================================

FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY server.py ./
COPY audit_log.jsonl ./
COPY static ./static

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 8899

# Start the FastAPI/uvicorn server
CMD ["python", "-m", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8899"]