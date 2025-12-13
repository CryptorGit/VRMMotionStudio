# API Reference / API リファレンス

[English](#english) | [日本語](#japanese)

---

<a name="english"></a>
## 🔌 English

### Base URL

- **Development (direct backend)**: `http://localhost:8081/api`
- **Production (via Nginx)**: `https://yourdomain.com/api`

For health checks (Actuator):
- **Development (direct backend)**: `http://localhost:8081/actuator/health`
- **Production (via Nginx)**: `https://yourdomain.com/actuator/health`

### Authentication

The API supports two authentication methods:

#### 1. JWT Token (Bearer Authentication)

```http
Authorization: Bearer <JWT_TOKEN>
```

#### 2. API Key (Direct)

```http
Authorization: <API_KEY>
```

**Environment Variables:**
- `JWT_SECRET`: Secret key for JWT signing/verification
- `API_KEY`: Fixed API key for simple authentication
- `ALLOWED_ORIGINS`: CORS allowed origins (comma-separated)

---

## Endpoints

### Health Check

#### GET `/actuator/health`

Check the health status of the backend service.

**Authentication**: None required

**Response**: `200 OK`

```json
{
  "status": "UP"
}
```

**Example:**
```bash
curl http://localhost:8081/actuator/health
```

---

### User Greeting

#### GET `/users/{id}/greeting`

Retrieve a greeting message for a specific user.

**Authentication**: Required (JWT or API Key)

**Path Parameters:**
- `id` (Long): User ID

**Response**: `200 OK`

```json
{
  "message": "Hello, {username}!"
}
```

**Errors:**
- `401 Unauthorized`: Invalid or missing authentication
- `404 Not Found`: User with specified ID does not exist

**Example:**

With API Key:
```bash
curl -H "Authorization: dev-api-key" \
  http://localhost:8081/api/users/1/greeting
```

With JWT Token:
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  http://localhost:8081/api/users/1/greeting
```

---

### Log Receiver (Optional - Python Service)

#### POST `/log`

Receive log messages from the frontend for debugging purposes.

**Authentication**: None required (development only)

**Request Body:**

```json
{
  "level": "info",
  "message": "User loaded VRM model",
  "timestamp": "2025-10-31T12:34:56.789Z",
  "context": {
    "modelName": "model.vrm",
    "fileSize": 1234567
  }
}
```

**Response**: `200 OK`

```json
{
  "status": "received"
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/api/log \
  -H "Content-Type: application/json" \
  -d '{"level":"info","message":"Test log"}'
```

---

## Authentication Details

### JWT Token Structure

**Header:**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload:**
```json
{
  "sub": "user@example.com",
  "iat": 1635724800,
  "exp": 1635811200
}
```

**Signature:**
```
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  JWT_SECRET
)
```

### Generating JWT Token

**Example (Node.js):**

```javascript
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { sub: 'user@example.com' },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

console.log(token);
```

**Example (Python):**

```python
import jwt
import datetime

payload = {
    'sub': 'user@example.com',
    'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
}

token = jwt.encode(payload, 'dev-secret', algorithm='HS256')
print(token)
```

---

## CORS Configuration

The backend allows requests from origins specified in `ALLOWED_ORIGINS` environment variable.

**Development:**
```bash
export ALLOWED_ORIGINS="http://localhost:5173"
```

**Production:**
```bash
export ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
```

**Allowed Methods:**
- GET
- POST
- PUT
- DELETE
- OPTIONS

**Allowed Headers:**
- Content-Type
- Authorization

---

## Error Responses

All error responses follow this format:

```json
{
  "timestamp": "2025-10-31T12:34:56.789+00:00",
  "status": 401,
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token",
  "path": "/api/users/1/greeting"
}
```

### Common Error Codes

| Status Code | Error | Description |
|------------|-------|-------------|
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Server-side error |

---

## Database Schema

### Users Table

```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Sample Data** (from `data.sql`):

```sql
INSERT INTO users (username, email) VALUES
  ('alice', 'alice@example.com'),
  ('bob', 'bob@example.com');
```

---

## Rate Limiting

**Current Status**: Not implemented

**Future Implementation**: Recommended for production

Suggested rate limits:
- `/api/users/*`: 100 requests/minute per IP
- `/api/log`: 1000 requests/minute per IP

---

## API Versioning

**Current Version**: v1 (implicit)

**Future Versions**: Will use URL versioning

```
/api/v1/users/{id}/greeting
/api/v2/users/{id}/profile
```

---

## Example Use Cases

### Frontend Integration

**Fetch User Greeting:**

```javascript
// Using API Key
const response = await fetch('/api/users/1/greeting', {
  headers: {
    'Authorization': 'dev-api-key'
  }
});

const data = await response.json();
console.log(data.message); // "Hello, alice!"
```

**Send Log Message:**

```javascript
const logData = {
  level: 'info',
  message: 'VRM model loaded successfully',
  timestamp: new Date().toISOString(),
  context: { modelName: 'model.vrm' }
};

await fetch('http://localhost:8000/api/log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(logData)
});
```

---

## Security Best Practices

1. **Never commit secrets**: Use environment variables for `JWT_SECRET` and `API_KEY`
2. **Use HTTPS in production**: Always use SSL/TLS certificates
3. **Rotate JWT secrets regularly**: Change `JWT_SECRET` periodically
4. **Validate input**: Backend validates all user input
5. **Limit CORS origins**: Only allow trusted domains in `ALLOWED_ORIGINS`
6. **Enable rate limiting**: Prevent abuse with rate limits (future)

---

<a name="japanese"></a>
## 🔌 日本語

### ベースURL

- **開発環境**: `http://localhost:8081/api`
- **本番環境**: `https://yourdomain.com/api`

### 認証

APIは2つの認証方法をサポートします:

#### 1. JWTトークン（Bearer認証）

```http
Authorization: Bearer <JWT_TOKEN>
```

#### 2. APIキー（直接）

```http
Authorization: <API_KEY>
```

**環境変数:**
- `JWT_SECRET`: JWT署名/検証用の秘密鍵
- `API_KEY`: シンプル認証用の固定APIキー
- `ALLOWED_ORIGINS`: CORS許可オリジン（カンマ区切り）

---

## エンドポイント

### ヘルスチェック

#### GET `/actuator/health`

バックエンドサービスのヘルス状態を確認します。

**認証**: 不要

**レスポンス**: `200 OK`

```json
{
  "status": "UP"
}
```

**例:**
```bash
curl http://localhost:8081/actuator/health
```

---

### ユーザー挨拶

#### GET `/users/{id}/greeting`

特定のユーザーの挨拶メッセージを取得します。

**認証**: 必須（JWTまたはAPIキー）

**パスパラメータ:**
- `id` (Long): ユーザーID

**レスポンス**: `200 OK`

```json
{
  "message": "Hello, {username}!"
}
```

**エラー:**
- `401 Unauthorized`: 無効または欠落した認証
- `404 Not Found`: 指定されたIDのユーザーが存在しない

**例:**

APIキーを使用:
```bash
curl -H "Authorization: dev-api-key" \
  http://localhost:8081/api/users/1/greeting
```

JWTトークンを使用:
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  http://localhost:8081/api/users/1/greeting
```

---

### ログ受信（オプション - Pythonサービス）

#### POST `/log`

デバッグ目的でフロントエンドからログメッセージを受信します。

**認証**: 不要（開発環境のみ）

**リクエストボディ:**

```json
{
  "level": "info",
  "message": "User loaded VRM model",
  "timestamp": "2025-10-31T12:34:56.789Z",
  "context": {
    "modelName": "model.vrm",
    "fileSize": 1234567
  }
}
```

**レスポンス**: `200 OK`

```json
{
  "status": "received"
}
```

**例:**
```bash
curl -X POST http://localhost:8000/api/log \
  -H "Content-Type: application/json" \
  -d '{"level":"info","message":"Test log"}'
```

---

## 認証の詳細

### JWTトークン構造

**ヘッダー:**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**ペイロード:**
```json
{
  "sub": "user@example.com",
  "iat": 1635724800,
  "exp": 1635811200
}
```

**署名:**
```
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  JWT_SECRET
)
```

### JWTトークンの生成

**例（Node.js）:**

```javascript
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { sub: 'user@example.com' },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

