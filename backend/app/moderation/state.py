from app.models.enums import ReviewStatus


TRANSITIONS = {
    ReviewStatus.PENDING: {ReviewStatus.APPROVED, ReviewStatus.REJECTED, ReviewStatus.CHANGES_REQUESTED, ReviewStatus.REMOVED},
    ReviewStatus.CHANGES_REQUESTED: {ReviewStatus.APPROVED, ReviewStatus.REJECTED, ReviewStatus.REMOVED},
    ReviewStatus.APPROVED: {ReviewStatus.REMOVED},
    ReviewStatus.REJECTED: set(),
    ReviewStatus.REMOVED: set(),
}


def can_transition(current: ReviewStatus, target: ReviewStatus) -> bool:
    return target in TRANSITIONS[current]
