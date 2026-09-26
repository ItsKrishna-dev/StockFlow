"""
app/core/config.py

Central, environment-driven settings. Nothing in the rest of the codebase
should read os.environ directly — always import `settings` from here so
there is exactly one source of truth and no version-conflict surprises
when a config value changes.
"""
from pydantic import model_validator
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

    # --- SMTP / Real-Time Email Delivery ---
    SMTP_HOST: str | None = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_TLS: bool = True
    EMAILS_FROM_EMAIL: str = "support@stocksense.io"
    EMAILS_FROM_NAME: str = "StockSense Inventory"

    # Direct aliases for common mail config names
    MAIL_USERNAME: str | None = None
    MAIL_PASSWORD: str | None = None
    MAIL_FROM: str | None = None
    MAIL_SERVER: str | None = None
    MAIL_PORT: int | None = None
    MAIL_TLS: bool | None = None

    ENVIRONMENT: str = "development"

    @model_validator(mode="after")
    def resolve_smtp_defaults(self):
        if not self.SMTP_USER and self.MAIL_USERNAME:
            self.SMTP_USER = self.MAIL_USERNAME
        if not self.SMTP_PASSWORD and self.MAIL_PASSWORD:
            self.SMTP_PASSWORD = self.MAIL_PASSWORD
        if self.MAIL_SERVER:
            self.SMTP_HOST = self.MAIL_SERVER
        if self.MAIL_PORT:
            self.SMTP_PORT = self.MAIL_PORT
        if self.MAIL_TLS is not None:
            self.SMTP_TLS = self.MAIL_TLS
        if self.MAIL_FROM and self.EMAILS_FROM_EMAIL == "support@stocksense.io":
            self.EMAILS_FROM_EMAIL = self.MAIL_FROM
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
