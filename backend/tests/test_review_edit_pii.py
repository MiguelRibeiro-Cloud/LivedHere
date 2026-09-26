import os
from datetime import timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://example:example@localhost/example")

from app.api.reviews import router
from app.auth.dependencies import get_current_user
from app.core.database import get_db
from app.core.security import hash_token, utcnow
from app.models.entities import Review, ReviewEditHistory, User
from app.models.enums import ReviewStatus, UserRole


class ReviewSession:
    def __init__(self, review: Review) -> None:
        self.review = review
        self.added: list[ReviewEditHistory] = []
        self.commits = 0

    async def execute(self, _statement):
        return SimpleNamespace(scalar_one_or_none=lambda: self.review)

    def add(self, item: ReviewEditHistory) -> None:
        self.added.append(item)

    async def commit(self) -> None:
        self.commits += 1


def _review(author: User) -> Review:
    return Review(
        id=42,
        author_user_id=author.id,
        status=ReviewStatus.APPROVED,
        comment="The building was quiet and comfortable.",
        moderation_message="Previously approved",
        pii_flagged=False,
        pii_reasons=[],
        edit_token_hash=hash_token("valid-anonymous-edit-token"),
        edit_token_expires_at=utcnow() + timedelta(days=1),
    )


def _edit(review: Review, current_user: User | None, comment: str, edit_token: str | None = None):
    db = ReviewSession(review)
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: current_user

    with TestClient(app) as client:
        response = client.put(f"/reviews/{review.id}", json={"comment": comment, "edit_token": edit_token})
    return response, db


def test_author_can_edit_with_safe_text() -> None:
    author = User(id=uuid4(), role=UserRole.USER)
    review = _review(author)
    comment = "The hallway lighting is much better now."

    response, db = _edit(review, author, comment)

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert review.comment == comment
    assert review.status == ReviewStatus.PENDING
    assert review.moderation_message is None
    assert review.pii_flagged is False
    assert review.pii_reasons == []
    assert db.commits == 1
    assert len(db.added) == 1
    assert db.added[0].before_json == {"comment": "The building was quiet and comfortable.", "status": "APPROVED"}
    assert db.added[0].after_json == {"comment": comment, "status": "PENDING"}


@pytest.mark.parametrize(
    "comment",
    [
        "Contact me at reviewer@example.invalid for details.",
        "My bank account is PT50 0002 0123 1234 5678 9015 4.",
    ],
)
@pytest.mark.parametrize("editor", ["author", "anonymous_token"])
def test_edit_with_hard_pii_is_rejected_without_changing_review(comment: str, editor: str) -> None:
    author = User(id=uuid4(), role=UserRole.USER)
    review = _review(author)

    current_user = author if editor == "author" else None
    edit_token = "valid-anonymous-edit-token" if editor == "anonymous_token" else None
    response, db = _edit(review, current_user, comment, edit_token)

    assert response.status_code == 400
    assert "personal data" in response.json()["detail"]
    assert review.comment == "The building was quiet and comfortable."
    assert review.status == ReviewStatus.APPROVED
    assert review.moderation_message == "Previously approved"
    assert review.pii_flagged is False
    assert review.pii_reasons == []
    assert db.commits == 0
    assert db.added == []


def test_edit_updates_soft_pii_flags() -> None:
    author = User(id=uuid4(), role=UserRole.USER)
    review = _review(author)

    response, db = _edit(review, author, "The building is quiet. See https://example.invalid/review for details.")

    assert response.status_code == 200
    assert review.pii_flagged is True
    assert review.pii_reasons == ["url"]
    assert db.commits == 1


def test_edit_clears_stale_pii_flags() -> None:
    author = User(id=uuid4(), role=UserRole.USER)
    review = _review(author)
    review.pii_flagged = True
    review.pii_reasons = ["url"]

    response, _db = _edit(review, author, "The building is quiet and has a pleasant courtyard.")

    assert response.status_code == 200
    assert review.pii_flagged is False
    assert review.pii_reasons == []


def test_unrelated_user_cannot_edit_without_token() -> None:
    author = User(id=uuid4(), role=UserRole.USER)
    unrelated_user = User(id=uuid4(), role=UserRole.USER)
    review = _review(author)

    response, db = _edit(review, unrelated_user, "The building is quiet and has a pleasant courtyard.")

    assert response.status_code == 403
    assert review.comment == "The building was quiet and comfortable."
    assert db.commits == 0


def test_anonymous_edit_token_still_allows_safe_edit() -> None:
    review = _review(User(id=uuid4(), role=UserRole.USER))

    response, db = _edit(review, None, "The building is quiet and has a pleasant courtyard.", "valid-anonymous-edit-token")

    assert response.status_code == 200
    assert review.status == ReviewStatus.PENDING
    assert db.commits == 1
