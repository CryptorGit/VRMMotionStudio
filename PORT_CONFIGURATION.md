# ポート設定変更履歴

## 変更内容

開発環境でのポート競合を避けるため、以下のポート設定を変更しました。

### 変更前
- **バックエンド (Spring Boot)**: `http://localhost:8080`
- **フロントエンド (Vite)**: `http://localhost:5173`

### 変更後
- **バックエンド (Spring Boot)**: `http://localhost:8081`
- **フロントエンド (Vite)**: `http://localhost:5173` (変更なし)

## 変更ファイル

### 1. バックエンド設定
**ファイル**: `backend/java/src/main/resources/application.properties`
```properties
server.port=8081
```

### 2. フロントエンド開発サーバ設定
**ファイル**: `frontend/vite.config.js`
```javascript
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,  // フロントエンドポート
    proxy: {
      '/api': {
        target: 'http://localhost:8081',  // バックエンドへのプロキシ
        changeOrigin: true
      }
    }
  }
})
```

### 3. ドキュメント更新
以下のREADMEファイルを更新:
- `README.md`: クイックスタートガイドのポート番号を8081に変更
- `backend/README.md`: プロキシ設定の説明を8081に変更
- `frontend/README.md`: バックエンドAPIのプロキシ先を8081に変更

## 環境変数

CORS設定も新しいポートに合わせて設定してください:

```powershell
# PowerShell
$env:ALLOWED_ORIGINS="http://localhost:5173"
$env:JWT_SECRET="dev-secret"
$env:API_KEY="dev-api-key"
```

```bash
# Bash
export ALLOWED_ORIGINS="http://localhost:5173"
export JWT_SECRET="dev-secret"
export API_KEY="dev-api-key"
```

## 起動方法

### バックエンド
```powershell
cd backend/java
mvn spring-boot:run
```
→ バックエンドが `http://localhost:8081` で起動

### フロントエンド
```powershell
cd frontend
npm install
npm run dev
```
→ フロントエンドが `http://localhost:5173` で起動
→ `/api` へのリクエストは自動的に `http://localhost:8081` にプロキシされます

## 動作確認

1. バックエンド: `http://localhost:8081/api/health` (存在する場合)
2. フロントエンド: `http://localhost:5173` をブラウザで開く
3. フロントエンドから `/api/*` へのリクエストが8081に正しくプロキシされることを確認

## 注意事項

- **コード内にポートのハードコード無し**: すべて設定ファイルとプロキシ経由で動作
- **Docker環境**: `docker-compose.yml` を使用する場合は、そちらのポート設定も確認してください
- **プロダクション環境**: 本番環境では適切なポート設定とリバースプロキシ（nginx等）を使用してください

## 変更日時
2024年（最終更新）
