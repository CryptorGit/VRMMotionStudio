# Docker Compose セットアップガイド

## ポート設定

このプロジェクトでは以下のポートマッピングを使用します：

| サービス | コンテナポート | ホストポート | URL |
|---------|--------------|------------|-----|
| フロントエンド | 5174 | 1301 | http://localhost:1301 |
| バックエンド | 8081 | 1311 | http://localhost:1311 |
| ファイルサーバ | 8084 | 1314 | http://localhost:1314 |
| データベース | 5432 | 5432 | localhost:5432 |

## 起動方法

### 全サービスを起動

```powershell
docker-compose up -d
```

### 特定のサービスのみ起動

```powershell
# フロントエンドのみ
docker-compose up -d frontend

# バックエンドのみ
docker-compose up -d backend

# ファイルサーバのみ
docker-compose up -d fileserver
```

### ログを確認

```powershell
# 全サービスのログ
docker-compose logs -f

# 特定のサービスのログ
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f fileserver
```

## 停止方法

### 全サービスを停止

```powershell
docker-compose down
```

### ボリュームも削除して停止

```powershell
docker-compose down -v
```

## 再ビルド

コードを変更した後、イメージを再ビルドする場合：

```powershell
# 全サービスを再ビルド
docker-compose build

# 特定のサービスのみ再ビルド
docker-compose build frontend
docker-compose build backend

# 再ビルドして起動
docker-compose up -d --build
```

## 開発時の注意事項

### フロントエンド
- ホットリロードが有効です
- `frontend/`ディレクトリの変更は自動的に反映されます
- `node_modules`はコンテナ内に保持されます

### バックエンド
- コードを変更した場合は再ビルドが必要です
- `mvn`の依存関係キャッシュは`~/.m2`にマウントされます

### ファイルサーバ
- `public/`ディレクトリにファイルを配置すると即座に配信されます
- VRMモデルファイルなどの静的リソースを配置してください

## トラブルシューティング

### ポートが既に使用されている場合

```powershell
# 使用中のポートを確認
netstat -ano | findstr "1301"
netstat -ano | findstr "1311"
netstat -ano | findstr "1314"

# プロセスを停止するか、docker-compose.ymlのホストポートを変更
```

### コンテナが起動しない場合

```powershell
# コンテナの状態を確認
docker-compose ps

# エラーログを確認
docker-compose logs

# コンテナを完全に削除して再起動
docker-compose down -v
docker-compose up -d --build
```

### データベース接続エラー

```powershell
# データベースコンテナが起動しているか確認
docker-compose ps db

# データベースに接続してテスト
docker-compose exec database psql -U vrm_studio_user -d vrm_motion_studio
```

## 環境変数のカスタマイズ

`.env`ファイルを作成して環境変数を上書きできます：

```env
# .env
POSTGRES_DB=mydb
POSTGRES_USER=myuser
POSTGRES_PASSWORD=mypassword
VITE_API_BASE_URL=http://localhost:1311
```

## プロダクション環境

プロダクション用のビルドを作成する場合：

```powershell
# フロントエンドのプロダクションビルド
cd frontend
npm run build

# バックエンドのプロダクションビルド
cd backend/java
mvn clean package -DskipTests
```

プロダクション用の`docker-compose.prod.yml`を作成することをお勧めします。

## 参考リンク

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Vite Configuration](https://vitejs.dev/config/)
- [Spring Boot Docker](https://spring.io/guides/gs/spring-boot-docker/)
