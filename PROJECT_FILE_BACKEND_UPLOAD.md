# プロジェクトファイルのバックエンドアップロード機能

## 概要
プロジェクトをエクスポートする際に、ローカルへのダウンロードに加えて、バックエンドサーバーにも自動的にアップロードする機能を実装しました。

## 実装内容

### バックエンド (Java/Spring Boot)

#### 新規ファイル
- `backend/java/src/main/java/com/mmd/controller/ProjectController.java`
  - プロジェクトファイルのアップロードおよび一覧取得機能を提供

#### API エンドポイント

##### 1. プロジェクトファイルのアップロード
```
POST /api/projects/upload
```

**リクエスト:**
- `multipart/form-data` 形式
- パラメータ:
  - `file`: JSONファイル（必須）
  - `projectName`: プロジェクト名（オプション）

**レスポンス:**
```json
{
  "success": true,
  "filename": "project_20251023_143055_abc12345.json",
  "originalFilename": "project_2025-10-23T14-30-55.json",
  "projectName": "StellarMotion Studio",
  "size": 1024000,
  "uploadTime": "2025-10-23T14:30:55.123",
  "path": "uploads/projects/project_20251023_143055_abc12345.json"
}
```

**制限事項:**
- 最大ファイルサイズ: 100MB
- 許可されるファイル形式: JSON (.json)

##### 2. アップロード済みプロジェクト一覧の取得
```
GET /api/projects/list
```

**レスポンス:**
```json
{
  "success": true,
  "projects": [
    {
      "filename": "project_20251023_143055_abc12345.json",
      "size": 1024000,
      "lastModified": "Tue Oct 23 14:30:55 JST 2025"
    }
  ],
  "count": 1
}
```

#### アップロードディレクトリ
- デフォルト: `uploads/projects/`
- 自動的に作成されます

### フロントエンド (Vue.js)

#### 新規ファイル
- `frontend/src/api/projectApi.js`
  - バックエンドAPIとの通信を担当
  - 関数:
    - `uploadProjectToBackend(blob, filename, projectName)`: プロジェクトをアップロード
    - `listProjectsFromBackend()`: プロジェクト一覧を取得
    - `checkBackendConnection()`: バックエンド接続確認

- `frontend/.env`
  - 開発環境用の環境変数設定
  - `VITE_API_URL=http://localhost:8080`

- `frontend/.env.production`
  - 本番環境用の環境変数設定
  - サーバーのURLを設定する必要があります

#### 変更ファイル
- `frontend/src/components/ThreeViewer.vue`
  - `exportProject()` 関数を拡張
  - ローカルダウンロード後、バックエンドへのアップロードを自動実行
  - バックエンドが利用できない場合はスキップ（エラーにしない）

- `frontend/src/locales/ja.js`
- `frontend/src/locales/en.js`
- `frontend/src/locales/de.js`
  - 新しい通知メッセージ `projectUploadedToServer` を追加

## 使用方法

### 1. バックエンドの起動

PowerShell:
```powershell
cd backend\java
.\mvnw.cmd spring-boot:run
```

または:
```powershell
.\backend\start-backend.ps1
```

デフォルトでポート `8080` で起動します。

### 2. フロントエンドの設定

必要に応じて `.env` ファイルを編集してバックエンドのURLを設定:
```
VITE_API_URL=http://localhost:8080
```

### 3. プロジェクトのエクスポート

1. アプリケーションで通常通りプロジェクトをエクスポート
2. ファイルはローカルにダウンロードされます
3. バックエンドが起動している場合、自動的にサーバーにもアップロードされます
4. 成功すると「プロジェクト: サーバーにアップロードしました。」という通知が表示されます

## 動作フロー

```
ユーザーが「プロジェクトを保存」をクリック
  ↓
1. プロジェクトデータをJSON化
  ↓
2. ローカルにダウンロード
  ↓
3. バックエンド接続チェック
  ↓
4a. [接続可能] サーバーにアップロード → 成功通知
4b. [接続不可] スキップ（エラーにはしない）
```

## バックエンドの現在の機能状況

### 実装済みの機能
1. **ログ記録** (`LogController`)
   - エンドポイント: `POST /api/log`
   - クライアントからのログを受信（現在は未使用）

2. **ユーザー管理（サンプル）** (`UserController`)
   - エンドポイント: `GET /api/users/{id}/greeting`
   - テスト用のサンプル機能

3. **プロジェクトファイル管理** (`ProjectController`) ⭐ NEW
   - プロジェクトファイルのアップロード
   - アップロード済みファイルの一覧取得

### セキュリティ
- CORS設定済み（すべてのオリジンを許可）
- 本番環境では適切に設定する必要があります

## 注意事項

1. **バックエンドへのアップロードはオプション機能です**
   - バックエンドが起動していなくても、ローカルへのダウンロードは正常に動作します
   - エラーは警告としてコンソールに出力されますが、ユーザーにはエラー通知は表示されません

2. **ファイルサイズ制限**
   - デフォルトで100MBまで
   - 必要に応じて `ProjectController.java` で変更可能

3. **本番環境での設定**
   - `.env.production` でバックエンドのURLを設定してください
   - CORS設定を適切に制限してください
   - ファイルストレージの容量を監視してください

4. **アップロードディレクトリ**
   - `uploads/projects/` に保存されます
   - 定期的なクリーンアップが必要な場合があります

## 今後の拡張案

1. **認証機能**
   - ユーザー認証を追加し、プロジェクトへのアクセス制御

2. **プロジェクト管理UI**
   - アップロード済みプロジェクトの閲覧・ダウンロード・削除機能

3. **自動バックアップ**
   - 定期的な自動保存機能

4. **クラウドストレージ連携**
   - AWS S3、Azure Blob Storage等への保存

5. **バージョン管理**
   - プロジェクトの履歴管理機能
