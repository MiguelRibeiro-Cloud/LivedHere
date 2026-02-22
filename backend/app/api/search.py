import re

from fastapi import APIRouter, Depends, Query
from sqlalchemy import String, cast, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.entities import Area, Building, City, Review, Street, StreetSegment
from app.models.enums import AuthorBadge, ReviewStatus
from app.services.text import normalize_name

router = APIRouter()


@router.get("/search")
async def search(
    q: str = Query(default="", min_length=0),
    sort: str = Query(default="recency"),
    verified_only: bool = False,
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    review_agg = (
        select(
            Review.building_id.label("building_id"),
            func.count(Review.id).label("review_count"),
            func.avg(Review.overall_score).label("avg_score"),
            func.max(Review.created_at).label("last_review_at"),
        )
        .where(Review.status == ReviewStatus.APPROVED)
    )
    if verified_only:
        review_agg = review_agg.where(Review.author_badge == AuthorBadge.VERIFIED_ACCOUNT)
    review_agg_sq = review_agg.group_by(Review.building_id).subquery()

    stmt = (
        select(
            Building,
            Street,
            Area,
            City,
            StreetSegment.start_number,
            StreetSegment.end_number,
            review_agg_sq.c.review_count,
            review_agg_sq.c.avg_score,
            review_agg_sq.c.last_review_at,
        )
        .join(Street, Building.street_id == Street.id)
        .join(Area, Street.area_id == Area.id)
        .join(City, Area.city_id == City.id)
        .outerjoin(StreetSegment, Building.segment_id == StreetSegment.id)
        .outerjoin(review_agg_sq, review_agg_sq.c.building_id == Building.id)
    )

    if q:
        q_norm = normalize_name(q)
        tokens = [t for t in q_norm.split() if len(t) >= 2 and not t.isdigit()]
        numbers = [int(n) for n in re.findall(r"\d+", q_norm)[:3]]
        term = f"%{q_norm}%"

        matchers = [
            func.lower(Street.name).like(f"%{q.lower()}%"),
            func.lower(Area.name).like(f"%{q.lower()}%"),
            func.lower(City.name).like(f"%{q.lower()}%"),
            cast(Building.street_number, String).like(f"%{q_norm}%"),
            Street.normalized_name.like(term),
            Area.normalized_name.like(term),
            City.normalized_name.like(term),
        ]

        # If the user includes a street number (e.g. "... 100"), match it directly.
        for n in numbers:
            matchers.append(Building.street_number == n)

        # Loose matching: any token can match any normalized field.
        for tok in tokens:
            like_tok = f"%{tok}%"
            matchers.append(Street.normalized_name.like(like_tok))
            matchers.append(Area.normalized_name.like(like_tok))
            matchers.append(City.normalized_name.like(like_tok))

            # Conservative typo tolerance: for longer tokens, also match by prefix.
            # Example: "republca" still matches streets containing "repub".
            if len(tok) >= 5:
                prefix = tok[:4]
                like_prefix = f"%{prefix}%"
                matchers.append(Street.normalized_name.like(like_prefix))
                matchers.append(Area.normalized_name.like(like_prefix))
                matchers.append(City.normalized_name.like(like_prefix))

        stmt = stmt.where(or_(*matchers))

    # When verified_only is enabled, keep previous behavior: only show addresses with verified reviews.
    if verified_only:
        stmt = stmt.where(func.coalesce(review_agg_sq.c.review_count, 0) > 0)

    if sort == "top":
        stmt = stmt.order_by(desc(func.coalesce(review_agg_sq.c.review_count, 0)))
    else:
        # default "recency"
        stmt = stmt.order_by(desc(review_agg_sq.c.last_review_at).nullslast(), desc(func.coalesce(review_agg_sq.c.review_count, 0)))

    rows = (await db.execute(stmt.limit(100))).all()
    results: list[dict] = []
    for building, street, area, city, seg_start, seg_end, review_count, avg_score, _last_review_at in rows:
        count = int(review_count or 0)
        results.append(
            {
                "building_id": building.id,
                "street": street.name,
                "number": building.street_number,
                "range_start": int(seg_start) if seg_start is not None else None,
                "range_end": int(seg_end) if seg_end is not None else None,
                "area": area.name,
                "city": city.name,
                "lat": float(building.lat),
                "lng": float(building.lng),
                "review_count": count,
                "avg_score": round(float(avg_score), 2) if avg_score is not None else None,
            }
        )

    return results


@router.get("/buildings/{building_id}")
async def building_detail(building_id: int, db: AsyncSession = Depends(get_db)) -> dict:
    row = (
        await db.execute(
            select(Building, Street, Area, City, StreetSegment.start_number, StreetSegment.end_number)
            .join(Street, Building.street_id == Street.id)
            .join(Area, Street.area_id == Area.id)
            .join(City, Area.city_id == City.id)
            .outerjoin(StreetSegment, Building.segment_id == StreetSegment.id)
            .where(Building.id == building_id)
        )
    ).one_or_none()
    building: Building | None = row[0] if row else None
    if not building:
        return {"error": "Not found"}

    _building, street, area, city, seg_start, seg_end = row
    reviews = (
        await db.execute(select(Review).where(Review.building_id == building_id, Review.status == ReviewStatus.APPROVED))
    ).scalars().all()
    return {
        "id": building.id,
        "street": street.name,
        "area": area.name,
        "city": city.name,
        "range_start": int(seg_start) if seg_start is not None else None,
        "range_end": int(seg_end) if seg_end is not None else None,
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
