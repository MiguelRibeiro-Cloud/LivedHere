from app.moderation.state import can_transition
from app.models.enums import ReviewStatus


def test_valid_transitions() -> None:
    assert can_transition(ReviewStatus.PENDING, ReviewStatus.APPROVED)
    assert can_transition(ReviewStatus.PENDING, ReviewStatus.REJECTED)
    assert can_transition(ReviewStatus.CHANGES_REQUESTED, ReviewStatus.APPROVED)


def test_invalid_transitions() -> None:
    assert not can_transition(ReviewStatus.APPROVED, ReviewStatus.PENDING)
    assert not can_transition(ReviewStatus.REJECTED, ReviewStatus.APPROVED)
