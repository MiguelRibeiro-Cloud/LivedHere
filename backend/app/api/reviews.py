from datetime import timedelta

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.core.database import get_db
from app.core.security import hash_token, random_token, utcnow
from app.models.entities import Building, Review, ReviewEditHistory, User
from app.models.enums import AuthorBadge, AuthorType, EditorType, ReviewStatus
from app.pii.scanner import scan_pii
from app.rate_limit.service import RateLimitExceeded, evaluate_rate_limit
from app.schemas.reviews import ReviewCreatePayload, ReviewUpdatePayload
from app.services.captcha import verify_captcha

router = APIRouter(prefix="/reviews")


def _score(payload: ReviewCreatePayload) -> tuple[float, int]:
    values = [
        payload.people_noise,
        payload.animal_noise,
        payload.insulation,
        payload.pest_issues,
        payload.area_safety,
        payload.neighbourhood_vibe,
        payload.outdoor_spaces,
        payload.parking,
        payload.building_maintenance,
        payload.construction_quality,
    ]
    overall = sum(values) / len(values)
    return overall, round(overall)


@router.post("")
async def create_review(
    payload: ReviewCreatePayload,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
    fingerprint: str | None = Cookie(default=None, alias="lh_fp"),
) -> dict:
    building = (await db.execute(select(Building).where(Building.id == payload.building_id))).scalar_one_or_none()
    if not building:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Building not found")

    remote_ip = request.client.host if request.client else "unknown"
    fp = fingerprint or random_token(16)
    try:
        await evaluate_rate_limit(db, ip=remote_ip, fingerprint=fp, building_id=payload.building_id)
    except RateLimitExceeded as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(exc),
            headers={"Retry-After": "3600"},
        ) from exc

    if current_user is None:
        await verify_captcha(payload.captcha_token, remote_ip)

    flagged, reasons, blocked = scan_pii(payload.comment)
    if blocked:
        blocked_types = [r for r in reasons if r in {"email", "phone", "nif", "citizen_card", "iban"}]
        hint_map = {
            "email": "email addresses",
            "phone": "phone numbers",
            "nif": "tax identification numbers (NIF)",
            "citizen_card": "citizen card numbers",
            "iban": "bank account numbers (IBAN)",
        }
        hints = ", ".join(hint_map.get(t, t) for t in blocked_types)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Your review contains personal data that must be removed for privacy: {hints}. "
            "Please edit your comment and try again.",
        )

    overall_score, rounded = _score(payload)
    tracking_code = random_token(8)[:12].upper()
    edit_token = random_token(32)

    review = Review(
        building_id=payload.building_id,
        author_user_id=current_user.id if current_user else None,
        author_type=AuthorType.USER if current_user else AuthorType.ANONYMOUS,
        author_badge=AuthorBadge.VERIFIED_ACCOUNT if current_user else AuthorBadge.NONE,
        status=ReviewStatus.PENDING,
        tracking_code=tracking_code,
        edit_token_hash=hash_token(edit_token),
        edit_token_expires_at=utcnow() + timedelta(days=30),
        language_tag=payload.language_tag,
        lived_from_year=payload.lived_from_year,
        lived_to_year=payload.lived_to_year,
        lived_duration_months=max(1, (payload.lived_to_year - payload.lived_from_year) * 12),
        people_noise=payload.people_noise,
        animal_noise=payload.animal_noise,
        insulation=payload.insulation,
        pest_issues=payload.pest_issues,
        area_safety=payload.area_safety,
        neighbourhood_vibe=payload.neighbourhood_vibe,
        outdoor_spaces=payload.outdoor_spaces,
        parking=payload.parking,
        building_maintenance=payload.building_maintenance,
        construction_quality=payload.construction_quality,
        overall_score=overall_score,
        overall_score_rounded=rounded,
        comment=payload.comment,
        pii_flagged=flagged,
        pii_reasons=reasons,
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)

    if not fingerprint:
        response.set_cookie(key="lh_fp", value=fp, httponly=True, samesite="lax", max_age=60 * 60 * 24 * 365, path="/")

    return {"id": review.id, "tracking_code": tracking_code, "edit_token": edit_token}


@router.get("/{review_id}")
async def get_review(review_id: int, db: AsyncSession = Depends(get_db), current_user: User | None = Depends(get_current_user)) -> dict:
    review = (await db.execute(select(Review).where(Review.id == review_id))).scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    if review.status != ReviewStatus.APPROVED and current_user is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Review is not public")

    return {
        "id": review.id,
        "status": review.status.value,
        "tracking_code": review.tracking_code,
        "comment": review.comment,
        "overall_score": float(review.overall_score),
        "verified": review.author_badge.value == AuthorBadge.VERIFIED_ACCOUNT,
    }


@router.put("/{review_id}")
async def update_review(
    review_id: int,
    payload: ReviewUpdatePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
) -> dict:
    review = (await db.execute(select(Review).where(Review.id == review_id))).scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    allowed = False
    editor = EditorType.ANONYMOUS
    if current_user and review.author_user_id == current_user.id:
        allowed = True
        editor = EditorType.USER
    elif payload.edit_token and hash_token(payload.edit_token) == review.edit_token_hash and review.edit_token_expires_at > utcnow():
        allowed = True
    if not allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot edit this review")

    before = {"comment": review.comment, "status": review.status.value}
    review.comment = payload.comment
    review.status = ReviewStatus.PENDING
    review.moderation_message = None
    after = {"comment": review.comment, "status": review.status.value}
    db.add(ReviewEditHistory(review_id=review.id, before_json=before, after_json=after, editor_type=editor))
    await db.commit()

    return {"ok": True}


