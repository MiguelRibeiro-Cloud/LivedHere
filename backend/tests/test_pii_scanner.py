from app.pii.scanner import scan_pii


def test_scan_pii_detects_email_and_phone() -> None:
    flagged, reasons, blocked = scan_pii("Call me at +351 912345678 or email me@test.com")
    assert flagged is True
    assert "email" in reasons
    assert "phone" in reasons
    assert blocked is True


def test_scan_pii_borderline_location_marker() -> None:
    flagged, reasons, blocked = scan_pii("I lived on 3º andar esq for 2 years.")
    assert flagged is True
    assert "exact_location" in reasons
    assert blocked is False
