import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    JSON,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import AuthorBadge, AuthorType, EditorType, ReportReason, ReviewStatus, UserRole


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.USER)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))


class MagicLinkToken(Base):
    __tablename__ = "magic_link_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class Country(Base):
    __tablename__ = "countries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(2), unique=True, index=True)
    name_en: Mapped[str] = mapped_column(String(120))
    name_pt: Mapped[str] = mapped_column(String(120))


class City(Base):
    __tablename__ = "cities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    country_id: Mapped[int] = mapped_column(ForeignKey("countries.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    normalized_name: Mapped[str] = mapped_column(String(120), index=True)


class Area(Base):
    __tablename__ = "areas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    normalized_name: Mapped[str] = mapped_column(String(120), index=True)


class Street(Base):
    __tablename__ = "streets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    area_id: Mapped[int] = mapped_column(ForeignKey("areas.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    normalized_name: Mapped[str] = mapped_column(String(160), index=True)


class StreetSegment(Base):
    __tablename__ = "street_segments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    street_id: Mapped[int] = mapped_column(ForeignKey("streets.id", ondelete="CASCADE"), index=True)
    start_number: Mapped[int] = mapped_column(Integer)
    end_number: Mapped[int] = mapped_column(Integer)


class Building(Base):
    __tablename__ = "buildings"
    __table_args__ = (Index("ix_building_street_number", "street_id", "street_number"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    street_id: Mapped[int] = mapped_column(ForeignKey("streets.id", ondelete="CASCADE"), index=True)
    segment_id: Mapped[int | None] = mapped_column(ForeignKey("street_segments.id", ondelete="SET NULL"), nullable=True)
    street_number: Mapped[int] = mapped_column(Integer)
    building_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    lat: Mapped[float] = mapped_column(Numeric(10, 7))
    lng: Mapped[float] = mapped_column(Numeric(10, 7))


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        UniqueConstraint("tracking_code", name="uq_review_tracking_code"),
        Index("ix_review_status_building", "status", "building_id"),
        Index("ix_review_created_at", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    building_id: Mapped[int] = mapped_column(ForeignKey("buildings.id", ondelete="CASCADE"), index=True)
    author_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    author_type: Mapped[AuthorType] = mapped_column(Enum(AuthorType), default=AuthorType.ANONYMOUS)
    author_badge: Mapped[AuthorBadge] = mapped_column(Enum(AuthorBadge), default=AuthorBadge.NONE)
    status: Mapped[ReviewStatus] = mapped_column(Enum(ReviewStatus), default=ReviewStatus.PENDING)
    tracking_code: Mapped[str] = mapped_column(String(24), unique=True, index=True)
    edit_token_hash: Mapped[str] = mapped_column(String(64), index=True)
    edit_token_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    language_tag: Mapped[str] = mapped_column(String(8))
    lived_from_year: Mapped[int] = mapped_column(Integer)
    lived_to_year: Mapped[int] = mapped_column(Integer)
    lived_duration_months: Mapped[int] = mapped_column(Integer)

    people_noise: Mapped[int] = mapped_column(Integer)
    animal_noise: Mapped[int] = mapped_column(Integer)
    insulation: Mapped[int] = mapped_column(Integer)
    pest_issues: Mapped[int] = mapped_column(Integer)
    area_safety: Mapped[int] = mapped_column(Integer)
    neighbourhood_vibe: Mapped[int] = mapped_column(Integer)
    outdoor_spaces: Mapped[int] = mapped_column(Integer)
    parking: Mapped[int] = mapped_column(Integer)
    building_maintenance: Mapped[int] = mapped_column(Integer)
    construction_quality: Mapped[int] = mapped_column(Integer)

    overall_score: Mapped[float] = mapped_column(Numeric(4, 2))
    overall_score_rounded: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str] = mapped_column(Text)

    pii_flagged: Mapped[bool] = mapped_column(default=False)
    pii_reasons: Mapped[dict] = mapped_column(JSON, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    moderation_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    moderated_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    building = relationship("Building")


class ReviewEditHistory(Base):
    __tablename__ = "review_edit_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    review_id: Mapped[int] = mapped_column(ForeignKey("reviews.id", ondelete="CASCADE"), index=True)
    before_json: Mapped[dict] = mapped_column(JSON)
    after_json: Mapped[dict] = mapped_column(JSON)
    editor_type: Mapped[EditorType] = mapped_column(Enum(EditorType))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    review_id: Mapped[int] = mapped_column(ForeignKey("reviews.id", ondelete="CASCADE"), index=True)
    reporter_type: Mapped[str] = mapped_column(String(16))
    reporter_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reason: Mapped[ReportReason] = mapped_column(Enum(ReportReason))
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


class RateLimitEvent(Base):
    __tablename__ = "rate_limit_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ip: Mapped[str] = mapped_column(String(64), index=True)
    fingerprint: Mapped[str] = mapped_column(String(64), index=True)
    building_id: Mapped[int] = mapped_column(Integer, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True)
    type: Mapped[str] = mapped_column(String(40), index=True)
