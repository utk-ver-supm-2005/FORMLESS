# FORMLESS Docker Compilation & Deployment Guide

This guide describes how to compile, build, and deploy the entire **FORMLESS Compliance Engine** using Docker.

---

## 📁 Docker Architecture

FORMLESS provides two production-grade containerization strategies:

### 1. Multi-Service Container Architecture (`docker-compose.yml`) — Recommended
- **Backend Service (`formless-backend`)**:
  - Python 3.12-slim runtime
  - Installs all requirements from `backend/requirements.txt` (`fastapi`, `uvicorn`, `sqlmodel`, `pydantic`, `google-genai`, `pypdf`, etc.)
  - Healthchecked against `/api/v1/health`
  - Persistent volume for SQLite data & uploads
  - Exposes port `8000`
- **Frontend Service (`formless-frontend`)**:
  - Multi-stage Dockerfile: compiles React + Vite with Node 22, then bundles into lightweight Nginx
  - Installs all npm requirements with `npm ci`
  - Serves static assets with gzip compression & caching
  - Reverse-proxies `/api/` to backend at `http://backend:8000` (eliminates CORS issues)
  - Exposes ports `80` and `5173`

### 2. Single Unified Container (`Dockerfile`)
- Multi-stage build compiling frontend assets and bundling Python backend with Nginx into a single standalone container image.

---

## 🚀 Quick Start with Docker

### Prerequisites
1. Install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/).
2. Start Docker Desktop and verify:
   ```powershell
   docker --version
   docker compose version
   ```

### 1. Build and Run (Multi-Service Production)
From the project root directory:

```powershell
# Build and start all services in the background
docker compose up --build -d
```
Or simply double-click / run:
```powershell
.\docker-build.bat
```

### 2. Verify Running Containers
```powershell
docker compose ps
```

### 3. Access the Application
- **Frontend Web UI**: [http://localhost](http://localhost) or [http://localhost:5173](http://localhost:5173)
- **Backend Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Health Check**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

### 4. Viewing Logs
```powershell
# View logs from all services
docker compose logs -f

# View backend logs only
docker compose logs -f backend

# View frontend logs only
docker compose logs -f frontend
```

### 5. Stopping the Containers
```powershell
docker compose down
```

---

## 🛠️ Development Mode with Hot-Reloading

To run with live code changes reflected inside the containers:
```powershell
docker compose -f docker-compose.dev.yml up --build
```

---

## 📦 Single-Container Build (Alternative)

To build and run everything in a single container:
```powershell
# Build the unified image
docker build -t formless-app .

# Run the unified container
docker run -d -p 80:80 -p 8000:8000 --name formless formless-app
```

---

## 📋 Requirements Summary

### Backend Requirements (`backend/requirements.txt`)
- `fastapi>=0.115.0`
- `uvicorn[standard]>=0.30.0`
- `sqlmodel>=0.0.22`
- `pydantic>=2.9.0`
- `google-genai>=1.0.0`
- `python-multipart>=0.0.12`
- `python-dotenv>=1.0.0`
- `httpx>=0.27.0`
- `pytest>=8.3.0`
- `pytest-asyncio>=0.24.0`
- `pypdf>=5.0.0`

### Frontend Requirements (`frontend/package.json`)
- `react: ^19.2.8`
- `react-dom: ^19.2.8`
- `react-router-dom: ^7.18.4`
- `@xyflow/react: ^12.12.0`
- `lucide-react: ^1.54.0`
- `motion: ^14.0.0`
- `vite: ^8.3.0`
- `oxlint: ^1.81.0`

---

## 🧪 Local Testing Verification

Both test suites and builds have been verified:
- **Backend Tests**: 70/70 passing (`pytest backend/tests`)
- **Frontend Tests**: 152/152 passing (`node --test tests/*.test.js`)
- **Frontend Build**: Vite client build successfully compiled into `frontend/dist`
