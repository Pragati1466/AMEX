"""
Application configuration using Pydantic Settings.
Loads environment variables from .env file.
"""

from pathlib import Path
from typing import Optional, Union

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Global application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent.parent.parent / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    APP_NAME: str = "DisputeIQ"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = "AI-Powered Multi-Agent Dispute Resolution System"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/dispute_iq"

    # JWT Authentication
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Groq LLM
    GROQ_API_KEY: Optional[str] = None

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None

    # ChromaDB
    CHROMA_PERSIST_DIR: str = "./chroma_db"

    # Logging
    LOG_LEVEL: str = "DEBUG"

    # CORS - accept both JSON string and raw string for cross-env compatibility
    CORS_ORIGINS: Union[str, list[str]] = ["http://localhost:3000", "http://localhost:5173"]


settings = Settings()


def get_cors_origins() -> list[str]:
    """
    Get CORS origins as a list, handling both JSON-encoded strings
    and raw string values from environment variables.
    Falls back to default if parsing fails.
    """
    import json
    from loguru import logger

    raw = settings.CORS_ORIGINS
    if isinstance(raw, list):
        return raw
    if isinstance(raw, str):
        # Try JSON parsing (e.g., '["*"]', '["http://localhost:3000"]')
        raw_stripped = raw.strip()
        if raw_stripped.startswith("[") and raw_stripped.endswith("]"):
            try:
                parsed = json.loads(raw_stripped)
                if isinstance(parsed, list):
                    return parsed
            except (json.JSONDecodeError, TypeError) as e:
                logger.warning(f"Failed to parse CORS_ORIGINS JSON: {e}")
        # Comma-separated fallback
        if "," in raw_stripped:
            return [origin.strip().strip('"').strip("'") for origin in raw_stripped.split(",")]
        # Single origin
        return [raw_stripped.strip('"').strip("'")]
    return ["*"]  # Fallback to allow all