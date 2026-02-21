from pydantic import BaseModel, EmailStr


class RequestLinkPayload(BaseModel):
    email: EmailStr

    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "person@example.com",
            }
        }
    }


class MeResponse(BaseModel):
    id: str
    email: EmailStr
    role: str

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "7cb81cb3-c6f2-4f5f-9b2f-a46dd2de2f48",
                "email": "person@example.com",
                "role": "USER",
            }
        }
    }
