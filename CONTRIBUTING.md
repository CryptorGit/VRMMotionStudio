# Contributing

Thanks for considering contributing.

## Development setup

- Frontend: `frontend/` (Vue 3 + Vite)
- Backend: `backend/java/` (Spring Boot)

### Run (local dev)

```powershell
cd backend/java
mvn spring-boot:run
```

```powershell
cd frontend
npm install
npm run dev
```

## Documentation

- Main entry: `README.md`
- Technical docs: `docs/INDEX.md`

When changing behavior or configuration (ports, URLs, env vars), update the related docs in the same PR.

## Security

If you believe you found a security issue, please follow `SECURITY.md`.
