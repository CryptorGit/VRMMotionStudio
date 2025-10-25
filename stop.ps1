# Docker Compose 停止スクリプト

Write-Host "=== VRM Motion Studio Docker 環境を停止 ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "コンテナを停止中..." -ForegroundColor Yellow
docker-compose down

Write-Host ""
Write-Host "=== 停止完了 ===" -ForegroundColor Green
Write-Host ""
Write-Host "再起動する場合:" -ForegroundColor Cyan
Write-Host "  .\start.ps1" -ForegroundColor Gray
Write-Host ""
