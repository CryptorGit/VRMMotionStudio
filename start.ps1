# Docker Compose クイックスタート

Write-Host "=== VRM Motion Studio Docker 環境 ===" -ForegroundColor Cyan
Write-Host ""

# 既存のコンテナを停止・削除
Write-Host "既存のコンテナを停止中..." -ForegroundColor Yellow
docker-compose down -v 2>$null

Write-Host "イメージを再ビルド中..." -ForegroundColor Yellow
docker-compose build --no-cache

Write-Host "コンテナを起動中..." -ForegroundColor Yellow
docker-compose up -d

Write-Host ""
Write-Host "=== 起動完了 ===" -ForegroundColor Green
Write-Host ""
Write-Host "サービスURL:" -ForegroundColor Cyan
Write-Host "  フロントエンド: http://localhost/" -ForegroundColor White
Write-Host "  バックエンドAPI: http://localhost/api/" -ForegroundColor White
Write-Host "  ヘルスチェック: http://localhost/actuator/health" -ForegroundColor White
Write-Host "  ファイル一覧:   http://localhost/public/" -ForegroundColor White
Write-Host "  VRMサンプル:    http://localhost/vrm/" -ForegroundColor White
Write-Host ""
Write-Host "ログを確認:" -ForegroundColor Cyan
Write-Host "  docker-compose logs -f" -ForegroundColor Gray
Write-Host ""
Write-Host "停止:" -ForegroundColor Cyan
Write-Host "  docker-compose down" -ForegroundColor Gray
Write-Host ""

# ログを表示
Write-Host "ログを表示します (Ctrl+C で終了)..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
docker-compose logs -f
