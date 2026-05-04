"""Application configuration loaded from environment variables.

Single source of truth for runtime configuration. Loaded once at startup.
"""

from __future__ import annotations

from typing import Literal

from pydantic import EmailStr, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings sourced from environment variables.

    Variable names follow the pattern HCMAP_<NAME>. Defaults are intentionally
    chosen to fail loudly in production (no implicit secrets, no implicit DB).
    """

    model_config = SettingsConfigDict(
        env_prefix="HCMAP_",
        env_file=None,
        case_sensitive=False,
        extra="ignore",
        # Compose passes optional vars as ${HCMAP_X:-} (empty string when unset).
        # Treat empty values as missing so Field defaults apply — required for
        # smtp_from: EmailStr | None to accept the unset case.
        env_ignore_empty=True,
    )

    environment: Literal["development", "test", "production"] = "development"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"

    database_url: str = Field(
        default="postgresql+asyncpg://hcmap:hcmap@db:5432/hcmap",
        description="SQLAlchemy async DSN for Postgres+PostGIS.",
    )

    # --- Auth (M2) -------------------------------------------------------
    secret_key: str = Field(
        default="change-me-in-production-32-bytes-minimum",
        min_length=32,
        description="Server-side secret used to sign session JWTs.",
    )
    cookie_secure: bool = Field(
        default=True,
        description="Set Secure flag on auth cookies. Disable only in HTTP dev.",
    )
    cookie_lifetime_seconds: int = Field(
        default=60 * 60 * 24 * 7,
        description="Session cookie / JWT lifetime in seconds (default 7 days).",
    )
    argon2_time_cost: int = Field(default=2)
    argon2_memory_cost: int = Field(default=19456)
    argon2_parallelism: int = Field(default=1)

    # --- Tile provider (M5a, ADR-022) ----------------------------------
    maptiler_api_key: str = Field(
        default="",
        description="MapTiler Cloud API key (server-side only). Empty disables tile proxy.",
    )
    maptiler_style: str = Field(
        default="basic-v2",
        description="MapTiler map style identifier used for tile URLs.",
    )

    # --- Geocoding (M6.1, ADR-041 §B/§D) -------------------------------
    geocode_rate_per_minute: int = Field(
        default=30,
        ge=0,
        description=(
            "Per-user token-bucket limit for /api/geocode requests "
            "(rolling 60 s window). 0 disables rate limiting."
        ),
    )

    # --- Public base URL (M10.2, ADR-051 §C) ----------------------------
    base_url: str = Field(
        default="http://localhost:3000",
        description=(
            "Public origin of the frontend, used to build links in outgoing "
            "mail (e.g. password-reset URLs). MUST point at the frontend "
            "origin, not the backend."
        ),
    )

    # --- SMTP / Mail (M10.2, ADR-051 §C) --------------------------------
    smtp_host: str = Field(
        default="",
        description=(
            "SMTP server hostname. Empty disables SMTP and falls back to the "
            "logging mail backend (development/test)."
        ),
    )
    smtp_port: int = Field(
        default=587,
        ge=1,
        le=65535,
        description="SMTP server port. 587 = STARTTLS, 465 = implicit TLS, 25 = plain.",
    )
    smtp_user: str = Field(
        default="",
        description="SMTP username. Empty = unauthenticated SMTP.",
    )
    smtp_password: SecretStr = Field(
        default=SecretStr(""),
        description="SMTP password. Empty when smtp_user is empty.",
    )
    smtp_starttls: bool = Field(
        default=True,
        description="Use STARTTLS (typical for port 587). Disable for port 465.",
    )
    smtp_use_tls: bool = Field(
        default=False,
        description="Use implicit TLS (typical for port 465). Mutually exclusive with starttls.",
    )
    smtp_from: EmailStr | None = Field(
        default=None,
        description=(
            "Envelope and From-header sender address. Required when smtp_host "
            "is set; otherwise unused."
        ),
    )
    smtp_from_name: str = Field(
        default="HC-Map",
        description="Display name for the From-header.",
    )


def get_settings() -> Settings:
    """Return a fresh Settings instance.

    Not cached: tests override env vars between cases. Callers that need
    a stable instance should hold the returned object themselves.
    """
    return Settings()
