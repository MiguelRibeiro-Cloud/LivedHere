from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_admin
from app.core.database import get_db
from app.models.entities import Report, Review, User
from app.models.enums import ReportReason
from app.schemas.reviews import ReportPayload

router = APIRouter()


@router.post("/reports")
async def create_report(
    payload: ReportPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
) -> dict:
    review = (await db.execute(select(Review).where(Review.id == payload.review_id))).scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    try:
        reason = ReportReason(payload.reason)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reason") from exc

    report = Report(
        review_id=payload.review_id,
        reporter_type="USER" if current_user else "ANONYMOUS",
        reporter_user_id=current_user.id if current_user else None,
        reason=reason,
        details=payload.details,
    )
    db.add(report)
    await db.commit()
    return {"ok": True, "id": report.id}


@router.get("/admin/reports")
async def admin_reports(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)) -> list[dict]:
    reports = (await db.execute(select(Report).order_by(Report.created_at.desc()))).scalars().all()
    return [
        {
            "id": report.id,
            "review_id": report.review_id,
            "reason": report.reason.value,
            "details": report.details,
            "resolved_at": report.resolved_at.isoformat() if report.resolved_at else None,
        }
        for report in reports
    ]
