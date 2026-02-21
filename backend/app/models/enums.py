from enum import StrEnum


class UserRole(StrEnum):
    USER = "USER"
    ADMIN = "ADMIN"


class AuthorType(StrEnum):
    ANONYMOUS = "ANONYMOUS"
    USER = "USER"


class AuthorBadge(StrEnum):
    NONE = "NONE"
    VERIFIED_ACCOUNT = "VERIFIED_ACCOUNT"


class ReviewStatus(StrEnum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CHANGES_REQUESTED = "CHANGES_REQUESTED"
    REMOVED = "REMOVED"


class EditorType(StrEnum):
    ANONYMOUS = "ANONYMOUS"
    USER = "USER"
    ADMIN = "ADMIN"


class ReportReason(StrEnum):
    PII = "PII"
    HARASSMENT = "Harassment"
    FALSE_INFO = "FalseInfo"
    SPAM = "Spam"
    OTHER = "Other"
