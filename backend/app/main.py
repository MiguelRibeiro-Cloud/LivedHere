from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from urllib.parse import urlparse

from app.api import router as api_router
from app.api.review_status import router as review_status_router
from app.core.config import settings
from app.core.database import AsyncSessionLocal

app = FastAPI(
    title=settings.app_name,
    description="Community-driven housing quality reviews — privacy-first, moderated, bilingual (EN/PT).",
    version="1.1.0",
)

origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

trusted_hosts = {"localhost", "127.0.0.1"}
parsed_app_url = urlparse(settings.app_url)
if parsed_app_url.hostname:
    trusted_hosts.add(parsed_app_url.hostname)

app.add_middleware(TrustedHostMiddleware, allowed_hosts=list(trusted_hosts))


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "img-src 'self' data: https://tile.openstreetmap.org; "
        "style-src 'self' 'unsafe-inline'; "
        "script-src 'self'; "
        "connect-src 'self' http://localhost:8000 http://localhost:5173; "
        "base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self'"
    )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(self), microphone=(), camera=()"
    if settings.environment == "production":
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    return response


@app.get("/health")
async def health() -> dict:
    """Health check endpoint with optional DB connectivity verification."""
    result: dict = {"ok": True, "version": "1.1.0"}
    try:
        async with AsyncSessionLocal() as session:
            await session.execute("SELECT 1")  # type: ignore[arg-type]
        result["db"] = "connected"
    except Exception:
        result["db"] = "unreachable"
    return result


app.include_router(api_router)
app.include_router(review_status_router)
