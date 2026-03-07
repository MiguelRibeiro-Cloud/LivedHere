import asyncio

from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.entities import Area, Building, City, Country, Street, User
from app.models.enums import UserRole
from app.services.text import normalize_name


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        country = (await db.execute(select(Country).where(Country.code == "PT"))).scalar_one_or_none()
        if not country:
            country = Country(code="PT", name_en="Portugal", name_pt="Portugal")
            db.add(country)
            await db.flush()

        for city_name in ["Lisboa", "Porto"]:
            city = (
                await db.execute(
                    select(City).where(City.country_id == country.id, City.normalized_name == normalize_name(city_name))
                )
            ).scalar_one_or_none()
            if not city:
                city = City(country_id=country.id, name=city_name, normalized_name=normalize_name(city_name))
                db.add(city)
                await db.flush()

                area_name = "Avenidas Novas" if city_name == "Lisboa" else "Cedofeita"
                street_name = "Avenida da República" if city_name == "Lisboa" else "Rua de Cedofeita"

                area = Area(city_id=city.id, name=area_name, normalized_name=normalize_name(area_name))
                db.add(area)
                await db.flush()

                street = Street(area_id=area.id, name=street_name, normalized_name=normalize_name(street_name))
                db.add(street)
                await db.flush()

                building = Building(
                    street_id=street.id,
                    segment_id=None,
                    street_number=100 if city_name == "Lisboa" else 250,
                    building_name=f"LivedHere {city_name} Demo",
                    lat=38.736946 if city_name == "Lisboa" else 41.157944,
                    lng=-9.142685 if city_name == "Lisboa" else -8.629105,
                )
                db.add(building)

        admin_emails = settings.admin_emails

        current_admins = (await db.execute(select(User).where(User.role == UserRole.ADMIN))).scalars().all()
        for admin_user in current_admins:
            if admin_user.email.strip().lower() not in admin_emails:
                admin_user.role = UserRole.USER

        for admin_email in admin_emails:
            admin = (await db.execute(select(User).where(User.email == admin_email))).scalar_one_or_none()
            if not admin:
                db.add(User(email=admin_email, role=UserRole.ADMIN))
            elif admin.role != UserRole.ADMIN:
                admin.role = UserRole.ADMIN

        await db.commit()


if __name__ == "__main__":
    asyncio.run(seed())
