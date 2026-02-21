import httpx
from fastapi import HTTPException, status

from app.core.config import settings


async def verify_captcha(token: str | None, remote_ip: str | None = None) -> None:
    if settings.captcha_provider == "none":
        return
    if not token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Captcha token required")

    if settings.captcha_provider == "turnstile":
        url = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    elif settings.captcha_provider == "recaptcha":
        url = "https://www.google.com/recaptcha/api/siteverify"
    else:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Invalid captcha provider")

    async with httpx.AsyncClient(timeout=8.0) as client:
        response = await client.post(
            url,
            data={"secret": settings.captcha_secret, "response": token, "remoteip": remote_ip or ""},
        )
    data = response.json()
    if not data.get("success"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Captcha verification failed")