console.log(token);
```

**例（Python）:**

```python
import jwt
import datetime

payload = {
    'sub': 'user@example.com',
    'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
}

token = jwt.encode(payload, 'dev-secret', algorithm='HS256')
print(token)
```

---

## CORS設定

バックエンドは`ALLOWED_ORIGINS`環境変数で指定されたオリジンからのリクエストを許可します。

**開発環境:**
```bash
export ALLOWED_ORIGINS="http://localhost:5173"
```

**本番環境:**
```bash
export ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
```

**許可されるメソッド:**
- GET
- POST
- PUT
- DELETE
- OPTIONS

**許可されるヘッダー:**
- Content-Type
- Authorization

---

## エラーレスポンス

すべてのエラーレスポンスは以下の形式に従います:

```json
{
  "timestamp": "2025-10-31T12:34:56.789+00:00",
  "status": 401,
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token",
  "path": "/api/users/1/greeting"
}
```

### 一般的なエラーコード

| ステータスコード | エラー | 説明 |
|---------------|-------|------|
| 400 | Bad Request | 無効なリクエストパラメータ |
| 401 | Unauthorized | 認証の欠落または無効 |
| 403 | Forbidden | 権限不足 |
| 404 | Not Found | リソースが見つからない |
| 500 | Internal Server Error | サーバー側エラー |

---

## データベーススキーマ

### Usersテーブル

```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**サンプルデータ**（`data.sql`より）:

