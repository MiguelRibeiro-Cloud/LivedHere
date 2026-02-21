from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.entities import Review
from app.schemas.reviews import ReviewStatusResponse

router = APIRouter(prefix="/review-status")


@router.get("/{code}", response_model=ReviewStatusResponse)
async def review_status(code: str, db: AsyncSession = Depends(get_db)) -> ReviewStatusResponse:
    review = (await db.execute(select(Review).where(Review.tracking_code == code))).scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown tracking code")
    return ReviewStatusResponse(
        id=review.id,
        tracking_code=review.tracking_code,
        status=review.status.value,
        moderation_message=review.moderation_message,
    )
