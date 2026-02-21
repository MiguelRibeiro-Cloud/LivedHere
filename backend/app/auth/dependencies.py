from fastapi import Cookie, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.core.database import get_db
from app.core.security import decode_jwt, hash_token, utcnow
from app.models.entities import Session, User
from app.models.enums import UserRole


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    session_token: str | None = Cookie(default=None, alias="lh_session"),
) -> User | None:
    if not session_token:
        return None
    token_hash = hash_token(session_token)
    try:
        payload = decode_jwt(session_token)
    except JWTError:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None

    try:
        user_uuid = UUID(user_id)
    except ValueError:
        return None

    stmt = select(Session).where(Session.token_hash == token_hash, Session.expires_at > utcnow())
    session_obj = (await db.execute(stmt)).scalar_one_or_none()
    if not session_obj:
        return None
    if session_obj.user_id != user_uuid:
        return None

    user_stmt = select(User).where(User.id == user_id, User.deleted_at.is_(None))
    return (await db.execute(user_stmt)).scalar_one_or_none()


async def require_user(current_user: User | None = Depends(get_current_user)) -> User:
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return current_user


async def require_admin(current_user: User = Depends(require_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
