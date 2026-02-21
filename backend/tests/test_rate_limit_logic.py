from datetime import UTC, datetime, timedelta


def _check(count_ip: int, count_building: int, count_fp: int) -> str | None:
    if count_ip >= 5:
        return "IP"
    if count_building >= 5:
        return "BUILDING"
    if count_fp >= 3:
        return "FP"
    return None


def test_ip_limit_rule() -> None:
    assert _check(5, 0, 0) == "IP"


def test_building_limit_rule() -> None:
    assert _check(0, 5, 0) == "BUILDING"


def test_fingerprint_limit_rule() -> None:
    assert _check(0, 0, 3) == "FP"


def test_window_math_example() -> None:
    now = datetime.now(UTC)
    since = now - timedelta(hours=24)
    assert since < now
