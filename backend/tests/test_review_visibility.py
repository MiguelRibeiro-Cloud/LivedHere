import os
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://example:example@localhost/example")

from app.api.reviews import router
from app.auth.dependencies import get_current_user
from app.core.database import get_db
from app.models.entities import Review, User
from app.models.enums import AuthorBadge, ReviewStatus, UserRole


def _get_review(review: Review, current_user: User | None):
    class ReviewSession:
        async def execute(self, _statement):
            return SimpleNamespace(scalar_one_or_none=lambda: review)

    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = lambda: ReviewSession()
    app.dependency_overrides[get_current_user] = lambda: current_user
    with TestClient(app) as client:
        return client.get(f"/reviews/{review.id}")


def _review(status: ReviewStatus, author_user_id):
    return Review(
        id=42,
        author_user_id=author_user_id,
        status=status,
        tracking_code="EXAMPLE42",
        comment="Example review",
        overall_score=4.5,
        author_badge=AuthorBadge.VERIFIED_ACCOUNT,
    )


def test_anonymous_user_can_read_approved_review() -> None:
    response = _get_review(_review(ReviewStatus.APPROVED, uuid4()), None)

    assert response.status_code == 200
    assert response.json() == {
        "id": 42,
        "status": "APPROVED",
        "tracking_code": "EXAMPLE42",
        "comment": "Example review",
        "overall_score": 4.5,
        "verified": True,
    }


@pytest.mark.parametrize("review_status", [ReviewStatus.PENDING, ReviewStatus.REJECTED])
def test_author_can_read_own_unapproved_review(review_status: ReviewStatus) -> None:
    author = User(id=uuid4(), role=UserRole.USER)

    response = _get_review(_review(review_status, author.id), author)

    assert response.status_code == 200
    assert response.json()["status"] == review_status.value


@pytest.mark.parametrize("review_status", [ReviewStatus.PENDING, ReviewStatus.REJECTED])
def test_unrelated_user_cannot_read_unapproved_review(review_status: ReviewStatus) -> None:
    unrelated_user = User(id=uuid4(), role=UserRole.USER)

    response = _get_review(_review(review_status, uuid4()), unrelated_user)

    assert response.status_code == 404
    assert response.json() == {"detail": "Review not found"}


def test_admin_can_read_unapproved_review() -> None:
    admin = User(id=uuid4(), role=UserRole.ADMIN)

    response = _get_review(_review(ReviewStatus.PENDING, uuid4()), admin)

    assert response.status_code == 200
    assert response.json()["status"] == "PENDING"
