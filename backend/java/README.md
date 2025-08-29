# Java バックエンド

標準的な Maven/Gradle のプロジェクト構成で、`src/main/java` 以下にソースコードを、`src/main/resources` 以下にリソースを配置しています。

## 実行方法

Gradle もしくは Maven でビルドしてください。

### Gradle の場合
```bash
gradle build
java -cp build/classes/java/main com.mmd.App
```

### Maven の場合
```bash
mvn package
java -cp target/classes com.mmd.App
```
