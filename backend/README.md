# Backend / バックエンド

Backend services for VRM Motion Studio.

## Structure

- **`java/`**: Spring Boot 3 (main backend service)
- **`python/`**: Flask service (optional, for logging/debugging)

## Quick Start

See the [main README](../README.md) for complete setup instructions.

### Java (Spring Boot)

```bash
cd java
mvn spring-boot:run
```

Runs at `http://localhost:8081`

### Python (Flask) - Optional

```bash
cd python
pip install -r requirements.txt
python app.py --port 8000
```

Runs at `http://localhost:8000`

## Documentation

- [API Reference](../docs/API.md) - API endpoint documentation
- [Architecture](../docs/ARCHITECTURE.md) - System architecture overview
