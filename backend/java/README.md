# Java バックエンド (Spring Boot / Maven)

標準的な Maven 構成です。Spring Boot 3、JPA、H2（メモリ）を使用しています。

主なパッケージ:
- `com.mmd.controller`
- `com.mmd.service`
- `com.mmd.security`
- `com.mmd.repository`
- `com.mmd.model.entity`

## 実行
```powershell
mvn spring-boot:run
# または
mvn package; java -jar target/java-0.1.0.jar
```
