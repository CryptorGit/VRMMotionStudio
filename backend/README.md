# バックエンド

本ディレクトリは、Web アプリケーションのサーバサイド処理を担当するバックエンドです。

## 構成
- `python/` : Python によるサービス（サンプルとして `app.py` を含みます）
- `java/` : Java によるサービス
  - `com/mmd/App.java` : エントリーポイント
  - `com/mmd/controller/` : コントローラクラス
  - `com/mmd/service/` : サービスクラス
  - `com/mmd/security/` : セキュリティ関連クラス
- `db/` : 今後実装予定のデータベース関連

## 実行方法
- Python サーバ: `cd python` して `python app.py`
- Java サーバ: `cd java` して `javac $(find com -name "*.java") && java com.mmd.App`

詳細な手順は今後各サブディレクトリに追加される README を参照してください。
