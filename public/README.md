# public/

This directory is mounted into the Nginx container (see `docker-compose.yml`) and served via:

- `http://localhost/public/` (directory listing in dev)

Use it for small, non-sensitive static files you intentionally want to expose.

Notes:
- Do **not** put secrets here.
- For VRM samples used by the app, see `frontend/public/vrm/`.
