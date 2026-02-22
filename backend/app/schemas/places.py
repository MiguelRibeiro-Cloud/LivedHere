from pydantic import BaseModel, Field


class PlaceCreatePayload(BaseModel):
    country_code: str = Field(min_length=2, max_length=2)
    city_name: str = Field(min_length=2, max_length=120)
    area_name: str = Field(min_length=2, max_length=120)
    street_name: str = Field(min_length=2, max_length=160)
    street_number: int = Field(ge=1, le=99999)
    building_name: str | None = Field(default=None, max_length=160)
    lat: float
    lng: float


class BuildingResponse(BaseModel):
    id: int
    street_name: str
    street_number: int
    area_name: str
    city_name: str
    country_code: str
    lat: float
    lng: float


class PlaceResolvePayload(BaseModel):
    country_code: str = Field(min_length=2, max_length=2)
    city_name: str = Field(min_length=2, max_length=120)
    area_name: str | None = Field(default=None, max_length=120)
    street_name: str = Field(min_length=2, max_length=160)

    # Either an exact number OR a range is required.
    street_number: int | None = Field(default=None, ge=1, le=99999)
    range_start: int | None = Field(default=None, ge=1, le=99999)
    range_end: int | None = Field(default=None, ge=1, le=99999)

    building_name: str | None = Field(default=None, max_length=160)
    lat: float
    lng: float
