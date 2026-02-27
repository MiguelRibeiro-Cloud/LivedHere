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


def test_scan_pii_detects_portuguese_nif() -> None:
    flagged, reasons, blocked = scan_pii("My NIF is 123456789 for tax purposes.")
    assert flagged is True
    assert "nif" in reasons
    assert blocked is True


def test_scan_pii_detects_iban() -> None:
    flagged, reasons, blocked = scan_pii("Pay me at PT50 0002 0123 1234 5678 9015 4")
    assert flagged is True
    assert "iban" in reasons
    assert blocked is True


def test_scan_pii_detects_url() -> None:
    flagged, reasons, blocked = scan_pii("Check my review at https://myblog.com/review")
    assert flagged is True
    assert "url" in reasons
    assert blocked is False


def test_scan_pii_clean_review() -> None:
    flagged, reasons, blocked = scan_pii(
        "Great building, quiet neighbours, good insulation. Lived here for 3 years and loved the area."
    )
    assert flagged is False
    assert reasons == []
    assert blocked is False


def test_scan_pii_portuguese_phone_format() -> None:
    flagged, reasons, blocked = scan_pii("Liga para 91 234 5678")
    assert flagged is True
    assert "phone" in reasons
    assert blocked is True
