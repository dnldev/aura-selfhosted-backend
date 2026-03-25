# Aura Self-Hosted Backend

A lightweight, self-hosted backend for the Aura reading tracker app.

## Quick Start

```bash
# Using Docker Compose (recommended)
JWT_SECRET=your-secret-here docker compose up -d

# Or manually
npm install
npm run build
JWT_SECRET=your-secret-here npm start
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3400` | Server port |
| `JWT_SECRET` | *(required)* | Secret for signing JWT tokens |
| `AURA_DB_PATH` | `./data/aura.db` | Path to SQLite database |

## Connecting from Aura App

1. During onboarding, select **"Self-Hosted"** storage mode
2. Enter your server URL (e.g., `http://192.168.1.100:3400`)
3. Register an account directly through the app
4. Your data stays on YOUR hardware

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Login → JWT |
| POST | `/api/auth/recover` | No | Recovery code reset |
| GET | `/api/books` | JWT | List all books |
| POST | `/api/books` | JWT | Create book |
| PATCH | `/api/books/:id` | JWT | Update book |
| DELETE | `/api/books/:id` | JWT | Delete book |
| GET | `/api/sessions` | JWT | List sessions |
| POST | `/api/sessions` | JWT | Create session |
| GET | `/api/preferences` | JWT | User prefs |
| GET | `/api/health` | No | Health check |

## Data

All data is stored in a single SQLite file. Back it up regularly:

```bash
cp /data/aura.db /backup/aura-$(date +%Y%m%d).db
```

## Stack

- **Runtime:** Node.js 22
- **Database:** better-sqlite3 (zero config)
- **Auth:** bcrypt + JWT
- **No external dependencies** — runs entirely offline
