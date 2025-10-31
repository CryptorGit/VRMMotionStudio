# Architecture Overview / アーキテクチャ概要

[English](#english) | [日本語](#japanese)

---

<a name="english"></a>
## 🏗️ English

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Client Browser                          │
│                     (Vue 3 + Three.js + VRM)                     │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Nginx (Reverse Proxy)                        │
│                         Port 80/443                              │
└────────┬────────────────────┬────────────────────┬───────────────┘
         │                    │                    │
         ↓                    ↓                    ↓
┌────────────────┐   ┌────────────────┐   ┌───────────────┐
│   Frontend     │   │    Backend     │   │ Static Files  │
│  (Vite/Vue 3)  │   │ (Spring Boot)  │   │   (public/)   │
│   Port 5174    │   │   Port 8081    │   │               │
└────────────────┘   └────────┬───────┘   └───────────────┘
                              │
                              ↓
                     ┌────────────────┐
                     │   Database     │
                     │ (H2/PostgreSQL)│
                     │   Port 8083    │
                     └────────────────┘
```

### Component Overview

#### Frontend (Vue 3 + Vite)

**Technology Stack:**
- Vue 3.5 with Composition API
- Vite 7.1 (build tool + dev server)
- Three.js 0.164 (3D rendering)
- @pixiv/three-vrm 2.0 (VRM support)
- IndexedDB (model caching)

**Key Modules:**

1. **Components** (`src/components/`)
   - `ThreeViewer.vue`: Main 3D viewport using Three.js
   - `ModelSection.vue`: Model import/management UI
   - `MorphSection.vue`: Facial expression editor
   - `TrackerSection.vue`: Virtual tracker controls
   - `TimelinePanel.vue`: Animation timeline
   - `LightingPanel.vue`: Lighting controls

2. **Composables** (`src/composables/`)
   - `useThreeViewerInit.js`: Three.js scene initialization
   - `useModelLoader.js`: VRM model loading with caching
   - `useVirtualTrackers.js`: 11-point tracker system
   - `useTimeline.js`: Animation recording/playback
   - `useRenderer.js`: Rendering pipeline management
   - `useHistory.js`: Undo/redo functionality

3. **Utils** (`src/utils/`)
   - `createLoader.js`: Asset loader factory
   - `lighting.js`: Light setup utilities
   - `shapekeys.js`: Morph/expression utilities
   - `openDB.js`: IndexedDB wrapper

#### Backend (Spring Boot)

**Technology Stack:**
- Spring Boot 3.3.2
- Java 17
- H2 Database (development)
- PostgreSQL (production)
- JWT Authentication
- Spring Data JPA

**Package Structure:**

```
com.mmd/
├── controller/       # REST API endpoints
├── service/          # Business logic
├── security/         # Authentication & authorization
├── repository/       # Data access layer
└── model/entity/     # JPA entities
```

**Key Features:**
- JWT token-based authentication
- API key validation
- CORS configuration
- Health check endpoints (Spring Actuator)
- User management with JPA

### Data Flow

#### 1. VRM Model Loading

```
User Action (drag & drop VRM)
    ↓
Frontend: File validation
    ↓
IndexedDB: Check cache
    ↓ (cache miss)
Three.js: Parse VRM binary
    ↓
@pixiv/three-vrm: Load VRM model
    ↓
IndexedDB: Store for future use
    ↓
ThreeViewer: Display in scene
```

#### 2. Virtual Tracker Interaction

```
User: Drag tracker sphere
    ↓
Frontend: Ray casting (detect tracker)
    ↓
useVirtualTrackers: Update tracker position
    ↓
IK Solver: Calculate bone rotations
    ↓
VRM Model: Apply bone transformations
    ↓
Three.js: Render frame
```

#### 3. API Request Flow

```
Frontend Component
    ↓
Fetch API (/api/*)
    ↓
Nginx Proxy (port 80 → 8081)
    ↓
Spring Security Filter
    ↓ (JWT/API Key validation)
Controller
    ↓
Service Layer
    ↓
Repository (JPA)
    ↓
Database (H2/PostgreSQL)
```

### Security Architecture

#### Network Isolation (Docker)

```
External Network
    ↓ (only ports 80/443)
┌─────────────────────┐
│   Nginx Container   │  ← External gateway
└──────────┬──────────┘
           │
    Internal Bridge Network (vrm-motion-studio-network)
           │
    ┌──────┴─────────┬─────────────┬──────────────┐
    ↓                ↓             ↓              ↓
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Frontend │  │ Backend  │  │   Files  │  │ Database │
│ (expose) │  │ (expose) │  │ (volume) │  │ (expose) │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

**Security Principles:**
- Only Nginx exposed to external network
- All services communicate via internal Docker network
- Database completely isolated
- Environment variables for sensitive configuration

#### Authentication Flow

```
Client Request
    ↓
Authorization Header
    ↓
Spring Security Filter Chain
    ↓
┌─ JWT Token? ─────────┐
│  Yes: Validate JWT   │
│  No: Check API_KEY   │
└──────────────────────┘
    ↓
Access Granted/Denied
```

### Storage Strategy

#### Client-side (IndexedDB)

- **VRM Models**: Binary blob storage with metadata
- **Model Cache**: Keyed by file name/hash
- **Tracker Positions**: Per-model tracker coordinates
- **UI State**: Sidebar visibility, settings

#### Server-side (Database)

- **Users**: User accounts (H2/PostgreSQL)
- **Projects**: Animation project metadata
- **Sessions**: JWT token blacklist (future)

### Performance Optimizations

1. **Model Caching**: IndexedDB reduces re-parsing of VRM files
2. **Lazy Loading**: Components loaded on-demand
3. **Virtual Scrolling**: Efficient rendering of large lists
4. **RequestAnimationFrame**: Optimized render loop
5. **Code Splitting**: Vite automatic bundle optimization

### Deployment Modes

#### Development Mode

```
Frontend: Vite dev server (HMR enabled) → localhost:5173
Backend: Spring Boot (embedded Tomcat) → localhost:8081
Database: H2 in-memory
```

#### Production Mode (Docker Compose)

```
Nginx → Frontend container (Vite build served by Node/nginx)
     → Backend container (Spring Boot JAR)
     → PostgreSQL container
```

#### Production Mode (AWS/Cloud)

```
CloudFront/ALB → EC2/ECS (Nginx)
                    ↓
            Docker containers or K8s pods
                    ↓
            RDS (PostgreSQL)
```

### Extensibility

#### Adding New Features

1. **New Morph/Expression**:
   - Add to VRM model expressions
   - Update `MorphSection.vue`
   - Extend `shapekeys.js` utilities

2. **New API Endpoint**:
   - Create controller in `backend/java/src/main/java/com/mmd/controller/`
   - Implement service logic
   - Update Nginx routing if needed

3. **New Language**:
   - Add translation file in `frontend/src/locales/`
   - Register in `locales/index.js`
   - Update `LanguageSelector.vue`

### Technology Choices

| Requirement | Technology | Rationale |
|------------|------------|-----------|
| 3D Rendering | Three.js | Industry standard, VRM support via three-vrm |
| VRM Support | @pixiv/three-vrm | Official library from VRM spec creators |
| UI Framework | Vue 3 | Reactive, composable, excellent TypeScript support |
| Build Tool | Vite | Fast HMR, optimized production builds |
| Backend | Spring Boot | Enterprise-grade, robust ecosystem |
| Database | H2/PostgreSQL | H2 for dev (in-memory), PostgreSQL for prod |
| Reverse Proxy | Nginx | High performance, battle-tested |
| Containerization | Docker | Consistent environments, easy deployment |

---

<a name="japanese"></a>
## 🏗️ 日本語

### システムアーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│                      クライアントブラウザ                           │
│                     (Vue 3 + Three.js + VRM)                     │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Nginx（リバースプロキシ）                         │
│                         Port 80/443                              │
└────────┬────────────────────┬────────────────────┬───────────────┘
         │                    │                    │
         ↓                    ↓                    ↓
┌────────────────┐   ┌────────────────┐   ┌───────────────┐
│ フロントエンド   │   │  バックエンド   │   │  静的ファイル  │
│  (Vite/Vue 3)  │   │ (Spring Boot)  │   │   (public/)   │
│   Port 5174    │   │   Port 8081    │   │               │
└────────────────┘   └────────┬───────┘   └───────────────┘
                              │
                              ↓
                     ┌────────────────┐
                     │ データベース    │
                     │ (H2/PostgreSQL)│
                     │   Port 8083    │
                     └────────────────┘
```

### コンポーネント概要

#### フロントエンド（Vue 3 + Vite）

**技術スタック:**
- Vue 3.5（Composition API）
- Vite 7.1（ビルドツール + 開発サーバ）
- Three.js 0.164（3Dレンダリング）
- @pixiv/three-vrm 2.0（VRMサポート）
- IndexedDB（モデルキャッシング）

**主要モジュール:**

1. **コンポーネント** (`src/components/`)
   - `ThreeViewer.vue`: Three.jsを使用したメイン3Dビューポート
   - `ModelSection.vue`: モデルインポート/管理UI
   - `MorphSection.vue`: 表情エディタ
   - `TrackerSection.vue`: バーチャルトラッカー操作
   - `TimelinePanel.vue`: アニメーションタイムライン
   - `LightingPanel.vue`: ライティング制御

2. **コンポーザブル** (`src/composables/`)
   - `useThreeViewerInit.js`: Three.jsシーン初期化
   - `useModelLoader.js`: VRMモデル読み込み（キャッシング付き）
   - `useVirtualTrackers.js`: 11点トラッカーシステム
   - `useTimeline.js`: アニメーション記録/再生
   - `useRenderer.js`: レンダリングパイプライン管理
   - `useHistory.js`: 元に戻す/やり直し機能

3. **ユーティリティ** (`src/utils/`)
   - `createLoader.js`: アセットローダーファクトリー
   - `lighting.js`: ライト設定ユーティリティ
   - `shapekeys.js`: モーフ/表情ユーティリティ
   - `openDB.js`: IndexedDBラッパー

#### バックエンド（Spring Boot）

**技術スタック:**
- Spring Boot 3.3.2
- Java 17
- H2データベース（開発環境）
- PostgreSQL（本番環境）
- JWT認証
- Spring Data JPA

**パッケージ構造:**

```
com.mmd/
├── controller/       # REST APIエンドポイント
├── service/          # ビジネスロジック
├── security/         # 認証・認可
├── repository/       # データアクセス層
└── model/entity/     # JPAエンティティ
```

**主な機能:**
- JWTトークンベース認証
- APIキー検証
- CORS設定
- ヘルスチェックエンドポイント（Spring Actuator）
- JPAによるユーザー管理

### データフロー

#### 1. VRMモデル読み込み

```
ユーザーアクション（VRMドラッグ&ドロップ）
    ↓
フロントエンド: ファイル検証
    ↓
IndexedDB: キャッシュ確認
    ↓ (キャッシュミス)
Three.js: VRMバイナリ解析
    ↓
@pixiv/three-vrm: VRMモデル読み込み
    ↓
IndexedDB: 将来の使用のため保存
    ↓
ThreeViewer: シーンに表示
```

#### 2. バーチャルトラッカー操作

```
ユーザー: トラッカー球をドラッグ
    ↓
フロントエンド: レイキャスティング（トラッカー検出）
    ↓
useVirtualTrackers: トラッカー位置更新
    ↓
IKソルバー: ボーン回転計算
    ↓
VRMモデル: ボーン変形適用
    ↓
Three.js: フレームレンダリング
```

#### 3. APIリクエストフロー

```
フロントエンドコンポーネント
    ↓
Fetch API (/api/*)
    ↓
Nginxプロキシ（port 80 → 8081）
    ↓
Spring Securityフィルター
    ↓ (JWT/APIキー検証)
コントローラー
    ↓
サービス層
    ↓
リポジトリ（JPA）
    ↓
データベース（H2/PostgreSQL）
```

### セキュリティアーキテクチャ

#### ネットワーク分離（Docker）

```
外部ネットワーク
    ↓ (ポート80/443のみ)
┌─────────────────────┐
│  Nginxコンテナ      │  ← 外部ゲートウェイ
└──────────┬──────────┘
           │
    内部ブリッジネットワーク (vrm-motion-studio-network)
           │
    ┌──────┴─────────┬─────────────┬──────────────┐
    ↓                ↓             ↓              ↓
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│フロント   │  │バックエンド│  │ ファイル  │  │データベース│
│ (expose) │  │ (expose) │  │ (volume) │  │ (expose) │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

**セキュリティ原則:**
- 外部ネットワークに公開されるのはNginxのみ
- すべてのサービスはDocker内部ネットワーク経由で通信
- データベースは完全に分離
- 機密設定は環境変数で管理

#### 認証フロー

```
クライアントリクエスト
    ↓
Authorizationヘッダ
    ↓
Spring Securityフィルターチェーン
    ↓
┌─ JWTトークン? ───────┐
│  Yes: JWT検証        │
│  No: API_KEY確認     │
└──────────────────────┘
    ↓
アクセス許可/拒否
```

### ストレージ戦略

#### クライアント側（IndexedDB）

- **VRMモデル**: メタデータ付きバイナリブロブ保存
- **モデルキャッシュ**: ファイル名/ハッシュでキー化
- **トラッカー位置**: モデルごとのトラッカー座標
- **UI状態**: サイドバー表示、設定

#### サーバー側（データベース）

- **ユーザー**: ユーザーアカウント（H2/PostgreSQL）
- **プロジェクト**: アニメーションプロジェクトメタデータ
- **セッション**: JWTトークンブラックリスト（将来）

### パフォーマンス最適化

1. **モデルキャッシング**: IndexedDBでVRMファイルの再解析を削減
2. **遅延ロード**: コンポーネントをオンデマンドで読み込み
3. **仮想スクロール**: 大きなリストの効率的なレンダリング
4. **RequestAnimationFrame**: 最適化されたレンダーループ
5. **コード分割**: Viteの自動バンドル最適化

### デプロイモード

#### 開発モード

```
フロントエンド: Vite開発サーバ（HMR有効）→ localhost:5173
バックエンド: Spring Boot（組み込みTomcat）→ localhost:8081
データベース: H2インメモリ
```

#### 本番モード（Docker Compose）

```
Nginx → フロントエンドコンテナ（ViteビルドをNode/nginxで配信）
     → バックエンドコンテナ（Spring Boot JAR）
     → PostgreSQLコンテナ
```

#### 本番モード（AWS/クラウド）

```
CloudFront/ALB → EC2/ECS（Nginx）
                    ↓
            Dockerコンテナまたは K8s Pod
                    ↓
            RDS（PostgreSQL）
```

### 拡張性

#### 新機能の追加

1. **新しいモーフ/表情**:
   - VRMモデルのexpressionsに追加
   - `MorphSection.vue`を更新
   - `shapekeys.js`ユーティリティを拡張

2. **新しいAPIエンドポイント**:
   - `backend/java/src/main/java/com/mmd/controller/`にコントローラーを作成
   - サービスロジックを実装
   - 必要に応じてNginxルーティングを更新

3. **新しい言語**:
   - `frontend/src/locales/`に翻訳ファイルを追加
   - `locales/index.js`に登録
   - `LanguageSelector.vue`を更新

### 技術選定

| 要件 | 技術 | 理由 |
|-----|------|------|
| 3Dレンダリング | Three.js | 業界標準、three-vrm経由でVRMサポート |
| VRMサポート | @pixiv/three-vrm | VRM仕様作成者による公式ライブラリ |
| UIフレームワーク | Vue 3 | リアクティブ、コンポーザブル、優れたTypeScriptサポート |
| ビルドツール | Vite | 高速HMR、最適化された本番ビルド |
| バックエンド | Spring Boot | エンタープライズグレード、堅牢なエコシステム |
| データベース | H2/PostgreSQL | H2は開発用（インメモリ）、PostgreSQLは本番用 |
| リバースプロキシ | Nginx | 高性能、実績豊富 |
| コンテナ化 | Docker | 一貫した環境、簡単なデプロイ |
