from fastapi import FastAPI
from app.api.v1 import auth, groups, expenses, settlements

app = FastAPI(title="Splitwise API", version="1.0.0")

app.include_router(auth.router, prefix="/api/v1")
app.include_router(groups.router, prefix="/api/v1")
app.include_router(expenses.router, prefix="/api/v1")
app.include_router(settlements.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}
