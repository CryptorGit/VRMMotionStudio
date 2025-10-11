# MokuMokuDanceWeb

## リポジトリ構成
- `frontend/` … Vite + Vue 3 クライアント
  - `src/`, `components/`, `composables/`, `utils/`
  - `vite.config.js`（VRM アセット登録、/api プロキシ 8080）
- `backend/`
  - `java/` … Spring Boot（H2 メモリ DB、JPA）
  - `python/` … Flask サンプル（任意）

VRM ビューアを中心としたフロントエンド（Vite + Vue 3）と、簡易な Java バックエンド（Spring Boot）を含むモノレポです。

## ディレクトリ
- `frontend/` Vite + Vue 3 アプリ。`/src` にコンポーネントやユーティリティ。
- `backend/` サーバサイド。`java/` が Spring Boot 本体。`python/` は任意の補助 API サンプル。

## 開発手順
1. Java バックエンドを起動
  ```powershell
  cd backend/java
  mvn spring-boot:run
  ```
2. フロントエンドを起動
  ```powershell
  cd frontend
  npm install
  npm run dev
  ```
  ブラウザで http://localhost:5173 を開きます。フロントから `/api` へのリクエストは `http://localhost:8081` へプロキシされます。

## 環境変数
`.env.example` を参考に環境変数を設定します。PowerShell 例:
```powershell
$env:ALLOWED_ORIGINS="http://localhost:5173"; $env:JWT_SECRET="dev-secret"; $env:API_KEY="dev-api-key"
```

## 付記
- フロントからの開発用ログ送信先 `/api/log` を実装しています。存在しなくても動作に致命的影響はありません。
- 生成物や一時ファイルは `.gitignore` 済みです。
## 必要要件
- Node.js 20.19+ または 22.12+（`frontend/package.json#engines` 参照）
- Java 17+
- Maven 3.9+

## クイックスタート
Windows PowerShell の例（他 OS は適宜読み替え）:

1) 環境変数（バックエンド認証/CORS）
```powershell
$env:ALLOWED_ORIGINS="http://localhost:5173"
$env:JWT_SECRET="dev-secret"
$env:API_KEY="dev-api-key"
```

2) バックエンド（Java）
```powershell
cd backend/java
mvn spring-boot:run
# -> http://localhost:8081
```

3) フロントエンド
```powershell
cd frontend
npm install
npm run dev
# -> http://localhost:5173 （/api は 8081 へプロキシ）
```

4) オプション: Python サーバ
```powershell
cd backend/python
pip install -r requirements.txt
python .\app.py --port 8000
```

## ビルド
- フロントエンド: `cd frontend; npm run build` → `frontend/dist/`
- バックエンド: `cd backend/java; mvn package` → `backend/java/target/*.jar`

## API 概要（Java）
- `GET /api/users/{id}/greeting` … Authorization ヘッダ必須（`Bearer <JWT>` または `API_KEY` の生値）。H2 の `data.sql` サンプルユーザーが対象。

## VRM サンプル
容量の都合でサンプル `.vrm` は同梱していません。各自のライセンスに従い取得してください。Git LFS は `.vrm` を対象に設定済（`.gitattributes`）。

## トラブルシューティング
- フロントのビルドが失敗する: Node バージョンを `20.19+` または `22.12+` にしてください（`nvm` 推奨）。
- CORS エラー: `ALLOWED_ORIGINS` に `http://localhost:5173` を含めてください。
- 401 Unauthorized: `JWT_SECRET` 未設定、JWT 期限切れ、または `API_KEY` 不一致を確認。

## 参考
- three-vrm: https://github.com/pixiv/three-vrm

---
補足: 旧 MMD 依存の実装方針は廃止済みです（VRM 専用）。必要であれば `TODO.md` の履歴を参照してください。
