from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import RateLimitEvent


class RateLimitExceeded(Exception):
    pass


async def evaluate_rate_limit(db: AsyncSession, ip: str, fingerprint: str, building_id: int) -> None:
    since = datetime.now(UTC) - timedelta(hours=24)

    ip_count = await db.scalar(select(func.count()).select_from(RateLimitEvent).where(RateLimitEvent.ip == ip, RateLimitEvent.created_at > since))
    if ip_count and ip_count >= 5:
        raise RateLimitExceeded("IP limit exceeded")

    building_count = await db.scalar(
        select(func.count()).select_from(RateLimitEvent).where(RateLimitEvent.building_id == building_id, RateLimitEvent.created_at > since)
    )
    if building_count and building_count >= 5:
        raise RateLimitExceeded("Building limit exceeded")

    fp_count = await db.scalar(
        select(func.count()).select_from(RateLimitEvent).where(RateLimitEvent.fingerprint == fingerprint, RateLimitEvent.created_at > since)
    )
    if fp_count and fp_count >= 3:
        raise RateLimitExceeded("Fingerprint limit exceeded")

    db.add(RateLimitEvent(ip=ip, fingerprint=fingerprint, building_id=building_id, type="review_submit"))
