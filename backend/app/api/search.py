from fastapi import APIRouter, Depends, Query
from sqlalchemy import String, cast, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.entities import Area, Building, City, Review, Street
from app.models.enums import AuthorBadge, ReviewStatus

router = APIRouter()


@router.get("/search")
async def search(
    q: str = Query(default="", min_length=0),
    sort: str = Query(default="recency"),
    verified_only: bool = False,
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    stmt = (
        select(Building, Street, Area, City)
        .join(Street, Building.street_id == Street.id)
        .join(Area, Street.area_id == Area.id)
        .join(City, Area.city_id == City.id)
    )

    if q:
        term = f"%{q.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Street.name).like(term),
                func.lower(Area.name).like(term),
                func.lower(City.name).like(term),
                cast(Building.street_number, String).like(term),
            )
        )

    rows = (await db.execute(stmt)).all()
    results = []
    for building, street, area, city in rows:
        review_stmt = select(Review).where(Review.building_id == building.id, Review.status == ReviewStatus.APPROVED)
        if verified_only:
            review_stmt = review_stmt.where(Review.author_badge == AuthorBadge.VERIFIED_ACCOUNT)
        if sort == "recency":
            review_stmt = review_stmt.order_by(desc(Review.created_at))
        reviews = (await db.execute(review_stmt.limit(20))).scalars().all()
        if not reviews:
            continue

        avg = sum(float(r.overall_score) for r in reviews) / len(reviews)
        results.append(
            {
                "building_id": building.id,
                "street": street.name,
                "number": building.street_number,
                "area": area.name,
                "city": city.name,
                "lat": float(building.lat),
                "lng": float(building.lng),
                "review_count": len(reviews),
                "avg_score": round(avg, 2),
            }
        )

    return sorted(results, key=lambda item: item["review_count"], reverse=sort == "top")


@router.get("/buildings/{building_id}")
async def building_detail(building_id: int, db: AsyncSession = Depends(get_db)) -> dict:
    building = (await db.execute(select(Building).where(Building.id == building_id))).scalar_one_or_none()
    if not building:
        return {"error": "Not found"}
    reviews = (
        await db.execute(select(Review).where(Review.building_id == building_id, Review.status == ReviewStatus.APPROVED))
    ).scalars().all()
    return {
        "id": building.id,
        "street_number": building.street_number,
        "lat": float(building.lat),
        "lng": float(building.lng),
        "reviews": [
            {
                "id": r.id,
                "score": float(r.overall_score),
                "comment": r.comment,
                "verified": r.author_badge == AuthorBadge.VERIFIED_ACCOUNT,
                "created_at": r.created_at.isoformat(),
            }
            for r in reviews
        ],
    }
