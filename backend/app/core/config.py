"""
app/core/config.py

Central, environment-driven settings. Nothing in the rest of the codebase
should read os.environ directly — always import `settings` from here so
there is exactly one source of truth and no version-conflict surprises
when a config value changes.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- Database ---
    DATABASE_URL: str

    # --- Auth ---
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- CORS (comma-separated origins from .env) ---
    CORS_ORIGINS: str = "http://localhost:5173"

    # --- AI copilot (free-tier provider, not OpenAI) ---
    GROQ_API_KEY: str | None = None
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # --- Mail / Real-Time Email Delivery ---
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_PORT: int = 587
    MAIL_USERNAME: str | None = None
    MAIL_PASSWORD: str | None = None
    MAIL_FROM: str | None = None
    MAIL_FROM_NAME: str = "StockSense Inventory"
    MAIL_TLS: bool = True

    ENVIRONMENT: str = "development"

    @property
    def email_from(self) -> str:
        return self.MAIL_FROM or self.MAIL_USERNAME or "support@stocksense.io"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
