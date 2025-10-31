# Frontend (Vue 3 + Vite)

Web-based VRM viewer and motion editor built with Vue 3 and Three.js.

## Technology

- Vue 3.5 (Composition API)
- Vite 7.1
- Three.js 0.164
- @pixiv/three-vrm 2.0

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

API requests to `/api` are proxied to `http://localhost:8081` (see `vite.config.js`).

## Build

```bash
npm run build
```

Output: `dist/`

## Test

```bash
npm test
```

## Project Structure

```
src/
├── components/     # Vue components
├── composables/    # Composition API functions
├── utils/          # Utility functions
├── locales/        # i18n translations
└── api/            # API clients
```

## Documentation

- [Virtual Trackers](../docs/VIRTUAL_TRACKERS.md) - 11-point tracker system
- [Architecture](../docs/ARCHITECTURE.md) - System design overview
