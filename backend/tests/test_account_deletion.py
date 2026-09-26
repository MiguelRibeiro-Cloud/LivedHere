import os
import importlib.util
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import Session as OrmSession

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://example:example@localhost/example")

from app.api.user import delete_me
from app.core.database import Base
from app.models.entities import (
    Area,
    Building,
    City,
    Country,
    MagicLinkToken,
    Review,
    Session as LoginSession,
    Street,
    User,
)
from app.models.enums import AuthorBadge, AuthorType, ReviewStatus, UserRole


class AsyncSessionAdapter:
    def __init__(self, session: OrmSession):
        self.session = session

    async def execute(self, statement):
        return self.session.execute(statement)

    async def delete(self, item):
        self.session.delete(item)

    async def commit(self):
        self.session.commit()


def _review_for(user: User, building: Building) -> Review:
    return Review(
        building_id=building.id,
        author_user_id=user.id,
        author_type=AuthorType.USER,
        author_badge=AuthorBadge.VERIFIED_ACCOUNT,
        status=ReviewStatus.APPROVED,
        tracking_code="EXAMPLE42",
        edit_token_hash="x" * 64,
        edit_token_expires_at=datetime.now(UTC) + timedelta(days=30),
        language_tag="en",
        lived_from_year=2020,
        lived_to_year=2022,
        lived_duration_months=24,
        people_noise=3,
        animal_noise=3,
        insulation=3,
        pest_issues=3,
        area_safety=3,
        neighbourhood_vibe=3,
        outdoor_spaces=3,
        parking=3,
        building_maintenance=3,
        construction_quality=3,
        overall_score=3,
        overall_score_rounded=3,
        comment="Example review content remains after account deletion.",
    )


@pytest.mark.asyncio
async def test_delete_account_erases_email_login_records_and_sessions_but_keeps_review() -> None:
    engine = create_engine("sqlite:///:memory:")

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, _record):
        connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    with OrmSession(engine) as session:
        user = User(email="person@example.test", role=UserRole.USER)
        other = User(email="other@example.test", role=UserRole.USER)
        session.add_all([user, other])
        session.flush()

        country = Country(code="PT", name_en="Portugal", name_pt="Portugal")
        session.add(country)
        session.flush()
        city = City(country_id=country.id, name="Lisboa", normalized_name="lisboa")
        session.add(city)
        session.flush()
        area = Area(city_id=city.id, name="Centro", normalized_name="centro")
        session.add(area)
        session.flush()
        street = Street(area_id=area.id, name="Example Street", normalized_name="example street")
        session.add(street)
        session.flush()
        building = Building(street_id=street.id, street_number=10, lat=38.7, lng=-9.1)
        session.add(building)
        session.flush()

        review = _review_for(user, building)
        expires_at = datetime.now(UTC) + timedelta(days=1)
        session.add_all(
            [
                review,
                LoginSession(user_id=user.id, token_hash="a" * 64, expires_at=expires_at),
                LoginSession(user_id=user.id, token_hash="b" * 64, expires_at=expires_at),
                LoginSession(user_id=other.id, token_hash="c" * 64, expires_at=expires_at),
                MagicLinkToken(email=user.email, token_hash="d" * 64, expires_at=expires_at),
                MagicLinkToken(email=user.email, token_hash="e" * 64, expires_at=expires_at),
                MagicLinkToken(email=other.email, token_hash="f" * 64, expires_at=expires_at),
            ]
        )
        session.commit()
        user_id, other_id, review_id = user.id, other.id, review.id

        assert await delete_me(AsyncSessionAdapter(session), user) == {"ok": True}

        assert session.get(User, user_id) is None
        assert session.get(User, other_id) is not None
        assert session.scalars(select(LoginSession).where(LoginSession.user_id == user_id)).all() == []
        assert len(session.scalars(select(LoginSession).where(LoginSession.user_id == other_id)).all()) == 1
        assert session.scalars(select(MagicLinkToken).where(MagicLinkToken.email == "person@example.test")).all() == []
        assert len(session.scalars(select(MagicLinkToken).where(MagicLinkToken.email == "other@example.test")).all()) == 1
        preserved_review = session.get(Review, review_id)
        assert preserved_review is not None
        assert preserved_review.author_user_id is None
        assert preserved_review.comment == "Example review content remains after account deletion."

    engine.dispose()


def test_migration_removes_previously_soft_deleted_accounts(monkeypatch) -> None:
    engine = create_engine("sqlite:///:memory:")

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, _record):
        connection.execute("PRAGMA foreign_keys=ON")

    User.__table__.create(engine)
    MagicLinkToken.__table__.create(engine)
    LoginSession.__table__.create(engine)
    with OrmSession(engine) as session:
        deleted = User(email="deleted@example.test", role=UserRole.USER, deleted_at=datetime.now(UTC))
        active = User(email="active@example.test", role=UserRole.USER)
        session.add_all([deleted, active])
        session.flush()
        deleted_id, active_id = deleted.id, active.id
        expires_at = datetime.now(UTC) + timedelta(days=1)
        session.add_all(
            [
                LoginSession(user_id=deleted_id, token_hash="a" * 64, expires_at=expires_at),
                LoginSession(user_id=active_id, token_hash="b" * 64, expires_at=expires_at),
                MagicLinkToken(email=deleted.email, token_hash="c" * 64, expires_at=expires_at),
                MagicLinkToken(email=active.email, token_hash="d" * 64, expires_at=expires_at),
            ]
        )
        session.commit()

        migration_path = Path(__file__).resolve().parents[1] / "alembic/versions/202609260001_remove_deleted_accounts.py"
        spec = importlib.util.spec_from_file_location("account_cleanup_migration", migration_path)
        assert spec is not None and spec.loader is not None
        migration = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(migration)
        with engine.begin() as connection:
            monkeypatch.setattr(migration.op, "execute", connection.exec_driver_sql)
            migration.upgrade()

        session.expire_all()
        assert session.get(User, deleted_id) is None
        assert session.get(User, active_id) is not None
        assert session.scalars(select(LoginSession).where(LoginSession.user_id == deleted_id)).all() == []
        assert len(session.scalars(select(LoginSession).where(LoginSession.user_id == active_id)).all()) == 1
        assert session.scalars(select(MagicLinkToken).where(MagicLinkToken.email == "deleted@example.test")).all() == []
        assert len(session.scalars(select(MagicLinkToken).where(MagicLinkToken.email == "active@example.test")).all()) == 1

    engine.dispose()


@pytest.mark.asyncio
async def test_admin_account_cannot_self_delete() -> None:
    admin = User(email="admin@example.test", role=UserRole.ADMIN)

    with pytest.raises(HTTPException) as exc:
        await delete_me(None, admin)

    assert exc.value.status_code == 403
