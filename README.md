# VRM Motion Studio / VRMモーションスタジオ

[English](#english) | [日本語](#japanese)

---

<a name="english"></a>
## 🎭 English

### Overview

**VRM Motion Studio** is a web-based VRM viewer and motion editor with virtual tracking capabilities. Built with Vue 3 + Vite frontend and Spring Boot backend, it provides an intuitive interface for loading VRM models, editing morphs (expressions), controlling poses with 11-point virtual trackers, and managing animations.

### ✨ Key Features

- **VRM Model Support**: Load and display VRM 1.0/0.0 models with full Spring Bone physics
- **Virtual Trackers**: 11-point tracker system (Head, Chest, Hips, Hands, Elbows, Feet, Knees) with drag-and-drop pose control
- **Morph Editor**: Real-time facial expression editing (A/I/U/E/O, Joy, Sorrow, etc.)
- **Timeline & Animation**: Record and playback motion sequences
- **Lighting Control**: Adjustable directional, ambient, and hemisphere lighting
- **Model Caching**: IndexedDB-based model cache for faster loading
- **Multi-language Support**: English, Japanese, Chinese, Korean, German, French, Spanish, Italian, Russian

### 🛠️ Technology Stack

**Frontend**
- Vue 3.5 (Composition API)
- Vite 7.1
- Three.js 0.164
- @pixiv/three-vrm 2.0

**Backend**
- Spring Boot 3.3.2 (Java 17)
- H2 Database (in-memory)
- JWT Authentication
- Spring Data JPA

**Infrastructure**
- Docker & Docker Compose
- Nginx (reverse proxy)
- PostgreSQL (production)

### 📋 Requirements

- **Node.js**: 20.19+ or 22.12+
- **Java**: 17+
- **Maven**: 3.9+
- **Docker**: 20.10+ (optional, for containerized deployment)

---

## 🚀 Quick Start

### Local Development

#### 1. Set Environment Variables

```powershell
# Windows PowerShell
$env:ALLOWED_ORIGINS="http://localhost:5173"
$env:JWT_SECRET="dev-secret"
$env:API_KEY="dev-api-key"
```

```bash
# Linux/macOS
export ALLOWED_ORIGINS="http://localhost:5173"
export JWT_SECRET="dev-secret"
export API_KEY="dev-api-key"
```

#### 2. Start Backend (Java/Spring Boot)

```powershell
cd backend/java
mvn spring-boot:run
```

Backend will start at `http://localhost:8081`

#### 3. Start Frontend (Vue/Vite)

```powershell
cd frontend
npm install
npm run dev
```

Frontend will start at `http://localhost:5173`

The Vite dev server automatically proxies `/api` requests to `http://localhost:8081`.

#### 4. Optional: Start Python Service

```powershell
cd backend/python
pip install -r requirements.txt
python app.py --port 8000
```

---

## 🐳 Docker Deployment

### Development with Docker Compose

```powershell
# Start all services (Compose v2 recommended)
docker compose up -d

# (legacy)
docker-compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

### Access URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost/ | Vue.js application (via Nginx) |
| Backend API | http://localhost/api/ | Spring Boot API (via Nginx) |
| Health Check | http://localhost/actuator/health | Backend health status (Actuator) |

### Port Configuration

| Service | External Port | Internal Port | Access Method |
|---------|--------------|---------------|---------------|
| Nginx | 80, 443 | 80, 443 | Direct access |
| Frontend | - | 5174 | Nginx proxy only |
| Backend | - | 8081 | Nginx proxy only |
| Database | - | 8083 | Internal network only |

### Security Design

- ✅ Only ports 80/443 exposed externally
- ✅ All application services on internal network only
- ✅ Nginx controls all external requests as reverse proxy
- ✅ Database completely isolated in internal network

### Useful Commands

```powershell
# Rebuild after code changes
docker-compose up -d --build

# View specific service logs
docker-compose logs -f frontend
docker-compose logs -f backend

# Restart specific service
docker-compose restart frontend

# Clean up (including volumes)
docker-compose down -v
```

---

## 📦 Build for Production

### Frontend

```powershell
cd frontend
npm run build
```

Output: `frontend/dist/`

### Backend

```powershell
cd backend/java
mvn clean package -DskipTests
```

Output: `backend/java/target/java-0.1.0.jar`

---

## 📖 Documentation

This repository intentionally keeps documentation minimal for public release.

- Setup and usage: this `README.md`
- Contributing: `CONTRIBUTING.md`
- Security policy: `SECURITY.md`

---

## 🎯 Usage

1. Open `http://localhost:5173` in your browser
2. Click "Import" in the menu to load a VRM model (or drag & drop)
3. Use the settings panel to:
   - Adjust lighting
   - Enable/disable Spring Bone physics
   - Toggle skeleton helper
   - Enable virtual trackers
4. Edit morphs (expressions) in the Morph Editor
5. Use virtual trackers to pose your model by dragging the colored spheres

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| Frontend build fails | Ensure Node.js version is 20.19+ or 22.12+ (use `nvm` recommended) |
| CORS errors | Set `ALLOWED_ORIGINS` to include `http://localhost:5173` |
| 401 Unauthorized | Check `JWT_SECRET` and `API_KEY` environment variables |
| Port already in use | Change ports in `docker-compose.yml` or kill existing processes |
| VRM model won't load | Check browser console for errors, ensure VRM file is valid |

---

## 📂 Project Structure

```
MokuMokuDanceWeb/
├── frontend/              # Vue 3 + Vite frontend
│   ├── src/
│   │   ├── components/    # Vue components
│   │   ├── composables/   # Composition API functions
│   │   ├── utils/         # Utility functions
│   │   └── locales/       # i18n translations
│   └── Dockerfile
├── backend/
│   ├── java/              # Spring Boot backend
│   │   ├── src/main/java/com/mmd/
│   │   └── Dockerfile
│   └── python/            # Optional Flask service
├── public/                # Static files
├── nginx.conf             # Nginx configuration
├── docker-compose.yml     # Docker Compose configuration
└── README.md
```

---

## 📜 License

MIT (see `LICENSE`)

## 🤝 Contributing / Security

- Contributing: `CONTRIBUTING.md`
- Security: `SECURITY.md`

---

## 🔗 References

- [three-vrm](https://github.com/pixiv/three-vrm) - VRM implementation for Three.js
- [VRM Specification](https://vrm.dev/) - Official VRM format documentation

---

<a name="japanese"></a>
## 🎭 日本語

### 概要

**VRM Motion Studio（VRMモーションスタジオ）** は、VRMモデルの閲覧・モーション編集が可能なWebベースのアプリケーションです。Vue 3 + Viteのフロントエンドと、Spring Bootのバックエンドで構成され、VRMモデルの読み込み、モーフ（表情）編集、11点のバーチャルトラッカーによるポーズ制御、アニメーション管理などの機能を提供します。

### ✨ 主な機能

- **VRMモデル対応**: VRM 1.0/0.0モデルの読み込みと表示（SpringBone物理演算対応）
- **バーチャルトラッカー**: 11点トラッカーシステム（頭、胸、腰、両手、両肘、両足、両膝）によるドラッグ&ドロップでのポーズ制御
- **モーフエディタ**: リアルタイム表情編集（あ/い/う/え/お、Joy、Sorrowなど）
- **タイムライン＆アニメーション**: モーションシーケンスの記録と再生
- **ライティング制御**: ディレクショナル、アンビエント、ヘミスフィアライトの調整
- **モデルキャッシング**: IndexedDBベースのモデルキャッシュで高速読み込み
- **多言語対応**: 英語、日本語、中国語、韓国語、ドイツ語、フランス語、スペイン語、イタリア語、ロシア語

### 🛠️ 技術スタック

**フロントエンド**
- Vue 3.5（Composition API）
- Vite 7.1
- Three.js 0.164
- @pixiv/three-vrm 2.0

**バックエンド**
- Spring Boot 3.3（Java 17）
- H2データベース（インメモリ）
- JWT認証
- Spring Data JPA

**インフラ**
- Docker & Docker Compose
- Nginx（リバースプロキシ）
- PostgreSQL（本番環境）

### 📋 必要要件

- **Node.js**: 20.19以上 または 22.12以上
- **Java**: 17以上
- **Maven**: 3.9以上
- **Docker**: 20.10以上（オプション、コンテナ化デプロイ用）

---

## 🚀 クイックスタート

### ローカル開発

#### 1. 環境変数の設定

```powershell
# Windows PowerShell
$env:ALLOWED_ORIGINS="http://localhost:5173"
$env:JWT_SECRET="dev-secret"
$env:API_KEY="dev-api-key"
```

```bash
# Linux/macOS
export ALLOWED_ORIGINS="http://localhost:5173"
export JWT_SECRET="dev-secret"
export API_KEY="dev-api-key"
```

#### 2. バックエンドの起動（Java/Spring Boot）

```powershell
cd backend/java
mvn spring-boot:run
```

バックエンドは `http://localhost:8081` で起動します。

#### 3. フロントエンドの起動（Vue/Vite）

```powershell
cd frontend
npm install
npm run dev
```

フロントエンドは `http://localhost:5173` で起動します。

Vite開発サーバは `/api` へのリクエストを自動的に `http://localhost:8081` にプロキシします。

#### 4. オプション: Pythonサービスの起動

```powershell
cd backend/python
pip install -r requirements.txt
python app.py --port 8000
```

---

## 🐳 Docker デプロイ

### Docker Composeでの開発

```powershell
# 全サービスの起動
docker-compose up -d

# ログの確認
docker-compose logs -f

# 全サービスの停止
docker-compose down
```

### アクセスURL

| サービス | URL | 説明 |
|---------|-----|------|
| フロントエンド | http://localhost/ | Vue.jsアプリケーション（Nginx経由） |
| バックエンドAPI | http://localhost/api/ | Spring Boot API（Nginx経由） |
| ヘルスチェック | http://localhost/actuator/health | バックエンドの状態確認（Actuator） |

### ポート構成

| サービス | 外部ポート | 内部ポート | アクセス方法 |
|---------|----------|----------|------------|
| Nginx | 80, 443 | 80, 443 | 直接アクセス可能 |
| Frontend | - | 5174 | Nginxプロキシのみ |
| Backend | - | 8081 | Nginxプロキシのみ |
| Database | - | 8083 | 内部ネットワークのみ |

### セキュリティ設計

- ✅ 外部公開ポートは80/443のみ
- ✅ すべてのアプリケーションサービスは内部ネットワークのみ
- ✅ Nginxがリバースプロキシとして全リクエストを制御
- ✅ データベースは完全に内部ネットワークに隔離

### 便利なコマンド

```powershell
# コード変更後の再ビルド
docker-compose up -d --build

# 特定のサービスのログ確認
docker-compose logs -f frontend
docker-compose logs -f backend

# 特定のサービスの再起動
docker-compose restart frontend

# クリーンアップ（ボリューム含む）
docker-compose down -v
```

---

## 📦 本番用ビルド

### フロントエンド

```powershell
cd frontend
npm run build
```

出力先: `frontend/dist/`

### バックエンド

```powershell
cd backend/java
mvn clean package -DskipTests
```

出力先: `backend/java/target/java-0.1.0.jar`

---

## 📖 ドキュメント

公開用にドキュメントは最小構成に整理しています。

- セットアップと使い方：この `README.md`
- 貢献：`CONTRIBUTING.md`
- セキュリティ：`SECURITY.md`

---

## 🎯 使い方

1. ブラウザで `http://localhost:5173` を開く
2. メニューの「インポート」をクリックしてVRMモデルを読み込む（ドラッグ&ドロップも可）
3. 設定パネルで以下を調整：
   - ライティングの調整
   - SpringBone物理演算の有効/無効
   - スケルトンヘルパーの表示切替
   - バーチャルトラッカーの有効化
4. モーフエディタで表情を編集
5. バーチャルトラッカー（色付きの球）をドラッグしてモデルをポーズ

---

## 🔧 トラブルシューティング

| 問題 | 解決方法 |
|-----|---------|
| フロントエンドのビルドが失敗 | Node.jsバージョンを20.19以上または22.12以上にする（`nvm`推奨） |
| CORSエラー | `ALLOWED_ORIGINS`に`http://localhost:5173`を含める |
| 401 Unauthorized | `JWT_SECRET`と`API_KEY`の環境変数を確認 |
| ポートが使用中 | `docker-compose.yml`でポートを変更するか、既存プロセスを終了 |
| VRMモデルが読み込めない | ブラウザコンソールでエラーを確認、VRMファイルが有効か確認 |

---

## 📂 プロジェクト構造

```
MokuMokuDanceWeb/
├── frontend/              # Vue 3 + Vite フロントエンド
│   ├── src/
│   │   ├── components/    # Vueコンポーネント
│   │   ├── composables/   # Composition API関数
│   │   ├── utils/         # ユーティリティ関数
│   │   └── locales/       # 多言語翻訳
│   └── Dockerfile
├── backend/
│   ├── java/              # Spring Boot バックエンド
│   │   ├── src/main/java/com/mmd/
│   │   └── Dockerfile
│   └── python/            # オプションのFlaskサービス
├── public/                # 静的ファイル
├── nginx.conf             # Nginx設定
├── docker-compose.yml     # Docker Compose設定
└── README.md
```

---

## 📜 ライセンス

MIT

---

## 🔗 参考リンク

- [three-vrm](https://github.com/pixiv/three-vrm) - Three.js用VRM実装
- [VRM仕様](https://vrm.dev/) - VRMフォーマット公式ドキュメント

---

## 💡 備考

- サンプルVRMモデルは同梱していません。VRMを `frontend/public/vrm/` に配置すると `http://localhost/vrm/` で配信できます。
- `.vrm` は現状Git LFSではなく通常のGit追跡です（`.gitattributes` 参照）。大容量VRMを含める場合はGit LFS運用を検討してください。
- 旧MMD依存の実装方針は廃止済みです（VRM専用）。
