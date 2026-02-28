from __future__ import annotations

from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Query, status

from app.core.config import settings

router = APIRouter(prefix="/geocode")

_HEADERS = {
    "User-Agent": "",  # filled lazily
    "Accept": "application/json",
}


def _user_agent() -> str:
    return f"{settings.app_name} (geocoding)"


def _pick_address_component(address: dict[str, Any], keys: list[str]) -> str | None:
    for key in keys:
        value = address.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _parse_nominatim_item(item: dict[str, Any]) -> dict | None:
    """Parse a single Nominatim result into our canonical format."""
    if not isinstance(item, dict):
        return None

    address = item.get("address")
    if not isinstance(address, dict):
        return None

    street_name = _pick_address_component(
        address, ["road", "pedestrian", "residential", "footway", "path"]
    )
    if not street_name:
        return None

    country_code = _pick_address_component(address, ["country_code"])
    if not country_code or len(country_code) != 2:
        return None

    city_name = _pick_address_component(
        address, ["city", "town", "village", "municipality", "county"]
    )
    if not city_name:
        return None

    area_name = (
        _pick_address_component(
            address,
            ["suburb", "neighbourhood", "city_district", "district", "quarter"],
        )
        or city_name
    )

    lat_raw = item.get("lat")
    lon_raw = item.get("lon")
    try:
        lat = float(lat_raw)
        lng = float(lon_raw)
    except (TypeError, ValueError):
        return None

    label = item.get("display_name")
    if not isinstance(label, str) or not label.strip():
        label = f"{street_name} · {area_name}, {city_name}"

    house_number = _pick_address_component(address, ["house_number"])

    return {
        "label": label,
        "country_code": country_code.upper(),
        "city_name": city_name,
        "area_name": area_name,
        "street_name": street_name,
        "house_number": house_number,
        "lat": lat,
        "lng": lng,
    }


@router.get("")
async def geocode(q: str = Query(min_length=2, max_length=200)) -> list[dict]:
    """Global free-text geocoding using OSM Nominatim.

    Returns street-level candidates that the user can pick to create a review target.
    """

    params = {
        "q": q,
        "format": "jsonv2",
        "addressdetails": 1,
        "limit": 8,
        "dedupe": 1,
    }

    headers = {"User-Agent": _user_agent(), "Accept": "application/json"}

    async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
        try:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params=params,
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()
        except httpx.TimeoutException as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Geocoding timed out",
            ) from exc
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Geocoding is unavailable",
            ) from exc

    results: list[dict] = []
    if not isinstance(data, list):
        return results

    for item in data:
        parsed = _parse_nominatim_item(item)
        if parsed:
            results.append(parsed)

    return results


@router.get("/reverse")
async def reverse_geocode(
    lat: float = Query(ge=-90, le=90),
    lng: float = Query(ge=-180, le=180),
) -> dict | None:
    """Reverse-geocode a lat/lng pair to the nearest street-level address.

    Uses OSM Nominatim ``/reverse``.  Returns ``null`` (HTTP 200 with
    ``null`` body) when no usable address is found.
    """
    params = {
        "lat": lat,
        "lon": lng,
        "format": "jsonv2",
        "addressdetails": 1,
        "zoom": 18,  # street-level
    }

    headers = {"User-Agent": _user_agent(), "Accept": "application/json"}

    async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
        try:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params=params,
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()
        except httpx.TimeoutException as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Reverse geocoding timed out",
            ) from exc
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Reverse geocoding is unavailable",
            ) from exc

    if not isinstance(data, dict):
        return None

    return _parse_nominatim_item(data)
