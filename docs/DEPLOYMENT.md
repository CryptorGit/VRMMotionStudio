# Production Deployment Guide / 本番環境デプロイガイド

[English](#english) | [日本語](#japanese)

---

<a name="english"></a>
## 🚀 English

### Overview

This guide covers deploying VRM Motion Studio to production environments, with a focus on AWS infrastructure. The architecture uses Nginx as a reverse proxy gateway with all application services isolated in an internal network.

### Architecture Diagram

```
[Internet]
    ↓
[AWS ALB/CloudFront] (optional)
    ↓
[EC2 / ECS / EKS]
    ↓
[Nginx] :80, :443 ← Only externally exposed ports
    ↓
┌─────────┬─────────────┬──────────┐
↓         ↓             ↓          ↓
[Frontend] [Backend]  [Static]   [Database]
:5174      :8081      Files      :8083
(internal) (internal) (internal) (internal)
```

---

## Prerequisites

### Required Tools
- Docker 20.10+
- Docker Compose 2.0+
- Git
- AWS CLI (for AWS deployment)

### AWS Resources (if deploying to AWS)
- EC2 instance (recommended: t3.medium or larger)
- Security Group configured for ports 80/443
- (Optional) Route 53 domain
- (Optional) ACM or Let's Encrypt SSL certificate
- (Optional) RDS PostgreSQL instance
- (Optional) Application Load Balancer (ALB)

---

## Local Production Build Test

Before deploying to production, test the production build locally:

```powershell
# Set production environment variables
$env:ALLOWED_ORIGINS="https://yourdomain.com"
$env:JWT_SECRET="<strong-random-secret>"
$env:API_KEY="<strong-api-key>"

# Build and start
docker compose up -d --build

# (legacy)
docker-compose up -d --build

# Check logs
docker compose logs -f

# Test
# Open http://localhost in browser
```

---

## AWS EC2 Deployment

### 1. Launch EC2 Instance

**Recommended Specifications:**
- Instance Type: `t3.medium` (2 vCPU, 4 GB RAM) or larger
- AMI: Amazon Linux 2023 or Ubuntu 22.04
- Storage: 20 GB GP3
- Security Group: Allow inbound 80, 443, 22 (SSH)

### 2. Install Docker

**Amazon Linux 2023:**
```bash
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

**Ubuntu 22.04:**
```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu
```

Log out and log back in for group changes to take effect.

### 3. Clone Repository

```bash
git clone https://github.com/CryptorGit/MokuMokuDanceWeb.git
cd MokuMokuDanceWeb
```

### 4. Configure Environment Variables

Create a `.env` file:

```bash
cat > .env << 'EOF'
# CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com

# Security
JWT_SECRET=your-strong-jwt-secret-here-change-this
API_KEY=your-strong-api-key-here-change-this

# Database (if using external PostgreSQL)
SPRING_DATASOURCE_URL=jdbc:postgresql://your-rds-endpoint:5432/vrm_studio
SPRING_DATASOURCE_USERNAME=dbuser
SPRING_DATASOURCE_PASSWORD=dbpassword

# Optional: PostgreSQL container password
POSTGRES_PASSWORD=strong-postgres-password
EOF
```

**Important:** Generate strong secrets:
```bash
# Generate random secret (Linux/macOS)
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 5. Start Services

```bash
docker compose up -d --build
```

### 6. Verify Deployment

```bash
# Check container status
docker compose ps

# Check logs
docker compose logs -f

# Test health endpoints
curl http://localhost/
curl http://localhost/actuator/health
```

---

## HTTPS/SSL Configuration

### Option 1: Let's Encrypt with Certbot

**1. Install Certbot:**

```bash
# Amazon Linux 2023
sudo yum install -y certbot

# Ubuntu
sudo apt install -y certbot
```

**2. Stop Nginx temporarily:**

```bash
docker-compose stop nginx
```

**3. Obtain Certificate:**

```bash
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

**4. Update docker-compose.yml:**

Add volume mount for certificates:

```yaml
nginx:
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf:ro
    - ./public:/usr/share/nginx/html:ro
    - /etc/letsencrypt:/etc/letsencrypt:ro  # Add this line
```

**5. Update nginx.conf:**

Uncomment and configure the HTTPS server block:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # ... rest of location blocks (same as HTTP)
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

**6. Restart Nginx:**

```bash
docker-compose up -d
```

**7. Auto-renewal:**

```bash
# Add to crontab
sudo crontab -e

# Add this line for daily renewal check at 2 AM
0 2 * * * certbot renew --quiet && docker-compose restart nginx
```

### Option 2: AWS Certificate Manager (ACM) with ALB

When using ALB for SSL termination, no changes to Nginx are needed.

**1. Request Certificate in ACM:**
- Navigate to AWS Certificate Manager
- Request public certificate for your domain
- Validate via DNS or email

**2. Create Application Load Balancer:**
- Target: EC2 instance port 80
- Listener: HTTPS (443) with ACM certificate
- Health check: HTTP on port 80, path `/`

**3. Update Security Group:**
- ALB security group: Allow 443 from 0.0.0.0/0
- EC2 security group: Allow 80 from ALB security group only

---

## Database Migration to RDS

For production, migrate from H2 in-memory to RDS PostgreSQL:

### 1. Create RDS PostgreSQL Instance

- Engine: PostgreSQL 15
- Instance class: db.t3.micro (or larger)
- Storage: 20 GB GP3
- Multi-AZ: Recommended for production
- Public access: No (VPC only)

### 2. Update Backend Configuration

Edit `backend/java/src/main/resources/application-prod.properties`:

```properties
spring.datasource.url=jdbc:postgresql://your-rds-endpoint:5432/vrm_studio
spring.datasource.username=dbuser
spring.datasource.password=${DB_PASSWORD}
spring.datasource.driver-class-name=org.postgresql.Driver

spring.jpa.hibernate.ddl-auto=update
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
```

### 3. Add PostgreSQL Dependency

Edit `backend/java/pom.xml`:

```xml
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>
```

### 4. Remove H2 Database Service

Comment out the `database` service in `docker-compose.yml`.

### 5. Set Environment Variable

```bash
export DB_PASSWORD="your-rds-password"
```

### 6. Rebuild and Deploy

```bash
docker-compose up -d --build backend
```

---

## AWS ECS (Fargate) Deployment

### 1. Build and Push Docker Images

```bash
# Login to ECR
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com

# Build and tag images
docker build -t vrm-frontend ./frontend
docker build -t vrm-backend ./backend/java
docker build -t vrm-nginx -f nginx.Dockerfile .

# Tag for ECR
docker tag vrm-frontend:latest <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/vrm-frontend:latest
docker tag vrm-backend:latest <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/vrm-backend:latest
docker tag vrm-nginx:latest <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/vrm-nginx:latest

# Push to ECR
docker push <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/vrm-frontend:latest
docker push <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/vrm-backend:latest
docker push <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/vrm-nginx:latest
```

### 2. Create ECS Task Definition

Create a task definition with:
- Nginx container (image from ECR)
- Frontend container (image from ECR)
- Backend container (image from ECR)

Configure environment variables and secrets using AWS Secrets Manager.

### 3. Create ECS Service

- Launch type: Fargate
- VPC: Your VPC with private subnets
- Load balancer: Application Load Balancer
- Target group: Nginx container port 80

---

## Monitoring and Logging

### CloudWatch Logs

Update `docker-compose.yml` to send logs to CloudWatch:

```yaml
services:
  nginx:
    logging:
      driver: awslogs
      options:
        awslogs-group: /ecs/vrm-motion-studio
        awslogs-region: ap-northeast-1
        awslogs-stream-prefix: nginx
  
  frontend:
    logging:
      driver: awslogs
      options:
        awslogs-group: /ecs/vrm-motion-studio
        awslogs-region: ap-northeast-1
        awslogs-stream-prefix: frontend
```

### Health Checks

- **Frontend**: `http://localhost:5174`
- **Backend**: `http://localhost:8081/actuator/health`
- **Nginx**: `http://localhost:80/`

Configure ALB health checks:
- Protocol: HTTP
- Path: `/health`
- Healthy threshold: 2
- Unhealthy threshold: 3
- Timeout: 5 seconds
- Interval: 30 seconds

---

## Backup Strategy

### Database Backup

**RDS Automated Backups:**
- Retention period: 7-30 days
- Backup window: Off-peak hours
- Enable automated backups in RDS console

**Manual Snapshots:**
```bash
aws rds create-db-snapshot \
  --db-instance-identifier vrm-studio-db \
  --db-snapshot-identifier vrm-studio-snapshot-$(date +%Y%m%d)
```

### Static Files Backup

Sync to S3:

```bash
aws s3 sync ./public s3://vrm-studio-backup/public --delete
```

Automate with cron:
```bash
0 3 * * * aws s3 sync /path/to/public s3://vrm-studio-backup/public --delete
```

---

## Performance Optimization

### 1. Use CloudFront CDN

- Origin: ALB or S3
- Cache static assets (`/public/`, `/assets/`)
- Enable gzip/brotli compression

### 2. Database Connection Pooling

Edit `application-prod.properties`:

```properties
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=30000
```

### 3. Enable Redis Cache (Optional)

For session storage and API response caching:

```bash
# Add Redis container
docker run -d --name redis -p 6379:6379 redis:alpine
```

Update backend to use Redis for caching.

---

## Security Checklist

- [ ] Change default JWT_SECRET and API_KEY
- [ ] Use strong database passwords
- [ ] Enable HTTPS/SSL
- [ ] Restrict CORS to production domain only
- [ ] Configure security groups (only 80/443 from internet)
- [ ] Enable CloudWatch logging
- [ ] Set up AWS WAF (optional, for DDoS protection)
- [ ] Regular security updates (`docker-compose pull && docker-compose up -d`)
- [ ] Use AWS Secrets Manager for sensitive data
- [ ] Enable RDS encryption at rest
- [ ] Regular backups and disaster recovery testing

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs <service-name>

# Restart service
docker-compose restart <service-name>
```

### Nginx Routing Issues

```bash
# Test Nginx configuration
docker-compose exec nginx nginx -t

# Reload Nginx
docker-compose exec nginx nginx -s reload
```

### Database Connection Failed

- Check RDS security group allows EC2 security group
- Verify connection string and credentials
- Check RDS endpoint is accessible from EC2

### High Memory Usage

- Scale EC2 instance vertically
- Use ECS with auto-scaling
- Enable application-level caching

---

<a name="japanese"></a>
## 🚀 日本語

### 概要

本ガイドでは、VRM Motion Studioを本番環境にデプロイする方法を、AWSインフラを中心に解説します。アーキテクチャはNginxをリバースプロキシゲートウェイとして使用し、すべてのアプリケーションサービスを内部ネットワークに隔離します。

### アーキテクチャ図

```
[インターネット]
    ↓
[AWS ALB/CloudFront] (オプション)
    ↓
[EC2 / ECS / EKS]
    ↓
[Nginx] :80, :443 ← 外部公開ポートはこれのみ
    ↓
┌─────────┬─────────────┬──────────┐
↓         ↓             ↓          ↓
[フロント] [バックエンド] [静的]   [データベース]
:5174      :8081      ファイル   :8083
(内部)     (内部)     (内部)     (内部)
```

---

## 前提条件

### 必要なツール
- Docker 20.10以上
- Docker Compose 2.0以上
- Git
- AWS CLI（AWS展開の場合）

### AWSリソース（AWSにデプロイする場合）
- EC2インスタンス（推奨: t3.medium以上）
- ポート80/443を許可したセキュリティグループ
- （オプション）Route 53ドメイン
- （オプション）ACMまたはLet's Encrypt SSL証明書
- （オプション）RDS PostgreSQLインスタンス
- （オプション）Application Load Balancer（ALB）

---

## ローカル本番ビルドテスト

本番環境にデプロイする前に、ローカルで本番ビルドをテストします:

```powershell
# 本番環境変数を設定
$env:ALLOWED_ORIGINS="https://yourdomain.com"
$env:JWT_SECRET="<強力なランダムシークレット>"
$env:API_KEY="<強力なAPIキー>"

# ビルドと起動
docker compose up -d --build

# （旧表記）
docker-compose up -d --build

# ログ確認
docker compose logs -f

# テスト
# ブラウザでhttp://localhostを開く
```

---

## AWS EC2 デプロイ

### 1. EC2インスタンスの起動

**推奨スペック:**
- インスタンスタイプ: `t3.medium`（2 vCPU、4 GB RAM）以上
- AMI: Amazon Linux 2023 または Ubuntu 22.04
- ストレージ: 20 GB GP3
- セキュリティグループ: インバウンド 80、443、22（SSH）を許可

### 2. Dockerのインストール

**Amazon Linux 2023:**
```bash
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Docker Composeのインストール
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

**Ubuntu 22.04:**
```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu
```

グループ変更を有効にするため、ログアウトして再ログインします。

### 3. リポジトリのクローン

```bash
git clone https://github.com/CryptorGit/MokuMokuDanceWeb.git
cd MokuMokuDanceWeb
```

### 4. 環境変数の設定

`.env`ファイルを作成:

```bash
cat > .env << 'EOF'
# CORS設定
ALLOWED_ORIGINS=https://yourdomain.com

# セキュリティ
JWT_SECRET=ここに強力なJWTシークレットを設定-変更必須
API_KEY=ここに強力なAPIキーを設定-変更必須

# データベース（外部PostgreSQL使用時）
SPRING_DATASOURCE_URL=jdbc:postgresql://your-rds-endpoint:5432/vrm_studio
SPRING_DATASOURCE_USERNAME=dbuser
SPRING_DATASOURCE_PASSWORD=dbpassword

# オプション: PostgreSQLコンテナパスワード
POSTGRES_PASSWORD=強力なpostgresパスワード
EOF
```

**重要:** 強力なシークレットを生成:
```bash
# ランダムシークレット生成（Linux/macOS）
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 5. サービスの起動

```bash
docker compose up -d --build
```

### 6. デプロイの確認

```bash
# コンテナ状態確認
docker compose ps

# ログ確認
docker compose logs -f

# ヘルスエンドポイントテスト
curl http://localhost/
curl http://localhost/actuator/health
```

---

## HTTPS/SSL 設定

### オプション1: Let's EncryptとCertbot

**1. Certbotのインストール:**

```bash
# Amazon Linux 2023
sudo yum install -y certbot

# Ubuntu
sudo apt install -y certbot
```

**2. Nginxを一時停止:**

```bash
docker-compose stop nginx
```

**3. 証明書の取得:**

```bash
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

**4. docker-compose.ymlの更新:**

証明書のボリュームマウントを追加:

```yaml
nginx:
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf:ro
    - ./public:/usr/share/nginx/html:ro
    - /etc/letsencrypt:/etc/letsencrypt:ro  # この行を追加
```

**5. nginx.confの更新:**

HTTPSサーバーブロックのコメントを解除して設定:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # ... locationブロックは残りの部分（HTTPと同じ）
}

