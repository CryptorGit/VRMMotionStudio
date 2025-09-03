Development Logs Policy

This repository writes rich runtime diagnostics to a local file during frontend development.

- Log file: `frontend/.logs/dev.log` (JSON Lines)
- Dev endpoint: `POST /__dev__/log` (appends) and `POST /__dev__/log/clear` (clears)

When investigating issues, always read this log while working:

1) Start the frontend dev server (`npm run dev` in `frontend/`).
2) Tail the log: `tail -f frontend/.logs/dev.log` (or open in your editor).
3) Reproduce the issue. The app streams detailed events (IK, cache, loader, ammo) into this file.

Notes
- In production builds the app posts logs to the backend (`/api/log`) instead; the local file logger is dev-only.
- If the log grows large, the dev server rotates it at ~5MB (`frontend/.logs/dev.log.1`).

Action: Always consult `frontend/.logs/dev.log` during debugging before and after making changes.

