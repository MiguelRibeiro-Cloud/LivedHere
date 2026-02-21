import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from jose import jwt

from app.core.config import settings


def utcnow() -> datetime:
    return datetime.now(UTC)


def random_token(size: int = 32) -> str:
    return secrets.token_urlsafe(size)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_jwt(subject: str) -> str:
    expires = utcnow() + timedelta(minutes=settings.session_ttl_minutes)
    payload = {"sub": subject, "exp": expires}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_jwt(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