```sql
INSERT INTO users (username, email) VALUES
  ('alice', 'alice@example.com'),
  ('bob', 'bob@example.com');
```

---

## レート制限

**現在の状態**: 未実装

**将来の実装**: 本番環境では推奨

推奨レート制限:
- `/api/users/*`: IPあたり100リクエスト/分
- `/api/log`: IPあたり1000リクエスト/分

---

## APIバージョニング

**現在のバージョン**: v1（暗黙的）

**将来のバージョン**: URLバージョニングを使用

```
/api/v1/users/{id}/greeting
/api/v2/users/{id}/profile
```

---

## 使用例

### フロントエンド統合

**ユーザー挨拶の取得:**

```javascript
// APIキーを使用
const response = await fetch('/api/users/1/greeting', {
  headers: {
    'Authorization': 'dev-api-key'
  }
});

const data = await response.json();
console.log(data.message); // "Hello, alice!"
```

**ログメッセージの送信:**

```javascript
const logData = {
  level: 'info',
  message: 'VRM model loaded successfully',
  timestamp: new Date().toISOString(),
  context: { modelName: 'model.vrm' }
};

await fetch('http://localhost:8000/api/log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(logData)
});
```

---

## セキュリティベストプラクティス

1. **秘密をコミットしない**: `JWT_SECRET`と`API_KEY`には環境変数を使用
2. **本番環境ではHTTPSを使用**: 常にSSL/TLS証明書を使用
3. **JWTシークレットを定期的にローテーション**: `JWT_SECRET`を定期的に変更
4. **入力を検証**: バックエンドはすべてのユーザー入力を検証
5. **CORSオリジンを制限**: `ALLOWED_ORIGINS`には信頼できるドメインのみを許可
6. **レート制限を有効化**: レート制限で悪用を防止（将来）
