"""Email backends.

Two implementations exist:

- ``LoggingBackend`` writes structured events to the application log and is
  the default in development and test environments. PII handling: only the
  recipient address and the link are logged.
- ``SMTPMailer`` sends real mail via ``aiosmtplib`` and is selected
  automatically in production when ``PLUSMAP_SMTP_HOST`` is configured.

Templates are deutsch (project default language) and plain text.
"""

from __future__ import annotations

from email.message import EmailMessage
from importlib import resources
from typing import Protocol
from urllib.parse import quote, urljoin

import aiosmtplib
import structlog

from app.config import Settings, get_settings

logger = structlog.get_logger(__name__)


class EmailBackend(Protocol):
    async def send_password_reset(self, email: str, token: str) -> None: ...

    async def send_verify(self, email: str, token: str) -> None: ...


def _load_template(name: str) -> str:
    """Load a plain-text mail template shipped with the package."""
    return resources.files("app.auth.templates").joinpath(name).read_text(encoding="utf-8")


def _build_url(base_url: str, path: str, token: str) -> str:
    """Build a frontend URL with a URL-encoded token query parameter."""
    base = base_url.rstrip("/") + "/"
    return urljoin(base, path.lstrip("/")) + f"?token={quote(token, safe='')}"


class LoggingBackend:
    """Default development/test backend: writes the message to the structured log."""

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()

    async def send_password_reset(self, email: str, token: str) -> None:
        logger.info(
            "auth.mail.password_reset",
            recipient=email,
            reset_url=_build_url(self._settings.base_url, "reset-password", token),
        )

    async def send_verify(self, email: str, token: str) -> None:
        logger.info(
            "auth.mail.verify",
            recipient=email,
            verify_url=_build_url(self._settings.base_url, "verify", token),
        )


class SMTPMailer:
    """Production backend: sends mail through an SMTP server via ``aiosmtplib``."""

    def __init__(self, settings: Settings) -> None:
        if not settings.smtp_host:
            raise ValueError("SMTPMailer requires PLUSMAP_SMTP_HOST to be set.")
        if settings.smtp_from is None:
            raise ValueError("SMTPMailer requires PLUSMAP_SMTP_FROM to be set.")
        if settings.smtp_starttls and settings.smtp_use_tls:
            raise ValueError(
                "PLUSMAP_SMTP_STARTTLS and PLUSMAP_SMTP_USE_TLS are mutually exclusive."
            )
        self._settings = settings

    async def send_password_reset(self, email: str, token: str) -> None:
        body = _load_template("password_reset.txt").format(
            reset_url=_build_url(self._settings.base_url, "reset-password", token),
        )
        await self._send(
            recipient=email,
            subject="Plus-Map: Passwort zuruecksetzen",
            body=body,
            event="auth.mail.password_reset",
        )

    async def send_verify(self, email: str, token: str) -> None:
        body = _load_template("verify.txt").format(
            verify_url=_build_url(self._settings.base_url, "verify", token),
        )
        await self._send(
            recipient=email,
            subject="Plus-Map: E-Mail-Adresse bestaetigen",
            body=body,
            event="auth.mail.verify",
        )

    async def _send(self, *, recipient: str, subject: str, body: str, event: str) -> None:
        message = EmailMessage()
        message["From"] = f"{self._settings.smtp_from_name} <{self._settings.smtp_from}>"
        message["To"] = recipient
        message["Subject"] = subject
        message.set_content(body)

        username = self._settings.smtp_user or None
        password = (
            self._settings.smtp_password.get_secret_value()
            if username and self._settings.smtp_password.get_secret_value()
            else None
        )

        try:
            await aiosmtplib.send(
                message,
                hostname=self._settings.smtp_host,
                port=self._settings.smtp_port,
                username=username,
                password=password,
                start_tls=self._settings.smtp_starttls,
                use_tls=self._settings.smtp_use_tls,
            )
        except aiosmtplib.SMTPException:
            logger.exception(event, recipient=recipient, status="failed")
            raise
        else:
            logger.info(event, recipient=recipient, status="sent")


def get_email_backend() -> EmailBackend:
    """FastAPI dependency for the active email backend.

    Selection rule: SMTPMailer is used when ``PLUSMAP_SMTP_HOST`` is non-empty;
    otherwise the LoggingBackend is returned. This makes the development
    default (no SMTP configured) safe and the production switch ENV-only.
    """
    settings = get_settings()
    if settings.smtp_host:
        return SMTPMailer(settings)
    return LoggingBackend(settings)
