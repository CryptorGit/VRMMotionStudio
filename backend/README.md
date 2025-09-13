# バックエンド

サーバサイドは Java (Spring Boot) がメイン、`python/` は補助的なサンプル API です。

## 構成
- `java/`
  - `src/main/java/com/mmd/`（controller, service, repository, security, model/entity）
  - `src/main/resources/`（`application.properties`, `schema.sql`, `data.sql`）
- `python/`
  - `app.py`（Flask + CORS）
# バックエンド

Web アプリのサーバサイド。Java (Spring Boot) がメイン、Python (Flask) は任意の補助サービスです。

## 構成
- `java/` … Spring Boot 3（Web, JPA, H2）
  - `controller/`, `service/`, `security/`, `repository/`, `model/entity/`, `resources/`
- `python/` … Flask サンプル API（`app.py`）

## 環境変数（共通）
`.env.example` を参考に設定してください。

- `ALLOWED_ORIGINS`: CORS 許可オリジン（例: `http://localhost:5173`）
- `JWT_SECRET`: JWT 署名用シークレット
- `API_KEY`: 固定 API キー（Bearer でない場合はヘッダ値と比較）

PowerShell 例:
```powershell
$env:ALLOWED_ORIGINS="http://localhost:5173"; $env:JWT_SECRET="dev-secret"; $env:API_KEY="dev-api-key"
```

## 実行方法
### Java (Spring Boot)
```powershell
cd java
mvn spring-boot:run
# JAR
mvn package; java -jar target/java-0.1.0.jar
```

### Python (Flask)
```powershell
cd python
pip install -r requirements.txt
python .\app.py --port 8000
```

## メモ
- 開発時、フロントは Vite 開発サーバが `/api` を `http://localhost:8080` にプロキシします。
- H2 はメモリ DB。`schema.sql` / `data.sql` を `resources/` に配置済み。
