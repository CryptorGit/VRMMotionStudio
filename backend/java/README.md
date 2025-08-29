# Java バックエンド (Maven)

標準的な Maven プロジェクト構成で、`src/main/java` 以下にソースコード、`src/main/resources` 以下にリソースを配置しています。

主なパッケージ構成:
- `com.mmd.App` : エントリーポイント
- `com.mmd.controller` : コントローラ
- `com.mmd.service` : サービス
- `com.mmd.security` : セキュリティ
- `com.mmd.repository` : リポジトリ
- `com.mmd.model.entity` : エンティティ（model 配下に整理）

## ビルド & 実行
```bash
# バックエンド直下から全体ビルド
cd ../
mvn package

# 実行（Java モジュールの classes を指定）
cd java
java -cp target/classes com.mmd.App
```
