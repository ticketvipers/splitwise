import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import auth, groups, expenses, settlements

app = FastAPI(title="Splitwise API", version="1.0.0")

# CORS middleware — origins from CORS_ORIGINS env var (comma-separated)
_cors_raw = os.environ.get("CORS_ORIGINS", "http://localhost:3000")
cors_origins = [o.strip() for o in _cors_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(groups.router, prefix="/api/v1")
app.include_router(expenses.router, prefix="/api/v1")
app.include_router(settlements.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}
