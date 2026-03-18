import os
from pydantic_settings import BaseSettings


def _require_secret_key() -> str:
    key = os.environ.get("SECRET_KEY")
    if not key:
        raise RuntimeError("SECRET_KEY environment variable must be set")
    return key


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/splitwise"
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    CORS_ORIGINS: str = "http://localhost:3000"
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"
    FRONTEND_URL: str = "http://localhost:3000"

    class Config:
        env_file = ".env"

    def get_secret_key(self) -> str:
        if not self.SECRET_KEY:
            raise RuntimeError("SECRET_KEY environment variable must be set")
        return self.SECRET_KEY


settings = Settings()
# Validate SECRET_KEY at startup
if not settings.SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable must be set")
