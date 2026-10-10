Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "FORMLESS - Docker Build and Deployment Script (PowerShell)" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue

if (-not $dockerCmd) {
    Write-Host "[ERROR] Docker is not installed or not found in system PATH." -ForegroundColor Red
    Write-Host "Please install Docker Desktop for Windows from: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    Write-Host "Ensure Docker Desktop is running before launching this script." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[1/3] Building and starting FORMLESS containers via Docker Compose..." -ForegroundColor Green
docker compose up --build -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker Compose build failed." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[2/3] Checking container statuses..." -ForegroundColor Green
docker compose ps

Write-Host ""
Write-Host "[3/3] Application is ready!" -ForegroundColor Green
Write-Host "-------------------------------------------------------------------------------" -ForegroundColor Gray
Write-Host "Frontend Application:  http://localhost (or http://localhost:5173)" -ForegroundColor White
Write-Host "Backend API Swagger:   http://localhost:8000/docs" -ForegroundColor White
Write-Host "API Health Check:      http://localhost:8000/api/v1/health" -ForegroundColor White
Write-Host "-------------------------------------------------------------------------------" -ForegroundColor Gray
Write-Host "To stream live logs:   docker compose logs -f" -ForegroundColor Yellow
Write-Host "To stop containers:    docker compose down" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to finish"