# HTTPからHTTPSへのリダイレクト
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

**6. Nginxの再起動:**

```bash
docker-compose up -d
```

**7. 自動更新:**

```bash
# cronに追加
sudo crontab -e

# 毎日午前2時に更新チェックを行う行を追加
0 2 * * * certbot renew --quiet && docker-compose restart nginx
```

### オプション2: AWS Certificate Manager (ACM) + ALB

ALBでSSL終端する場合、Nginxへの変更は不要です。

**1. ACMで証明書をリクエスト:**
- AWS Certificate Managerに移動
- ドメインのパブリック証明書をリクエスト
- DNSまたはメールで検証

**2. Application Load Balancerの作成:**
- ターゲット: EC2インスタンスのポート80
- リスナー: ACM証明書付きHTTPS（443）
- ヘルスチェック: ポート80のHTTP、パス `/health`

**3. セキュリティグループの更新:**
- ALBセキュリティグループ: 0.0.0.0/0から443を許可
- EC2セキュリティグループ: ALBセキュリティグループからのみ80を許可

---

## RDSへのデータベース移行

本番環境では、H2インメモリからRDS PostgreSQLに移行します:

### 1. RDS PostgreSQLインスタンスの作成

- エンジン: PostgreSQL 15
- インスタンスクラス: db.t3.micro（またはそれ以上）
- ストレージ: 20 GB GP3
- Multi-AZ: 本番環境では推奨
- パブリックアクセス: なし（VPCのみ）

