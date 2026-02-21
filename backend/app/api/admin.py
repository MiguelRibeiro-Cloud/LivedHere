from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_admin
from app.core.database import get_db
from app.models.entities import Review, User
from app.models.enums import ReviewStatus
from app.moderation.state import can_transition
from app.schemas.reviews import AdminModerationPayload

router = APIRouter(prefix="/admin")


def _apply_status(review: Review, target: ReviewStatus, admin: User, message: str | None = None) -> None:
    if not can_transition(review.status, target):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status transition")
    review.status = target
    review.moderated_by = admin.id
    review.moderation_message = message
    if target == ReviewStatus.APPROVED:
        review.approved_at = datetime.now(UTC)


@router.get("/reviews")
async def list_reviews(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)) -> list[dict]:
    reviews = (await db.execute(select(Review).order_by(Review.created_at.desc()))).scalars().all()
    return [
        {
            "id": review.id,
            "status": review.status.value,
            "tracking_code": review.tracking_code,
            "comment": review.comment,
            "overall_score": float(review.overall_score),
            "pii_flagged": review.pii_flagged,
        }
        for review in reviews
    ]


@router.post("/reviews/{review_id}/approve")
async def approve_review(
    review_id: int,
    payload: AdminModerationPayload,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    review = (await db.execute(select(Review).where(Review.id == review_id))).scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    _apply_status(review, ReviewStatus.APPROVED, admin, payload.message)
    await db.commit()
    return {"ok": True}


@router.post("/reviews/{review_id}/reject")
async def reject_review(
    review_id: int,
    payload: AdminModerationPayload,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    review = (await db.execute(select(Review).where(Review.id == review_id))).scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    _apply_status(review, ReviewStatus.REJECTED, admin, payload.message)
    await db.commit()
    return {"ok": True}


@router.post("/reviews/{review_id}/request-changes")
async def request_changes(
    review_id: int,
    payload: AdminModerationPayload,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    review = (await db.execute(select(Review).where(Review.id == review_id))).scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    _apply_status(review, ReviewStatus.CHANGES_REQUESTED, admin, payload.message)
    await db.commit()
    return {"ok": True}


@router.post("/reviews/{review_id}/remove")
async def remove_review(
    review_id: int,
    payload: AdminModerationPayload,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    review = (await db.execute(select(Review).where(Review.id == review_id))).scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    _apply_status(review, ReviewStatus.REMOVED, admin, payload.message)
    await db.commit()
    return {"ok": True}
