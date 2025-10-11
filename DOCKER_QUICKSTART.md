# 🎭 MokuMoku Dance Web - Docker環境

## ✅ 起動成功！

すべてのサービスが正常に起動しています。

## 🌐 アクセスURL

| サービス | URL | 説明 |
|---------|-----|------|
| **フロントエンド** | http://localhost:1301 | Vue.js + Vite開発サーバ |
| **バックエンド** | http://localhost:1311 | Spring Boot API |
| **ファイルサーバ** | http://localhost:1314 | 静的ファイル配信 (Nginx) |
| **Health Check** | http://localhost:1311/actuator/health | バックエンドのヘルスチェック |

## 🚀 よく使うコマンド

### 起動・停止

```powershell
# 簡単起動（推奨）
.\start.ps1

# 簡単停止
.\stop.ps1

# 手動起動
docker-compose up -d

# 手動停止
docker-compose down
```

### ログ確認

```powershell
# 全サービスのログをフォロー
docker-compose logs -f

# フロントエンドのみ
docker-compose logs -f frontend

# バックエンドのみ
docker-compose logs -f backend

# 最新20行のみ表示
docker-compose logs --tail 20
```

### 状態確認

```powershell
# コンテナの状態
docker-compose ps

# 詳細情報
docker ps -a
```

### 再起動

```powershell
# 特定のサービスを再起動
docker-compose restart frontend
docker-compose restart backend

# 全サービスを再起動
docker-compose restart
```

### 再ビルド

```powershell
# コードを変更した後
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# または一行で
docker-compose up -d --build --force-recreate
```

## 📁 ディレクトリ構成

```
MokuMokuDanceWeb/
├── docker-compose.yml      # Docker Compose設定
├── start.ps1               # 起動スクリプト
├── stop.ps1                # 停止スクリプト
├── nginx.conf              # Nginx設定
├── public/                 # 静的ファイル配信用
│   └── index.html
├── frontend/
│   ├── Dockerfile          # フロントエンド用
│   └── src/
└── backend/java/
    ├── Dockerfile          # バックエンド用
    ├── pom.xml
    └── src/
```

## 🔧 トラブルシューティング

### ポートが使用中の場合

```powershell
# ポートを使用しているプロセスを確認
netstat -ano | findstr "1301"
netstat -ano | findstr "1311"
netstat -ano | findstr "1314"

# プロセスを停止
Stop-Process -Id <PID> -Force
```

### コンテナが起動しない

```powershell
# ログでエラーを確認
docker-compose logs

# コンテナを完全にクリーンアップして再起動
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### フロントエンドのホットリロードが効かない

```powershell
# Viteのキャッシュをクリア
docker-compose exec frontend npm run dev -- --force

# またはコンテナを再起動
docker-compose restart frontend
```

### バックエンドのコードを変更した場合

```powershell
# 必ず再ビルドが必要
docker-compose build backend
docker-compose up -d backend
```

## 📝 環境変数

現在の設定:

```yaml
# フロントエンド
NODE_ENV=development
VITE_API_BASE_URL=http://localhost:1311

# バックエンド
SPRING_PROFILES_ACTIVE=dev
SERVER_PORT=8081
```

カスタマイズする場合は`.env`ファイルを作成してください。

## 🎯 次のステップ

1. ブラウザで http://localhost:1301 を開く
2. VRMモデルをロード
3. アニメーションを作成

## 📚 詳細ドキュメント

- [Docker セットアップガイド](DOCKER_SETUP.md)
- [プロジェクト README](README.md)

---

**問題が発生した場合**: ログを確認 `docker-compose logs -f`
