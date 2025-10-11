# MokuMokuDanceWeb Backend Startup Script
# Usage: .\start-backend.ps1

Write-Host "Starting MokuMokuDanceWeb Backend..." -ForegroundColor Green

# Check if JAR exists
$jarPath = ".\java\target\java-0.1.0.jar"
if (-not (Test-Path $jarPath)) {
    Write-Host "Error: JAR file not found at $jarPath" -ForegroundColor Red
    Write-Host "Building the project first..." -ForegroundColor Yellow
    
    Push-Location java
    mvn clean package -DskipTests
    Pop-Location
    
    if (-not (Test-Path $jarPath)) {
        Write-Host "Build failed. Please check for errors." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Starting Spring Boot application..." -ForegroundColor Cyan
java -jar $jarPath --spring.profiles.active=local

