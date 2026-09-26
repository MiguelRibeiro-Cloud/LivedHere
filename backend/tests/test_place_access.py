import os
from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from jose import jwt
from pydantic import ValidationError

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://example:example@localhost/example")

from app.api.geocode import router as geocode_router
from app.api.places import router as places_router
from app.auth.dependencies import get_current_user
from app.core.database import get_db
from app.core.config import Settings, settings
from app.core.security import create_place_selection_token, decode_jwt, place_selection_matches
from app.models.entities import Building, User
from app.models.enums import UserRole


class FakeSession:
    def __init__(self):
        self.added = []
        self.next_id = 1
        self.committed = False

    async def execute(self, _statement, _params=None):
        return SimpleNamespace(scalar_one_or_none=lambda: None)

    def add(self, item):
        self.added.append(item)

    async def flush(self):
        for item in self.added:
            if getattr(item, "id", None) is None:
                item.id = self.next_id
                self.next_id += 1

    async def commit(self):
        self.committed = True


def _client(db: FakeSession, current_user: User | None = None) -> TestClient:
    app = FastAPI()
    app.include_router(places_router)
    app.include_router(geocode_router)
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: current_user
    return TestClient(app)


def _place_fields() -> dict:
    return {
        "country_code": "PT",
        "city_name": "Lisboa",
        "area_name": "Avenidas Novas",
        "street_name": "Avenida da República",
        "lat": 38.736946,
        "lng": -9.142685,
    }


def _resolve_payload() -> dict:
    fields = _place_fields()
    return {**fields, "street_number": 100, "selection_token": create_place_selection_token(fields)}


def _create_payload() -> dict:
    return {**_place_fields(), "street_number": 100}


@pytest.mark.parametrize("role,expected_status", [(None, 401), (UserRole.USER, 403)])
def test_manual_place_creation_requires_admin(role: UserRole | None, expected_status: int) -> None:
    db = FakeSession()
    user = User(id=uuid4(), role=role) if role else None

    with _client(db, user) as client:
        response = client.post("/places/create", json=_create_payload())

    assert response.status_code == expected_status
    assert db.added == []


def test_admin_can_create_place() -> None:
    db = FakeSession()
    admin = User(id=uuid4(), role=UserRole.ADMIN)

    with _client(db, admin) as client:
        response = client.post("/places/create", json=_create_payload())

    assert response.status_code == 200
    assert isinstance(response.json()["id"], int)
    assert any(isinstance(item, Building) for item in db.added)
    assert db.committed


def test_anonymous_resolve_rejects_unverified_place() -> None:
    db = FakeSession()
    payload = _resolve_payload()
    header, claims, signature = payload["selection_token"].split(".")
    changed_first_char = "A" if signature[0] != "A" else "B"
    payload["selection_token"] = f"{header}.{claims}.{changed_first_char}{signature[1:]}"

    with _client(db) as client:
        response = client.post("/places/resolve", json=payload)

    assert response.status_code == 403
    assert db.added == []


def test_anonymous_resolve_requires_selection_token() -> None:
    db = FakeSession()
    payload = _resolve_payload()
    del payload["selection_token"]

    with _client(db) as client:
        response = client.post("/places/resolve", json=payload)

    assert response.status_code == 422
    assert db.added == []


