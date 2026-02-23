from datetime import timedelta

from fastapi import APIRouter, Cookie, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_jwt, hash_token, random_token, utcnow
from app.models.entities import MagicLinkToken, Session, User
from app.models.enums import UserRole
from app.schemas.auth import RequestLinkPayload
from app.services.email import send_magic_link_email

router = APIRouter(prefix="/auth")


@router.post("/request-link")
async def request_magic_link(payload: RequestLinkPayload, db: AsyncSession = Depends(get_db)) -> dict:
    token = random_token(32)
    token_hash = hash_token(token)
    expires_at = utcnow() + timedelta(minutes=15)

    db.add(MagicLinkToken(email=payload.email, token_hash=token_hash, expires_at=expires_at))
    await db.commit()

    link = f"{settings.app_url}/en/auth/login?token={token}"
    await send_magic_link_email(payload.email, link)

    return {"ok": True, "dev_link": link if not settings.send_real_email else None}


@router.get("/callback")
async def auth_callback(token: str = Query(min_length=10), db: AsyncSession = Depends(get_db)) -> Response:
    token_hash = hash_token(token)
    stmt = select(MagicLinkToken).where(
        MagicLinkToken.token_hash == token_hash,
        MagicLinkToken.expires_at > utcnow(),
        MagicLinkToken.used_at.is_(None),
    )
    token_obj = (await db.execute(stmt)).scalar_one_or_none()
    if not token_obj:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")

    user_stmt = select(User).where(User.email == token_obj.email)
    user = (await db.execute(user_stmt)).scalar_one_or_none()
    if not user:
        user = User(email=token_obj.email, role=UserRole.ADMIN if token_obj.email == settings.admin_email else UserRole.USER)
        db.add(user)
        await db.flush()
    else:
        # If the configured admin email logs in and was previously created as USER,
        # upgrade it so admin access works without wiping the DB.
        if user.email == settings.admin_email and user.role != UserRole.ADMIN:
            user.role = UserRole.ADMIN

    token_obj.used_at = utcnow()
    session_token = create_jwt(str(user.id))
    db.add(
        Session(
            user_id=user.id,
            token_hash=hash_token(session_token),
            expires_at=utcnow() + timedelta(minutes=settings.session_ttl_minutes),
        )
    )
    await db.commit()

    response = Response(content="Authenticated", media_type="text/plain")
    response.set_cookie(
        key="lh_session",
        value=session_token,
        httponly=True,
        secure=settings.environment == "production",
        samesite="lax",
        max_age=settings.session_ttl_minutes * 60,
        path="/",
    )
    return response


@router.post("/logout")
async def logout(
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
    session_token: str | None = Cookie(default=None, alias="lh_session"),
) -> Response:
    if current_user and session_token:
        stmt = select(Session).where(Session.token_hash == hash_token(session_token))
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if existing:
            await db.delete(existing)
            await db.commit()
    response = Response(content="Logged out", media_type="text/plain")
    response.delete_cookie("lh_session", path="/")
    return response
