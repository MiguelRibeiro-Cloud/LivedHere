import os
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://example:example@localhost/example")

from app.api import auth as auth_api
from app.core.config import Settings
from app.core.database import get_db
from app.core.security import hash_token
from app.models.entities import MagicLinkToken


class LinkSession:
    def __init__(self):
        self.saved = []
        self.committed = False

    def add(self, item):
        self.saved.append(item)

    async def commit(self):
        self.committed = True


def _production_settings_kwargs() -> dict:
    return {
        "DATABASE_URL": "postgresql+asyncpg://example:example@localhost/example",
        "ENVIRONMENT": "production",
        "JWT_SECRET": "test-only-non-default-jwt-secret",
    }


def test_development_allows_no_real_email(monkeypatch) -> None:
    monkeypatch.delenv("SEND_REAL_EMAIL", raising=False)
    configured = Settings(
        _env_file=None,
        DATABASE_URL="postgresql+asyncpg://example:example@localhost/example",
        ENVIRONMENT="development",
        SEND_REAL_EMAIL=False,
    )
    assert configured.send_real_email is False


@pytest.mark.parametrize("configured_delivery", [None, False], ids=["missing", "disabled"])
def test_production_rejects_no_real_email(monkeypatch, configured_delivery: bool | None) -> None:
    monkeypatch.delenv("SEND_REAL_EMAIL", raising=False)
    kwargs = _production_settings_kwargs()
    if configured_delivery is not None:
        kwargs["SEND_REAL_EMAIL"] = configured_delivery

    with pytest.raises(ValidationError, match="SEND_REAL_EMAIL must be enabled in production"):
        Settings(_env_file=None, **kwargs)


def test_production_accepts_real_email_configuration(monkeypatch) -> None:
    monkeypatch.delenv("SEND_REAL_EMAIL", raising=False)
    configured = Settings(
        _env_file=None,
        **_production_settings_kwargs(),
        SEND_REAL_EMAIL=True,
        EMAIL_HOST="smtp.example.test",
        EMAIL_PORT=587,
        EMAIL_USER="example-user",
        EMAIL_PASS="test-only-password",
        EMAIL_FROM="login@example.test",
    )
    assert configured.send_real_email is True


@pytest.mark.parametrize(
    "environment,real_email",
    [("development", False), ("production", True)],
)
def test_request_link_keeps_allowed_response_behavior(monkeypatch, environment: str, real_email: bool) -> None:
    monkeypatch.setattr(auth_api.settings, "environment", environment)
    monkeypatch.setattr(auth_api.settings, "send_real_email", real_email)
    sent = []

    async def capture_email(email: str, link: str) -> None:
        sent.append((email, link))

    monkeypatch.setattr(auth_api, "send_magic_link_email", capture_email)
    db = LinkSession()
    app = FastAPI()
    app.include_router(auth_api.router)
    app.dependency_overrides[get_db] = lambda: db

    with TestClient(app) as client:
        response = client.post("/auth/request-link", json={"email": "Person@Example.com"})

    assert response.status_code == 200
    assert response.json() == {"ok": True, "dev_link": None if real_email else sent[0][1]}
    assert len(sent) == 1
    assert sent[0][0] == "person@example.com"
    assert db.committed
    assert len(db.saved) == 1
    assert isinstance(db.saved[0], MagicLinkToken)
    token = parse_qs(urlparse(sent[0][1]).query)["token"][0]
    assert db.saved[0].token_hash == hash_token(token)
