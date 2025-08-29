# バックエンド

本ディレクトリは、Web アプリケーションのサーバサイド処理を担当するバックエンドです。

## 構成
- `python/` : Python によるサービス（サンプルとして `app.py` を含みます）
- `java/` : Java によるサービス
  - `src/main/java/com/mmd/App.java` : エントリーポイント
  - `src/main/java/com/mmd/controller/` : コントローラクラス
  - `src/main/java/com/mmd/service/` : サービスクラス
  - `src/main/java/com/mmd/security/` : セキュリティ関連クラス
  - `src/main/java/com/mmd/repository/` : リポジトリクラス
  - `src/main/java/com/mmd/entity/` : エンティティ
  - `src/main/resources/` : リソース
- `db/` : 今後実装予定のデータベース関連

## 実行方法
- Python サーバ: `cd python` して `python app.py`
- Java サーバ: `cd java` して `gradle build && java -cp build/classes/java/main com.mmd.App` または `mvn package && java -cp target/classes com.mmd.App`

詳細な手順は今後各サブディレクトリに追加される README を参照してください。
