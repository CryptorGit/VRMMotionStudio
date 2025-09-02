# バックエンド

本ディレクトリは、Web アプリケーションのサーバサイド処理を担当するバックエンドです。

## 構成
- `python/` : Python によるサービス（サンプルとして `app.py` を含みます）
- `java/` : Java によるサービス（Maven モジュール）
  - `src/main/java/com/mmd/App.java` : エントリーポイント
  - `src/main/java/com/mmd/controller/` : コントローラ
  - `src/main/java/com/mmd/service/` : サービス
  - `src/main/java/com/mmd/security/` : セキュリティ
  - `src/main/java/com/mmd/repository/` : リポジトリ
  - `src/main/java/com/mmd/model/entity/` : エンティティ（model 配下に整理）
  - `src/main/resources/` : リソース
- `db/` : 今後実装予定のデータベース関連

## 実行方法
### 必須環境変数
以下の環境変数が設定されていない場合、起動時に警告が表示され認証が機能しません。

- `JWT_SECRET`: JWT 署名用の秘密鍵
- `API_KEY`: 固定 API キー

Linux/macOS の例:
```bash
export JWT_SECRET=your-secret
export API_KEY=your-api-key
```

Windows (PowerShell) の例:
```powershell
$env:JWT_SECRET="your-secret"
$env:API_KEY="your-api-key"
```

### 実行方法
- Python サーバ: `cd python` して `python app.py`
- Java サーバ (Spring Boot):
  - 開発起動: `cd java && mvn spring-boot:run`
  - JAR 実行: `cd backend && mvn package && java -jar java/target/java-0.1.0.jar`

詳細な手順は今後各サブディレクトリに追加される README を参照してください。
