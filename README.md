# Splitwise Backend

A FastAPI + PostgreSQL backend for splitting expenses between friends and groups.

## Features

- 🔐 JWT-based auth (signup / login)
- 👥 Groups with membership management
- 💸 Expenses with flexible split details
- ✅ Settlement recording
- 🗄️ Async SQLAlchemy + Alembic migrations

## Tech Stack

| Layer | Library |
|-------|---------|
| API | FastAPI 0.111 |
| ORM | SQLAlchemy 2 (async) |
| Migrations | Alembic |
| DB driver | asyncpg |
| Auth | python-jose (JWT) + bcrypt |
| Validation | Pydantic v2 |

---

## Local Development

### Prerequisites

- Python 3.11+
- PostgreSQL 14+ running locally (or via Docker)

### 1. Clone & create virtual environment

```bash
git clone https://github.com/ticketvipers/splitwise.git
cd splitwise
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your actual values
```

#### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+asyncpg://postgres:postgres@localhost:5432/splitwise` | Async PostgreSQL DSN |
| `SECRET_KEY` | `changeme-...` | JWT signing secret — **change this in production!** |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Token TTL (1 day) |

### 4. Create the database

```bash
psql -U postgres -c "CREATE DATABASE splitwise;"
```

Or with Docker:

```bash
docker run -d \
  --name splitwise-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=splitwise \
  -p 5432:5432 \
  postgres:16
```

### 5. Run migrations

```bash
alembic upgrade head
```

### 6. Start the server

```bash
uvicorn app.main:app --reload
```

API is available at http://localhost:8000  
Interactive docs: http://localhost:8000/docs

---

## API Overview

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/signup` | Create account |
| POST | `/api/v1/auth/login` | Get JWT token |

### Groups

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/groups` | Create group |
| GET | `/api/v1/groups` | List my groups |
| GET | `/api/v1/groups/{id}` | Get group details |
| PATCH | `/api/v1/groups/{id}` | Update group |

### Expenses

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/groups/{id}/expenses` | Add expense with splits |
| GET | `/api/v1/groups/{id}/expenses` | List group expenses |

### Settlements

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/groups/{id}/settlements` | Record a payment |

All endpoints except `/auth/*` require `Authorization: Bearer <token>`.

---

## Database Schema

```
users ──< memberships >── groups
               │
           expenses ──< splits
               │
           settlements
```

- **users** — accounts with bcrypt-hashed passwords
- **groups** — expense groups (trips, households, etc.)
- **memberships** — many-to-many users ↔ groups with roles (admin/member)
- **expenses** — a payment made by one user on behalf of the group
- **splits** — how an expense is distributed across members
- **settlements** — direct payments between members to settle debts

---

## Project Structure

```
splitwise-backend/
├── app/
│   ├── api/
│   │   ├── deps.py          # Auth dependency injection
│   │   └── v1/
│   │       ├── auth.py
│   │       ├── groups.py
│   │       ├── expenses.py
│   │       └── settlements.py
│   ├── core/
│   │   ├── config.py        # Settings via pydantic-settings
│   │   └── security.py      # JWT + bcrypt helpers
│   ├── db/
│   │   └── session.py       # Async engine + session factory
│   ├── models/
│   │   └── models.py        # SQLAlchemy ORM models
│   ├── schemas/
│   │   └── schemas.py       # Pydantic request/response models
│   └── main.py              # FastAPI app entry point
├── alembic/
│   ├── env.py
│   └── versions/
│       └── 0001_initial_schema.py
├── alembic.ini
├── requirements.txt
└── .env.example
```