def test_resolve_rejects_expired_selection_token() -> None:
    db = FakeSession()
    payload = _resolve_payload()
    claims = decode_jwt(payload["selection_token"])
    claims["exp"] = 1
    payload["selection_token"] = jwt.encode(claims, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    with _client(db) as client:
        response = client.post("/places/resolve", json=payload)

    assert response.status_code == 403
    assert db.added == []


@pytest.mark.parametrize(
    "changed_field,new_value",
    [
        ("country_code", "ES"),
        ("city_name", "Porto"),
        ("area_name", "Alfama"),
        ("street_name", "Invented Street"),
        ("lat", 0.0),
        ("lng", 0.0),
    ],
)
def test_resolve_rejects_tampered_geocoded_fields(changed_field: str, new_value) -> None:
    db = FakeSession()
    payload = _resolve_payload()
    payload[changed_field] = new_value

    with _client(db) as client:
        response = client.post("/places/resolve", json=payload)

    assert response.status_code == 403
    assert db.added == []


def test_anonymous_resolve_creates_place_from_verified_selection() -> None:
    db = FakeSession()

    with _client(db) as client:
        response = client.post("/places/resolve", json=_resolve_payload())

    assert response.status_code == 200
    assert isinstance(response.json()["building_id"], int)
    assert any(isinstance(item, Building) for item in db.added)
    assert db.committed


def test_signed_in_user_can_resolve_verified_place() -> None:
    db = FakeSession()
    user = User(id=uuid4(), role=UserRole.USER)

    with _client(db, user) as client:
        response = client.post("/places/resolve", json=_resolve_payload())

    assert response.status_code == 200
    assert db.committed


@pytest.mark.parametrize(
    "configured_secret",
    [None, "", "replace_me_with_a_long_secret", "replace_with_at_least_32_characters_long_secret"],
    ids=["missing", "empty", "default", "example"],
)
def test_production_rejects_missing_or_example_jwt_secret(monkeypatch, configured_secret: str | None) -> None:
    monkeypatch.delenv("JWT_SECRET", raising=False)
    kwargs = {"DATABASE_URL": "postgresql+asyncpg://example:example@localhost/example", "ENVIRONMENT": "production"}
    if configured_secret is not None:
        kwargs["JWT_SECRET"] = configured_secret

    with pytest.raises(ValidationError, match="JWT_SECRET must be configured"):
        Settings(_env_file=None, **kwargs)


def test_production_accepts_configured_jwt_secret(monkeypatch) -> None:
    monkeypatch.delenv("JWT_SECRET", raising=False)
    configured = Settings(
        _env_file=None,
        DATABASE_URL="postgresql+asyncpg://example:example@localhost/example",
        ENVIRONMENT="production",
        JWT_SECRET="example_for_this_test_only_32_characters",
    )
    assert configured.environment == "production"


def test_development_allows_default_jwt_secret(monkeypatch) -> None:
    monkeypatch.delenv("JWT_SECRET", raising=False)
    configured = Settings(
        _env_file=None,
        DATABASE_URL="postgresql+asyncpg://example:example@localhost/example",
        ENVIRONMENT="development",
    )
    assert configured.jwt_secret


def test_search_geocode_result_has_selection_token(monkeypatch) -> None:
    item = {
        "address": {"country_code": "pt", "city": "Lisboa", "suburb": "Avenidas Novas", "road": "Avenida da República"},
        "lat": "38.736946",
        "lon": "-9.142685",
        "display_name": "Avenida da República, Lisboa",
    }

    class FakeGeocoder:
        def __init__(self, **_kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            pass

        async def get(self, url, **_kwargs):
            return httpx.Response(200, json=[item], request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx, "AsyncClient", FakeGeocoder)

    with _client(FakeSession()) as client:
        response = client.get("/geocode", params={"q": "Avenida da República"})

    assert response.status_code == 200
    selection = response.json()[0]
    assert place_selection_matches(selection["selection_token"], selection)


def test_reverse_geocode_token_accepts_map_click_coordinates(monkeypatch) -> None:
    item = {
        "address": {"country_code": "pt", "city": "Lisboa", "suburb": "Avenidas Novas", "road": "Avenida da República"},
        "lat": "38.736946",
        "lon": "-9.142685",
        "display_name": "Avenida da República, Lisboa",
    }

    class FakeGeocoder:
        def __init__(self, **_kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            pass

        async def get(self, url, **_kwargs):
            return httpx.Response(200, json=item, request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx, "AsyncClient", FakeGeocoder)
    db = FakeSession()

    with _client(db) as client:
        reverse = client.get("/geocode/reverse", params={"lat": 38.737, "lng": -9.143})
        assert reverse.status_code == 200
        selection = reverse.json()
        payload = {
            **{key: selection[key] for key in _place_fields()},
            "lat": 38.737,
            "lng": -9.143,
            "range_start": 10,
            "range_end": 30,
            "selection_token": selection["selection_token"],
        }
        resolved = client.post("/places/resolve", json=payload)

    assert resolved.status_code == 200
    assert isinstance(resolved.json()["building_id"], int)
