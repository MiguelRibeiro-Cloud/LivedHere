import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any, Mapping

from jose import JWTError, jwt

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


_PLACE_FIELDS = ("country_code", "city_name", "area_name", "street_name", "lat", "lng")


def create_place_selection_token(place: Mapping[str, Any]) -> str:
    claims = {field: place[field] for field in _PLACE_FIELDS}
    claims.update(purpose="place_resolve", exp=utcnow() + timedelta(hours=24))
    return jwt.encode(claims, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def place_selection_matches(token: str, place: Mapping[str, Any]) -> bool:
    try:
        claims = decode_jwt(token)
    except JWTError:
        return False
    return claims.get("purpose") == "place_resolve" and all(
        field in claims and claims[field] == place.get(field) for field in _PLACE_FIELDS
    )
