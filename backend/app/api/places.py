from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.entities import Area, Building, City, Country, Street
from app.schemas.places import PlaceCreatePayload
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
        country = Country(code=payload.country_code.upper(), name_en="Portugal", name_pt="Portugal")
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
