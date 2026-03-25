# Aura Self-Hosted Backend

A lightweight, self-hosted backend for the [Aura](https://www.aurareads.app) reading tracker app. Keep all your reading data on your own hardware.

## Quick Start with Docker Compose

1. Create a `docker-compose.yml`:

```yaml
services:
  aura:
    image: hoidhopper/aura-backend:latest
    container_name: aura-backend
    restart: unless-stopped
    ports:
      - "3400:3400"
    volumes:
      - aura-data:/data
    environment:
      - PORT=3400
      # REQUIRED: Change this to a strong random secret before running.
      # Generate one with: openssl rand -hex 32
      - JWT_SECRET=${JWT_SECRET:-please-change-this-secret}
      - AURA_DB_PATH=/data/aura.db

volumes:
  aura-data:
    driver: local
```

2. Generate a secure JWT secret and start:

```bash
JWT_SECRET=$(openssl rand -hex 32) docker compose up -d
```

> **Tip:** To persist the secret across restarts, save it in a `.env` file:
> ```bash
> echo "JWT_SECRET=$(openssl rand -hex 32)" > .env
> docker compose up -d
> ```

3. Verify it's running:

```bash
curl http://localhost:3400/health
# {"status":"ok","version":"1.0.0"}
```

4. Point the Aura app at `http://<your-server-ip>:3400`

### Manual Installation (without Docker)

```bash
git clone https://github.com/dnldev/aura-selfhosted-backend.git
cd aura-selfhosted-backend
npm install
npm run build
JWT_SECRET=$(openssl rand -hex 32) npm start
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3400` | Server port |
| `JWT_SECRET` | *(required)* | Secret for signing JWT tokens |
| `AURA_DB_PATH` | `./data/aura.db` | Path to SQLite database file |

### Optional: Email Password Reset

| Variable | Description |
|---|---|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (587 for STARTTLS, 465 for SSL) |
| `SMTP_USER` | SMTP username/email |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | From address |
| `APP_BASE_URL` | App URL for reset links (default: `https://www.aurareads.app`) |

Without SMTP, users can reset passwords using their recovery code (shown during registration).

## Connecting from Aura App

1. Open Aura → **Settings → Storage → Self-Hosted**
2. Enter your server URL (e.g., `http://192.168.1.100:3400`)
3. Register an account directly through the app
4. Your data stays on YOUR hardware

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Health check |
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Login → JWT |
| POST | `/api/auth/recover` | No | Recovery code reset |
| POST | `/api/auth/forgot-password` | No | Email reset link (requires SMTP) |
| POST | `/api/auth/reset-password` | No | Reset password via email token |
| PATCH | `/api/auth/email` | JWT | Change email address |
| GET | `/api/books` | JWT | List all books |
| POST | `/api/books` | JWT | Create book |
| PATCH | `/api/books/:id` | JWT | Update book |
| DELETE | `/api/books/:id` | JWT | Delete book |
| GET | `/api/sessions` | JWT | List sessions |
| POST | `/api/sessions` | JWT | Create session |
| GET | `/api/preferences` | JWT | User prefs |
| GET | `/api/tickets` | JWT | List tickets |
| POST | `/api/tickets` | JWT | Create ticket |
| PATCH | `/api/tickets/:id` | JWT | Update ticket |

## Data & Backups

All data is stored in a single SQLite file inside the Docker volume. Back it up regularly:

```bash
docker cp aura-backend:/data/aura.db ./aura-backup-$(date +%Y%m%d).db
```

## Updating

```bash
docker compose pull
docker compose up -d
```

## Troubleshooting

### "unable to open database file"

This usually means the volume mount path doesn't match `AURA_DB_PATH`:

```yaml
# ✅ Correct
volumes:
  - aura-data:/data
environment:
  - AURA_DB_PATH=/data/aura.db

# ❌ Wrong — mismatched paths
volumes:
  - aura-data:/app/data
environment:
  - AURA_DB_PATH=/data/aura.db
```

For bind mounts, ensure the directory is writable:

```bash
mkdir -p ./data && chown 1001:1001 ./data
```

### Other Issues

| Problem | Fix |
|---|---|
| "Connection refused" | Check `docker ps` — is the container running? |
| "Invalid token" after restart | JWT_SECRET changed. Save it in a `.env` file. |
| Container exits immediately | Run `docker logs aura-backend` to see the error |

## Stack

- **Runtime:** Node.js 22
- **Database:** better-sqlite3 (zero config, single file)
- **Auth:** bcrypt + JWT
- **No external dependencies** — runs entirely offline

## License

MIT
