# Deployment Guide

This document covers local development setup, staging deployment approach, release checklist, rollback plan, and monitoring/logging considerations.

---

## Table of Contents

1. [Local Development](#local-development)
2. [Docker Compose (Recommended Dev)](#docker-compose-recommended-dev)
3. [Staging Deploy](#staging-deploy)
4. [Release Checklist](#release-checklist)
5. [Rollback Plan](#rollback-plan)
6. [Monitoring & Logging](#monitoring--logging)

---

## Local Development

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Python | 3.11+ | Backend runtime |
| Node.js | 20+ | Frontend runtime |
| PostgreSQL | 14+ | Database (or via Docker) |
| Docker + Compose | v2+ | Optional but recommended |

### Without Docker

**Backend:**

```bash
# Clone repo
git clone https://github.com/ticketvipers/splitwise.git
cd splitwise

# Backend setup
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Configure env
cp .env.example .env
# Edit .env — set SECRET_KEY (required):
#   openssl rand -hex 32

# Create DB (PostgreSQL must be running)
psql -U postgres -c "CREATE DATABASE splitwise;"

# Run migrations
alembic upgrade head

# Start backend
uvicorn app.main:app --reload
# → http://localhost:8000
# → http://localhost:8000/docs (Swagger)
```

**Frontend:**

```bash
# In the same repo root
npm install
cp .env.local.example .env.local
npm run dev
# → http://localhost:3000
```

---

## Docker Compose (Recommended Dev)

Docker Compose starts all three services (PostgreSQL, backend, frontend) with a single command.

```bash
# Copy env files
cp .env.example .env           # backend env
cp .env.local.example .env.local  # frontend env

# Set SECRET_KEY in .env
echo "SECRET_KEY=$(openssl rand -hex 32)" >> .env

# Start everything
docker compose up --build

# In a separate terminal, check logs
docker compose logs -f backend
```

**Services:**

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |

**Stopping:**

```bash
docker compose down          # stop containers, keep DB volume
docker compose down -v       # stop containers AND delete DB volume (fresh start)
```

---

## Staging Deploy

> **Status: Deferred** — No dedicated staging environment is provisioned yet.
> The recommended path when needed is a Railway or Render deployment (see below).

### Option A: Railway (Recommended)

1. Create a project at [railway.app](https://railway.app)
2. Add a **PostgreSQL** plugin — Railway auto-injects `DATABASE_URL`
3. Deploy backend from the `main` branch using `Dockerfile.backend`
4. Set environment variables (see `.env.example`) in Railway dashboard
5. Deploy frontend separately (or use Vercel — see Option B)

### Option B: Vercel (Frontend) + Railway (Backend)

- Frontend → [vercel.com](https://vercel.com): connect repo, set `NEXT_PUBLIC_API_URL` to Railway backend URL
- Backend → Railway as above

### Option C: Self-Hosted (VPS / Docker)

```bash
# On your server
git pull origin main
docker compose -f docker-compose.yml up -d --build
```

Use a reverse proxy (nginx/Caddy) in front of ports 8000 and 3000.

---

## Release Checklist

Run through this before every release to `main` / production:

### Pre-Deploy

- [ ] All CI checks passing (lint, tests)
- [ ] `requirements.txt` and `package.json` are up to date
- [ ] New environment variables documented in `.env.example` and this file
- [ ] Database migrations created for schema changes (`alembic revision --autogenerate -m "..."`)
- [ ] Migrations tested locally (`alembic upgrade head` on a clean DB)
- [ ] API changes documented in `API_CONVENTIONS.md`

### Deploy

- [ ] Merge PR to `main`
- [ ] Tag the release: `git tag v0.x.0 && git push --tags`
- [ ] Run migrations on the target environment:
  ```bash
  alembic upgrade head
  ```
- [ ] Restart the backend process / container
- [ ] Deploy frontend (Vercel auto-deploys on push, or `docker compose up -d`)

### Post-Deploy Smoke Tests

- [ ] `GET /health` returns 200 (add health endpoint if missing — see Monitoring section)
- [ ] Auth: sign up + login flow works
- [ ] Create a group, add an expense, record a settlement
- [ ] Frontend loads at expected URL without console errors

### Sign-Off

- [ ] Release notes updated (CHANGELOG or GitHub Release)
- [ ] Team notified in relevant channel

---

## Rollback Plan

### Backend

```bash
# 1. Identify the last known-good tag or commit
git log --oneline -10

# 2. Revert migration (if schema changed)
alembic downgrade -1

# 3. Deploy the previous version
git checkout v0.x.0-previous
docker compose up -d --build
```

### Frontend

- If on Vercel: use the **Instant Rollback** button in the Vercel dashboard
- If self-hosted: redeploy the previous Docker image or git tag

### Database

- Take a pg_dump before each production deploy:
  ```bash
  pg_dump -U postgres splitwise > backup_$(date +%Y%m%d_%H%M%S).sql
  ```
- Restore with:
  ```bash
  psql -U postgres splitwise < backup_YYYYMMDD_HHMMSS.sql
  ```

---

## Monitoring & Logging

### Logging

FastAPI uses Python's standard `logging` module. Uvicorn emits access logs by default.

**Local / Docker:**

```bash
docker compose logs -f backend   # live backend logs
docker compose logs -f frontend  # live frontend logs
```

**Recommended additions (when needed):**

- Structured JSON logging via [`structlog`](https://www.structlog.org/) for easier parsing
- Correlation IDs per request (middleware) for tracing across services
- Error boundary logging in Next.js frontend (`error.tsx`)

### Health Check Endpoint

Add a simple health endpoint to the backend for uptime monitoring:

```python
# app/main.py
@app.get("/health")
async def health():
    return {"status": "ok"}
```

### External Tools (when applicable)

| Need | Tool | Notes |
|------|------|-------|
| Error tracking | [Sentry](https://sentry.io) | `pip install sentry-sdk[fastapi]` / `npm install @sentry/nextjs` |
| Uptime monitoring | [BetterUptime](https://betterstack.com/better-uptime) or UptimeRobot | Monitor `/health` |
| Log aggregation | [Logtail](https://betterstack.com/logs) / Papertrail | Drain Docker logs |
| Metrics | Prometheus + Grafana | For heavier production workloads |

> For the current stage of the project, basic Docker logs + Sentry for error tracking is sufficient.
