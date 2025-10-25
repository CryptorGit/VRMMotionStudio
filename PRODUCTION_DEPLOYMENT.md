# 本番環境デプロイガイド（AWS想定）

## アーキテクチャ概要

本アプリケーションは、Nginxをリバースプロキシとして使用し、すべての外部リクエストを制御する構成となっています。

```
[インターネット]
      ↓
  [AWS ALB/CloudFront] (オプション)
      ↓
[EC2 / ECS / EKS]
      ↓
   [Nginx] :80, :443 ← **外部公開ポートはこれのみ**
      ↓
   ┌─────────┬─────────────┬──────────┐
   ↓         ↓             ↓          ↓
[Frontend] [Backend]  [Static]   [Database]
 :5174      :8081      Files      :8083
(内部のみ) (内部のみ)  (内部のみ)  (内部のみ)
```

## セキュリティ設計

### ポート制御
- **外部公開**: 80番（HTTP）、443番（HTTPS）のみ
- **内部通信**: コンテナネットワーク経由で各サービス間通信
- **データベース**: 完全に内部ネットワークに隔離

### ネットワーク分離
- すべてのアプリケーションサービスは`expose`で内部公開のみ
- Nginxが唯一の外部公開サービス（ゲートウェイ）
- AWSセキュリティグループで80/443以外の受信を拒否

## デプロイ手順

### 1. 前提条件
- Docker & Docker Composeがインストール済み
- AWS EC2インスタンス（推奨: t3.medium以上）
- セキュリティグループで80/443ポートを許可
- （オプション）Route 53でドメイン設定済み
- （オプション）ACM/Let's Encryptで SSL証明書取得済み

### 2. リポジトリクローン
```bash
git clone <repository-url>
cd MokuMokuDanceWeb
```

### 3. 環境変数設定
本番環境用の環境変数を設定（必要に応じて`.env`ファイル作成）:
```bash
# バックエンド認証設定
export ALLOWED_ORIGINS="https://yourdomain.com"
export JWT_SECRET="<strong-random-secret>"
export API_KEY="<strong-api-key>"

# データベース設定（本番用に強化）
export POSTGRES_PASSWORD="<strong-password>"
```

### 4. Docker Composeで起動
```bash
# イメージビルド＆起動
docker-compose up -d --build

# ログ確認
docker-compose logs -f

# ステータス確認
docker-compose ps
```

### 5. ヘルスチェック
```bash
# Nginxヘルスチェック
curl http://localhost/health

# バックエンドAPI確認（Nginx経由）
curl http://localhost/api/actuator/health
```

## HTTPS対応

### Let's Encrypt（Certbot）を使用する場合

1. **Certbotインストール**
```bash
sudo apt-get update
sudo apt-get install certbot
```

2. **証明書取得**
```bash
sudo certbot certonly --standalone -d yourdomain.com
```

3. **証明書をNginxにマウント**
`docker-compose.yml`のnginxサービスに追加:
```yaml
nginx:
  volumes:
    - /etc/letsencrypt:/etc/letsencrypt:ro
```

4. **nginx.confのHTTPSブロックを有効化**
コメントアウトを解除し、証明書パスを修正:
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # 以下、HTTPと同じlocation設定
}
```

5. **HTTP→HTTPSリダイレクト追加**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### ACM（AWS Certificate Manager）を使用する場合

ALB/CloudFrontでSSL終端を行う場合、Nginx側ではHTTPのみで問題ありません。
ALBのターゲットグループでEC2の80番ポートを指定してください。

## AWS推奨構成

### EC2 + ALB構成
```
[Route 53]
    ↓
[ALB (HTTPS:443)]
    ↓
[Target Group → EC2:80]
    ↓
[Nginx Container :80]
```

**メリット**:
- ALBでSSL終端（ACM証明書使用）
- Auto Scalingと組み合わせ可能
- ヘルスチェック自動化

### ECS Fargate構成
```
[Route 53]
    ↓
[ALB (HTTPS:443)]
    ↓
[ECS Service (Fargate)]
  - Nginx Task
  - Frontend Task
  - Backend Task
  - Database Task (or RDS)
```

**メリット**:
- サーバーレスコンテナ実行
- 自動スケーリング
- 高可用性

## モニタリング

### CloudWatch Logsへの転送
`docker-compose.yml`に追加:
```yaml
logging:
  driver: awslogs
  options:
    awslogs-group: /ecs/vrm-motion-studio
    awslogs-region: ap-northeast-1
    awslogs-stream-prefix: nginx
```

### メトリクス収集
- CloudWatch Agent導入でコンテナメトリクス収集
- Application Load Balancerメトリクス監視

## バックアップ戦略

### データベースバックアップ
本番環境ではRDSへの移行を推奨:
```yaml
# docker-compose.ymlでRDS接続に変更
environment:
  - SPRING_DATASOURCE_URL=jdbc:postgresql://your-rds-endpoint:5432/dbname
  - SPRING_DATASOURCE_USERNAME=dbuser
  - SPRING_DATASOURCE_PASSWORD=${DB_PASSWORD}
```

### 静的ファイルバックアップ
S3へのバックアップスクリプト:
```bash
aws s3 sync ./public s3://your-backup-bucket/public --delete
```

## トラブルシューティング

### コンテナが起動しない
```bash
# ログ確認
docker-compose logs <service-name>

# コンテナ再起動
docker-compose restart <service-name>
```

### Nginxでルーティングエラー
```bash
# Nginx設定テスト
docker-compose exec nginx nginx -t

# Nginxリロード
docker-compose exec nginx nginx -s reload
```

### パフォーマンス問題
- EC2インスタンスタイプのスケールアップ
- Auto Scalingグループの設定
- CloudFrontでのキャッシング導入

## セキュリティチェックリスト

- [ ] 80/443以外のポートは外部から遮断
- [ ] 強力なJWT_SECRET/API_KEYを設定
- [ ] データベースパスワードを変更
- [ ] HTTPS化完了
- [ ] CORSの許可オリジンを本番ドメインに制限
- [ ] CloudWatch Logsで監査ログ記録
- [ ] IAMロールで最小権限の原則を適用
- [ ] セキュリティグループで厳格なインバウンドルール

## スケーリング戦略

### 水平スケーリング
- ALB + Auto Scalingグループで複数EC2インスタンス
- 静的ファイルをS3 + CloudFrontに移行
- データベースをRDSに移行（Multi-AZ構成）

### 垂直スケーリング
- EC2インスタンスタイプの変更（t3 → c5/m5系）
- RDSのインスタンスクラス変更

---

**注意**: 本番環境では必ずHTTPS化し、環境変数を適切に管理してください。
