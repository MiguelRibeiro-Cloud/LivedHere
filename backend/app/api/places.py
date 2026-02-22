from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.entities import Area, Building, City, Country, Street
from app.schemas.places import PlaceCreatePayload, PlaceResolvePayload
from app.services.text import normalize_name

router = APIRouter()


@router.get("/countries")
async def countries(db: AsyncSession = Depends(get_db)) -> list[dict]:
    rows = (await db.execute(select(Country))).scalars().all()
    return [{"id": c.id, "code": c.code, "name_en": c.name_en, "name_pt": c.name_pt} for c in rows]


@router.get("/cities")
async def cities(country_code: str | None = None, db: AsyncSession = Depends(get_db)) -> list[dict]:
    stmt = select(City)
    if country_code:
        stmt = stmt.join(Country, Country.id == City.country_id).where(Country.code == country_code.upper())
    rows = (await db.execute(stmt)).scalars().all()
    return [{"id": c.id, "name": c.name} for c in rows]


@router.get("/areas")
async def areas(city_id: int | None = None, db: AsyncSession = Depends(get_db)) -> list[dict]:
    stmt = select(Area)
    if city_id:
        stmt = stmt.where(Area.city_id == city_id)
    rows = (await db.execute(stmt)).scalars().all()
    return [{"id": a.id, "name": a.name} for a in rows]


@router.get("/streets")
async def streets(area_id: int | None = None, db: AsyncSession = Depends(get_db)) -> list[dict]:
    stmt = select(Street)
    if area_id:
        stmt = stmt.where(Street.area_id == area_id)
    rows = (await db.execute(stmt)).scalars().all()
    return [{"id": s.id, "name": s.name} for s in rows]


@router.post("/places/create")
async def create_place(payload: PlaceCreatePayload, db: AsyncSession = Depends(get_db)) -> dict:
    country = (await db.execute(select(Country).where(Country.code == payload.country_code.upper()))).scalar_one_or_none()
    if not country:
        code = payload.country_code.upper()
        country = Country(code=code, name_en=code, name_pt=code)
        db.add(country)
        await db.flush()

    city = (
        await db.execute(
            select(City).where(City.country_id == country.id, City.normalized_name == normalize_name(payload.city_name))
        )
    ).scalar_one_or_none()
    if not city:
        city = City(country_id=country.id, name=payload.city_name, normalized_name=normalize_name(payload.city_name))
        db.add(city)
        await db.flush()

    area = (
        await db.execute(select(Area).where(Area.city_id == city.id, Area.normalized_name == normalize_name(payload.area_name)))
    ).scalar_one_or_none()
    if not area:
        area = Area(city_id=city.id, name=payload.area_name, normalized_name=normalize_name(payload.area_name))
        db.add(area)
        await db.flush()

    street = (
        await db.execute(
            select(Street).where(Street.area_id == area.id, Street.normalized_name == normalize_name(payload.street_name))
        )
    ).scalar_one_or_none()
    if not street:
        street = Street(area_id=area.id, name=payload.street_name, normalized_name=normalize_name(payload.street_name))
        db.add(street)
        await db.flush()

    building = (
        await db.execute(
            select(Building).where(Building.street_id == street.id, Building.street_number == payload.street_number)
        )
    ).scalar_one_or_none()
    if not building:
        building = Building(
            street_id=street.id,
            segment_id=None,
            street_number=payload.street_number,
            building_name=payload.building_name,
            lat=payload.lat,
            lng=payload.lng,
        )
        db.add(building)
        await db.flush()

    await db.commit()
    return {"id": building.id}


@router.post("/places/resolve")
async def resolve_place(payload: PlaceResolvePayload, db: AsyncSession = Depends(get_db)) -> dict:
    """Resolve a street-level geocoded selection into an internal building id.

    If `street_number` is provided, creates/returns that exact building.
    Otherwise creates/returns a "segment building" representing a number range on the street.
    """

    street_number = payload.street_number
    range_start = payload.range_start
    range_end = payload.range_end

    if street_number is None:
        if range_start is None or range_end is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either street_number or (range_start, range_end) is required",
            )
        if range_end < range_start:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="range_end must be >= range_start")
        if (range_end - range_start) > 500:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="range is too large")
    else:
        if range_start is not None or range_end is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provide either street_number OR a range, not both",
            )

    country_code = payload.country_code.upper()
    country = (await db.execute(select(Country).where(Country.code == country_code))).scalar_one_or_none()
    if not country:
        country = Country(code=country_code, name_en=country_code, name_pt=country_code)
        db.add(country)
        await db.flush()

    city_norm = normalize_name(payload.city_name)
    city = (await db.execute(select(City).where(City.country_id == country.id, City.normalized_name == city_norm))).scalar_one_or_none()
    if not city:
        city = City(country_id=country.id, name=payload.city_name, normalized_name=city_norm)
        db.add(city)
        await db.flush()

    area_name = (payload.area_name or payload.city_name).strip()
    area_norm = normalize_name(area_name)
    area = (await db.execute(select(Area).where(Area.city_id == city.id, Area.normalized_name == area_norm))).scalar_one_or_none()
    if not area:
        area = Area(city_id=city.id, name=area_name, normalized_name=area_norm)
        db.add(area)
        await db.flush()

    street_norm = normalize_name(payload.street_name)
    street = (await db.execute(select(Street).where(Street.area_id == area.id, Street.normalized_name == street_norm))).scalar_one_or_none()
    if not street:
        street = Street(area_id=area.id, name=payload.street_name, normalized_name=street_norm)
        db.add(street)
        await db.flush()

    if street_number is not None:
        building = (
            await db.execute(select(Building).where(Building.street_id == street.id, Building.street_number == street_number, Building.segment_id.is_(None)))
        ).scalar_one_or_none()
        if not building:
            building = Building(
                street_id=street.id,
                segment_id=None,
                street_number=street_number,
                building_name=payload.building_name,
                lat=payload.lat,
                lng=payload.lng,
            )
            db.add(building)
            await db.flush()
        await db.commit()
        return {"building_id": building.id}

    # Range-based "segment building".
    from app.models.entities import StreetSegment

    segment = (
        await db.execute(
            select(StreetSegment).where(
                StreetSegment.street_id == street.id,
                StreetSegment.start_number == range_start,
                StreetSegment.end_number == range_end,
            )
        )
    ).scalar_one_or_none()
    if not segment:
        segment = StreetSegment(street_id=street.id, start_number=range_start, end_number=range_end)
        db.add(segment)
        await db.flush()

    segment_building = (
        await db.execute(
            select(Building).where(
                Building.street_id == street.id,
                Building.segment_id == segment.id,
                Building.street_number == range_start,
            )
        )
    ).scalar_one_or_none()
    if not segment_building:
        segment_building = Building(
            street_id=street.id,
            segment_id=segment.id,
            street_number=range_start,
            building_name=payload.building_name,
            lat=payload.lat,
            lng=payload.lng,
        )
        db.add(segment_building)
        await db.flush()

    await db.commit()
    return {"building_id": segment_building.id}
