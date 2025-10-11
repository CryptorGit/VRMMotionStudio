# Backend 起動ガイド

## 前提条件

- **Java 17** 以上がインストールされていること
- **Maven 3.6+** がインストールされていること（または Maven Wrapper を使用）

## 起動方法

### 方法1: 起動スクリプトを使用（推奨）

```powershell
cd backend
.\start-backend.ps1
```

または

```cmd
cd backend
start-backend.bat
```

このスクリプトは：
1. JARファイルの存在を確認
2. 存在しない場合は自動的にビルド（`mvn clean package -DskipTests`）
3. Spring Bootアプリケーションを起動

### 方法2: Maven経由で直接起動

```powershell
cd backend\java
mvn spring-boot:run
```

### 方法3: ビルド済みJARを直接起動

```powershell
cd backend
java -jar java\target\java-0.1.0.jar --spring.profiles.active=local
```

## プロファイル

- **local**: ローカル開発用（デフォルト）
- H2インメモリデータベースを使用
- ポート: `8081`

## ビルドのみ実行

```powershell
cd backend\java
mvn clean package
```

テストをスキップする場合：

```powershell
mvn clean package -DskipTests
```

## アクセス確認

起動後、以下のURLでアクセス可能：

- **API**: http://localhost:8081
- **Health Check**: http://localhost:8081/actuator/health
- **H2 Console**: http://localhost:8081/h2-console（開発時のみ）

## トラブルシューティング

### "Unable to access jarfile" エラー

JARファイルが存在しない場合です。以下でビルド：

```powershell
cd backend\java
mvn clean package
```

### ポートが既に使用されている

別のアプリケーションがポート8081を使用している可能性があります：

```powershell
# ポートを確認
netstat -ano | findstr :8081

# プロセスを終了
taskkill /PID <PID> /F
```

または、別のポートで起動：

```powershell
java -jar java\target\java-0.1.0.jar --server.port=8082
```

### Java バージョンエラー

このプロジェクトはJava 17が必要です：

```powershell
java -version
```

Java 17がインストールされていない場合は、[Adoptium](https://adoptium.net/)からダウンロードしてください。

## Docker使用時

Dockerを使用する場合は、ルートディレクトリで：

```powershell
docker-compose up backend
```

## 開発モード

コード変更を自動反映する場合：

```powershell
cd backend\java
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Dspring.profiles.active=local"
```
