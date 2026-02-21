from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.entities import Building

router = APIRouter(prefix="/map")


@router.get("/buildings")
async def map_buildings(db: AsyncSession = Depends(get_db)) -> list[dict]:
    rows = (await db.execute(select(Building))).scalars().all()
    return [{"id": b.id, "lat": float(b.lat), "lng": float(b.lng), "number": b.street_number} for b in rows]
