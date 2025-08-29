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
- Python サーバ: `cd python` して `python app.py`
- Java サーバ (Spring Boot):
  - 開発起動: `cd java && mvn spring-boot:run`
  - JAR 実行: `cd backend && mvn package && java -jar java/target/java-0.1.0.jar`

詳細な手順は今後各サブディレクトリに追加される README を参照してください。
