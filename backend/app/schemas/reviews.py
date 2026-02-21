from pydantic import BaseModel, Field


class ReviewBase(BaseModel):
    building_id: int = Field(description="Target building ID")
    language_tag: str = Field(default="en", max_length=8, description="Review language tag")
    lived_from_year: int = Field(ge=1950, le=2100, description="First year lived at this place")
    lived_to_year: int = Field(ge=1950, le=2100, description="Last year lived at this place")
    comment: str = Field(min_length=20, max_length=4000, description="Plain text review comment")

    people_noise: int = Field(ge=1, le=5)
    animal_noise: int = Field(ge=1, le=5)
    insulation: int = Field(ge=1, le=5)
    pest_issues: int = Field(ge=1, le=5)
    area_safety: int = Field(ge=1, le=5)
    neighbourhood_vibe: int = Field(ge=1, le=5)
    outdoor_spaces: int = Field(ge=1, le=5)
    parking: int = Field(ge=1, le=5)
    building_maintenance: int = Field(ge=1, le=5)
    construction_quality: int = Field(ge=1, le=5)


class ReviewCreatePayload(ReviewBase):
    captcha_token: str | None = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "building_id": 1,
                "language_tag": "en",
                "lived_from_year": 2021,
                "lived_to_year": 2024,
                "comment": "Great natural light and insulation, but weekends were a bit noisy.",
                "people_noise": 3,
                "animal_noise": 4,
                "insulation": 4,
                "pest_issues": 5,
                "area_safety": 4,
                "neighbourhood_vibe": 4,
                "outdoor_spaces": 3,
                "parking": 2,
                "building_maintenance": 4,
                "construction_quality": 4,
                "captcha_token": None,
            }
        }
    }


class ReviewUpdatePayload(BaseModel):
    comment: str = Field(min_length=20, max_length=4000)
    edit_token: str | None = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "comment": "Updated after landlord fixed the hallway lighting.",
                "edit_token": "anonymous-edit-token",
            }
        }
    }


class ReviewStatusResponse(BaseModel):
    id: int
    tracking_code: str
    status: str
    moderation_message: str | None


class AdminModerationPayload(BaseModel):
    message: str | None = Field(default=None, max_length=1000)

    model_config = {
        "json_schema_extra": {
            "example": {
                "message": "Please remove identifying details and resubmit.",
            }
        }
    }


class ReportPayload(BaseModel):
    review_id: int
    reason: str
    details: str | None = Field(default=None, max_length=1000)

    model_config = {
        "json_schema_extra": {
            "example": {
                "review_id": 12,
                "reason": "PII",
                "details": "Contains social media handle and apartment door indicator.",
            }
        }
    }
