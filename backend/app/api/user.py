from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_user
from app.core.database import get_db
from app.models.entities import MagicLinkToken, Session, User
from app.models.enums import UserRole
from app.schemas.auth import MeResponse

router = APIRouter()


@router.get("/me", response_model=MeResponse)
async def me(current_user: User = Depends(require_user)) -> MeResponse:
    return MeResponse(id=str(current_user.id), email=current_user.email, role=current_user.role.value)


@router.delete("/me")
async def delete_me(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_user)) -> dict:
    if current_user.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin accounts are managed by environment variables and cannot be self-deleted",
        )
    await db.execute(delete(Session).where(Session.user_id == current_user.id))
    await db.execute(delete(MagicLinkToken).where(MagicLinkToken.email == current_user.email))
    await db.delete(current_user)
    await db.commit()
    return {"ok": True}
