import os

import pytest

# Ensure settings can initialize in test context
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://x:x@localhost/x")

from email.message import EmailMessage

from app.core.config import settings
from app.services import email as email_service


@pytest.mark.asyncio
async def test_send_magic_link_dev_mode_logs(monkeypatch, caplog) -> None:
    monkeypatch.setattr(settings, "send_real_email", False)

    with caplog.at_level("INFO"):
        await email_service.send_magic_link_email("user@example.com", "http://localhost:5173/en/auth/login?token=abc")

    assert "DEV_MAGIC_LINK" in caplog.text


@pytest.mark.asyncio
async def test_send_magic_link_real_mode_sends_email_message(monkeypatch) -> None:
    captured: dict = {}

    async def fake_send(message, **kwargs) -> None:
        captured["message"] = message
        captured.update(kwargs)

    monkeypatch.setattr(settings, "send_real_email", True)
    monkeypatch.setattr(settings, "email_host", "smtp-relay.brevo.com")
    monkeypatch.setattr(settings, "email_port", 587)
    monkeypatch.setattr(settings, "email_user", "smtp-user")
    monkeypatch.setattr(settings, "email_pass", "smtp-pass")
    monkeypatch.setattr(settings, "email_from", "noreply@example.com")
    monkeypatch.setattr(email_service.aiosmtplib, "send", fake_send)

    await email_service.send_magic_link_email("user@example.com", "http://localhost:5173/en/auth/login?token=abc")

    msg = captured["message"]
    # Must be a proper EmailMessage, not a raw string
    assert isinstance(msg, EmailMessage), f"Expected EmailMessage, got {type(msg)}"
    assert msg["From"] == "noreply@example.com"
    assert msg["To"] == "user@example.com"
    assert msg["Subject"] == "Your LivedHere magic sign-in link"
    assert "sign in" in msg.get_content().lower()

    # SMTP connection params
    assert captured["hostname"] == "smtp-relay.brevo.com"
    assert captured["port"] == 587
    assert captured["username"] == "smtp-user"
    assert captured["password"] == "smtp-pass"
    assert captured["start_tls"] is True