### 2. バックエンド設定の更新

`backend/java/src/main/resources/application-prod.properties`を編集:

```properties
spring.datasource.url=jdbc:postgresql://your-rds-endpoint:5432/vrm_studio
spring.datasource.username=dbuser
spring.datasource.password=${DB_PASSWORD}
spring.datasource.driver-class-name=org.postgresql.Driver

spring.jpa.hibernate.ddl-auto=update
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
```

### 3. PostgreSQL依存関係の追加

`backend/java/pom.xml`を編集:

```xml
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>
```

### 4. H2データベースサービスの削除

`docker-compose.yml`の`database`サービスをコメントアウト。

### 5. 環境変数の設定

```bash
export DB_PASSWORD="your-rds-password"
```

### 6. 再ビルドとデプロイ

```bash
docker-compose up -d --build backend
```

---

## セキュリティチェックリスト

- [ ] デフォルトのJWT_SECRETとAPI_KEYを変更
- [ ] 強力なデータベースパスワードを使用
- [ ] HTTPS/SSLを有効化
- [ ] CORSを本番ドメインのみに制限
- [ ] セキュリティグループを設定（インターネットから80/443のみ）
- [ ] CloudWatchログを有効化
- [ ] AWS WAFを設定（オプション、DDoS保護用）
- [ ] 定期的なセキュリティ更新（`docker-compose pull && docker-compose up -d`）
- [ ] 機密データにAWS Secrets Managerを使用
- [ ] RDS暗号化を有効化
- [ ] 定期的なバックアップと災害復旧テスト

---

## トラブルシューティング

### コンテナが起動しない

```bash
# ログ確認
docker-compose logs <service-name>

# サービス再起動
docker-compose restart <service-name>
```

### Nginxルーティング問題

```bash
# Nginx設定テスト
docker-compose exec nginx nginx -t

# Nginxリロード
docker-compose exec nginx nginx -s reload
```

### データベース接続失敗

- RDSセキュリティグループがEC2セキュリティグループを許可しているか確認
- 接続文字列と認証情報を検証
- RDSエンドポイントがEC2からアクセス可能か確認

### メモリ使用量が高い

- EC2インスタンスを垂直スケーリング
- 自動スケーリング機能付きECSを使用
- アプリケーションレベルのキャッシングを有効化
