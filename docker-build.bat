@echo off
echo ===============================================================================
echo FORMLESS - Docker Build and Deployment Script
echo ===============================================================================
echo.

docker --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker is not detected in your PATH or is not installed.
    echo Please install Docker Desktop for Windows from: https://www.docker.com/products/docker-desktop/
    echo Make sure Docker Desktop is started and running before re-running this script.
    echo.
    pause
    exit /b 1
)

echo [1/3] Building and starting FORMLESS multi-service containers...
docker compose up --build -d

if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker compose build failed. Check the output above.
    pause
    exit /b 1
)

echo.
echo [2/3] Checking container statuses...
docker compose ps

echo.
echo [3/3] Application is ready!
echo -------------------------------------------------------------------------------
echo Frontend Web App:  http://localhost (or http://localhost:5173)
echo Backend API Docs:  http://localhost:8000/docs
echo Health Check:      http://localhost:8000/api/v1/health
echo -------------------------------------------------------------------------------
echo To view live logs:    docker compose logs -f
echo To stop containers:   docker compose down
echo.
pause
