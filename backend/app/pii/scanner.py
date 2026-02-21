import re

EMAIL_PATTERN = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_PATTERN = re.compile(r"(?:\+?\d{1,3}[\s.-]?)?(?:\d[\s.-]?){8,}")
HANDLE_PATTERN = re.compile(r"(?<!\w)@[A-Za-z0-9_\.]{2,}")
LOCATION_DETAIL_PATTERN = re.compile(
    r"\b(?:apt|door|andar|unit|fração|fracao|esq|dir|\d+º|\d+[A-Za-z])\b", re.IGNORECASE
)


def scan_pii(text: str) -> tuple[bool, list[str], bool]:
    reasons: list[str] = []
    if EMAIL_PATTERN.search(text):
        reasons.append("email")
    if PHONE_PATTERN.search(text):
        reasons.append("phone")
    if HANDLE_PATTERN.search(text):
        reasons.append("handle")
    if LOCATION_DETAIL_PATTERN.search(text):
        reasons.append("exact_location")

    flagged = len(reasons) > 0
    blocked = any(reason in {"email", "phone"} for reason in reasons)
    return flagged, reasons, blocked
