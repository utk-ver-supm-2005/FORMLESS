# ==============================================================================
# FORMLESS All-In-One Unified Dockerfile
# Compiles both Frontend and Backend into a single self-contained image
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Frontend SPA
# ------------------------------------------------------------------------------
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Python Backend + Nginx Reverse Proxy
# ------------------------------------------------------------------------------
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Install Nginx and curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend code and database
COPY backend/app/ ./app/
COPY backend/formless.db ./formless.db
COPY backend/pytest.ini ./pytest.ini

# Copy compiled frontend from Stage 1 into Nginx web root
RUN rm -rf /var/www/html/*
COPY --from=frontend-builder /app/dist /var/www/html

# Configure Nginx for All-in-One routing
COPY <<-"EOF" /etc/nginx/sites-available/default
server {
    listen 80 default_server;
    server_name _;
    client_max_body_size 50M;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /docs {
        proxy_pass http://127.0.0.1:8000/docs;
        proxy_set_header Host $host;
    }

    location /openapi.json {
        proxy_pass http://127.0.0.1:8000/openapi.json;
        proxy_set_header Host $host;
    }

    location / {
        root /var/www/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }
}
EOF

# Ensure required directories exist
RUN mkdir -p /app/uploads /app/data

# Copy entrypoint script
COPY <<-"EOF" /app/entrypoint.sh
#!/bin/sh
set -e

# Start FastAPI backend in background
uvicorn app.main:app --host 127.0.0.1 --port 8000 &

# Start Nginx in foreground
nginx -g "daemon off;"
EOF

RUN chmod +x /app/entrypoint.sh

EXPOSE 80 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/api/v1/health || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
