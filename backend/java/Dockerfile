# バックエンド用 Dockerfile (Spring Boot)
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app

# pom.xmlをコピーして依存関係をダウンロード
COPY pom.xml .
RUN mvn dependency:go-offline -B

# ソースコードをコピーしてビルド
COPY src ./src
RUN mvn clean package -DskipTests -B

# 実行用イメージ
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# ビルドしたJARファイルをコピー（明示的なファイル名）
COPY --from=build /app/target/java-*.jar app.jar

# ポート8081を公開
EXPOSE 8081

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8081/actuator/health || exit 1

# アプリケーション起動
ENTRYPOINT ["java", "-jar", "app.jar", "--server.port=8081"]
