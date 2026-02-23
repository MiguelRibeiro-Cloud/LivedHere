from datetime import UTC, datetime, timedelta
import os

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import RateLimitEvent


class RateLimitExceeded(Exception):
    pass


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        value = int(raw)
    except ValueError:
        return default
    return value


async def evaluate_rate_limit(db: AsyncSession, ip: str, fingerprint: str, building_id: int) -> None:
    env = (os.getenv("ENVIRONMENT") or "development").strip().lower()
    is_dev = env in {"dev", "development", "local"}

    window_hours = _env_int("RATE_LIMIT_WINDOW_HOURS", 24)
    if window_hours <= 0:
        window_hours = 24

    # Defaults: strict in production, relaxed in development to avoid blocking local testing.
    ip_max = _env_int("RATE_LIMIT_IP_MAX", 200 if is_dev else 5)
    building_max = _env_int("RATE_LIMIT_BUILDING_MAX", 200 if is_dev else 5)
    fp_max = _env_int("RATE_LIMIT_FP_MAX", 200 if is_dev else 3)

    since = datetime.now(UTC) - timedelta(hours=window_hours)

    ip_count = await db.scalar(select(func.count()).select_from(RateLimitEvent).where(RateLimitEvent.ip == ip, RateLimitEvent.created_at > since))
    if ip_count and ip_count >= ip_max:
        raise RateLimitExceeded("IP limit exceeded")

    building_count = await db.scalar(
        select(func.count()).select_from(RateLimitEvent).where(RateLimitEvent.building_id == building_id, RateLimitEvent.created_at > since)
    )
    if building_count and building_count >= building_max:
        raise RateLimitExceeded("Building limit exceeded")

    fp_count = await db.scalar(
        select(func.count()).select_from(RateLimitEvent).where(RateLimitEvent.fingerprint == fingerprint, RateLimitEvent.created_at > since)
    )
    if fp_count and fp_count >= fp_max:
        raise RateLimitExceeded("Fingerprint limit exceeded")

    db.add(RateLimitEvent(ip=ip, fingerprint=fingerprint, building_id=building_id, type="review_submit"))
