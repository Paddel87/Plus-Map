"""Tests for the password-reset / verify mail backends (M10.2, ADR-051 §C)."""

from __future__ import annotations

from email.message import EmailMessage
from typing import Any
from unittest.mock import AsyncMock

import pytest
from app.auth.mail import (
    EmailBackend,
    LoggingBackend,
    SMTPMailer,
    _build_url,
    get_email_backend,
)
from app.config import Settings
from pydantic import SecretStr
from structlog.testing import capture_logs


def _settings(**overrides: Any) -> Settings:
    """Build a Settings instance with sensible test defaults."""
    base: dict[str, Any] = {
        "secret_key": "x" * 32,
        "base_url": "https://hc-map.example.org",
        "smtp_host": "",
        "smtp_port": 587,
        "smtp_user": "",
        "smtp_password": SecretStr(""),
        "smtp_starttls": True,
        "smtp_use_tls": False,
        "smtp_from": None,
        "smtp_from_name": "HC-Map Test",
    }
    base.update(overrides)
    return Settings(**base)


# ---- URL builder ----------------------------------------------------------


def test_build_url_appends_token_query_param() -> None:
    url = _build_url("https://hc-map.example.org", "reset-password", "abc123")
    assert url == "https://hc-map.example.org/reset-password?token=abc123"


def test_build_url_encodes_special_chars() -> None:
    url = _build_url("https://hc-map.example.org", "reset-password", "a/b+c=d")
    assert url == "https://hc-map.example.org/reset-password?token=a%2Fb%2Bc%3Dd"


def test_build_url_normalises_trailing_slash() -> None:
    url = _build_url("https://hc-map.example.org/", "/reset-password", "tok")
    assert url == "https://hc-map.example.org/reset-password?token=tok"


# ---- Logging backend ------------------------------------------------------


async def test_logging_backend_password_reset_logs_url() -> None:
    backend = LoggingBackend(_settings())
    with capture_logs() as logs:
        await backend.send_password_reset("user@example.org", "token-xyz")
    assert any(
        log.get("event") == "auth.mail.password_reset"
        and log.get("recipient") == "user@example.org"
        and "reset-password?token=token-xyz" in log.get("reset_url", "")
        for log in logs
    )


async def test_logging_backend_verify_logs_url() -> None:
    backend = LoggingBackend(_settings())
    with capture_logs() as logs:
        await backend.send_verify("user@example.org", "verify-tok")
    assert any(
        log.get("event") == "auth.mail.verify"
        and log.get("recipient") == "user@example.org"
        and "verify?token=verify-tok" in log.get("verify_url", "")
        for log in logs
    )


# ---- SMTPMailer validation ------------------------------------------------


def test_smtp_mailer_requires_host() -> None:
    with pytest.raises(ValueError, match="HCMAP_SMTP_HOST"):
        SMTPMailer(_settings())


def test_smtp_mailer_requires_from() -> None:
    with pytest.raises(ValueError, match="HCMAP_SMTP_FROM"):
        SMTPMailer(_settings(smtp_host="smtp.example.org"))


def test_smtp_mailer_rejects_starttls_and_implicit_tls() -> None:
    with pytest.raises(ValueError, match="mutually exclusive"):
        SMTPMailer(
            _settings(
                smtp_host="smtp.example.org",
                smtp_from="hc-map@example.org",
                smtp_starttls=True,
                smtp_use_tls=True,
            )
        )


# ---- SMTPMailer outgoing message construction ----------------------------


def _smtp_settings(**overrides: Any) -> Settings:
    """Defaults that satisfy the SMTPMailer constructor."""
    return _settings(
        smtp_host="smtp.example.org",
        smtp_port=587,
        smtp_starttls=True,
        smtp_use_tls=False,
        smtp_from="hc-map@example.org",
        smtp_from_name="HC-Map",
        **overrides,
    )


async def test_smtp_mailer_password_reset_message(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_send = AsyncMock(return_value=None)
    monkeypatch.setattr("app.auth.mail.aiosmtplib.send", fake_send)

    mailer = SMTPMailer(_smtp_settings())
    await mailer.send_password_reset("alice@example.org", "reset-tok-1")

    fake_send.assert_awaited_once()
    args, kwargs = fake_send.call_args
    assert kwargs["hostname"] == "smtp.example.org"
    assert kwargs["port"] == 587
    assert kwargs["start_tls"] is True
    assert kwargs["use_tls"] is False
    assert kwargs["username"] is None  # no smtp_user set in defaults
    assert kwargs["password"] is None
    message = args[0]
    assert isinstance(message, EmailMessage)
    assert message["From"] == "HC-Map <hc-map@example.org>"
    assert message["To"] == "alice@example.org"
    assert message["Subject"] == "HC-Map: Passwort zuruecksetzen"
    body = message.get_content()
    assert "https://hc-map.example.org/reset-password?token=reset-tok-1" in body


async def test_smtp_mailer_verify_message(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_send = AsyncMock(return_value=None)
    monkeypatch.setattr("app.auth.mail.aiosmtplib.send", fake_send)

    mailer = SMTPMailer(_smtp_settings())
    await mailer.send_verify("bob@example.org", "verify-tok-2")

    fake_send.assert_awaited_once()
    message = fake_send.call_args.args[0]
    assert message["Subject"] == "HC-Map: E-Mail-Adresse bestaetigen"
    body = message.get_content()
    assert "https://hc-map.example.org/verify?token=verify-tok-2" in body


async def test_smtp_mailer_passes_credentials_when_user_set(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_send = AsyncMock(return_value=None)
    monkeypatch.setattr("app.auth.mail.aiosmtplib.send", fake_send)

    mailer = SMTPMailer(
        _smtp_settings(
            smtp_user="hc-map@example.org",
            smtp_password=SecretStr("hunter2"),
        )
    )
    await mailer.send_password_reset("alice@example.org", "tok")

    kwargs = fake_send.call_args.kwargs
    assert kwargs["username"] == "hc-map@example.org"
    assert kwargs["password"] == "hunter2"


async def test_smtp_mailer_url_encodes_token(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_send = AsyncMock(return_value=None)
    monkeypatch.setattr("app.auth.mail.aiosmtplib.send", fake_send)

    mailer = SMTPMailer(_smtp_settings())
    await mailer.send_password_reset("alice@example.org", "tok/with+special=chars")

    body = fake_send.call_args.args[0].get_content()
    assert "token=tok%2Fwith%2Bspecial%3Dchars" in body


async def test_smtp_mailer_propagates_smtp_errors(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import aiosmtplib as smtp

    fake_send = AsyncMock(side_effect=smtp.SMTPException("boom"))
    monkeypatch.setattr("app.auth.mail.aiosmtplib.send", fake_send)

    mailer = SMTPMailer(_smtp_settings())
    with pytest.raises(smtp.SMTPException):
        await mailer.send_password_reset("alice@example.org", "tok")


# ---- Backend selection ----------------------------------------------------


def test_get_email_backend_uses_logging_when_host_empty(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("HCMAP_SECRET_KEY", "x" * 32)
    monkeypatch.delenv("HCMAP_SMTP_HOST", raising=False)
    backend: EmailBackend = get_email_backend()
    assert isinstance(backend, LoggingBackend)


def test_get_email_backend_uses_smtp_when_host_set(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("HCMAP_SECRET_KEY", "x" * 32)
    monkeypatch.setenv("HCMAP_SMTP_HOST", "smtp.example.org")
    monkeypatch.setenv("HCMAP_SMTP_FROM", "hc-map@example.org")
    backend = get_email_backend()
    assert isinstance(backend, SMTPMailer)
