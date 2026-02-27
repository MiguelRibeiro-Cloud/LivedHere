import re

EMAIL_PATTERN = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_PATTERN = re.compile(r"(?:\+?\d{1,3}[\s.-]?)?(?:\d[\s.-]?){8,}")
HANDLE_PATTERN = re.compile(r"(?<!\w)@[A-Za-z0-9_\.]{2,}")
LOCATION_DETAIL_PATTERN = re.compile(
    r"\b(?:apt|door|andar|unit|fração|fracao|esq|dir|\d+º|\d+[A-Za-z])\b", re.IGNORECASE
)

# Portuguese NIF (Número de Identificação Fiscal) — 9 digits, first digit 1-9
NIF_PATTERN = re.compile(r"\b[1-9]\d{8}\b")

# Portuguese Cartão de Cidadão number — typically 8 digits + check digit + 2 letters + 1 digit
CC_PATTERN = re.compile(r"\b\d{8}\s*\d\s*[A-Z]{2}\d\b", re.IGNORECASE)

# Portuguese/Brazilian phone patterns: +351 / 351- followed by 9 digits, or 9x xxx xxx
PT_PHONE_PATTERN = re.compile(
    r"(?:\+?351[\s.-]?)?\b9\d{1}[\s.-]?\d{3}[\s.-]?\d{3}\b"
)

# IBAN pattern (any country, but catches Portuguese PT50 ...)
IBAN_PATTERN = re.compile(r"\b[A-Z]{2}\d{2}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{0,4}\b")

# URLs (people sometimes leave their website or social media links)
URL_PATTERN = re.compile(
    r"https?://[^\s<>\"']+|www\.[^\s<>\"']+", re.IGNORECASE
)

# Full names pattern — two or more capitalized words in a row (heuristic, flagged not blocked)
FULL_NAME_PATTERN = re.compile(r"\b[A-ZÀ-Ü][a-zà-ü]{2,}\s+[A-ZÀ-Ü][a-zà-ü]{2,}(?:\s+[A-ZÀ-Ü][a-zà-ü]{2,})+\b")


def scan_pii(text: str) -> tuple[bool, list[str], bool]:
    """Scan text for personally identifiable information.

    Returns (flagged, reasons, blocked):
      - flagged: True if any PII pattern matched
      - reasons: list of matched PII category strings
      - blocked: True if hard-blocking PII was found (submission should be rejected)
    """
    reasons: list[str] = []
    if EMAIL_PATTERN.search(text):
        reasons.append("email")
    if PHONE_PATTERN.search(text):
        reasons.append("phone")
    if PT_PHONE_PATTERN.search(text):
        if "phone" not in reasons:
            reasons.append("phone")
    if HANDLE_PATTERN.search(text):
        reasons.append("handle")
    if LOCATION_DETAIL_PATTERN.search(text):
        reasons.append("exact_location")
    if NIF_PATTERN.search(text):
        reasons.append("nif")
    if CC_PATTERN.search(text):
        reasons.append("citizen_card")
    if IBAN_PATTERN.search(text):
        reasons.append("iban")
    if URL_PATTERN.search(text):
        reasons.append("url")
    if FULL_NAME_PATTERN.search(text):
        reasons.append("possible_full_name")

    flagged = len(reasons) > 0
    blocked = any(reason in {"email", "phone", "nif", "citizen_card", "iban"} for reason in reasons)
    return flagged, reasons, blocked
