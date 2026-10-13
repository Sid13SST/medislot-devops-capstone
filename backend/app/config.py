from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, read from environment variables (12-factor style)."""

    app_name: str = "MediSlot API"
    database_url: str = "postgresql+psycopg://medislot:medislot@localhost:5432/medislot"
    # Wall-clock timezone of the clinic; used to decide what "today" means.
    clinic_timezone: str = "Asia/Kolkata"
    # Injected by Helm/CI so the running build can be traced back to a Git commit.
    git_sha: str = "local"
    environment: str = "development"
    cors_origins: list[str] = ["*"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
