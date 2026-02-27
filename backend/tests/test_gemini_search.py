"""Tests for the Gemini service wrapper and search normalisation."""

import asyncio
import os

import pytest

# Provide a dummy DATABASE_URL so Settings can instantiate outside Docker
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://x:x@localhost/x")


# ---- tests for the gemini service ----

def test_generate_text_returns_none_without_api_key(monkeypatch):
    """When GEMINI_API_KEY is empty, generate_text should return None immediately."""
    import app.core.config as cfg
    monkeypatch.setattr(cfg.settings, "gemini_api_key", "")

    from app.services.gemini import generate_text

    result = asyncio.new_event_loop().run_until_complete(
        generate_text("test prompt")
    )
    assert result is None


def test_generate_text_returns_none_with_bad_key(monkeypatch):
    """With an invalid API key, generate_text should return None (not raise)."""
    import app.core.config as cfg
    monkeypatch.setattr(cfg.settings, "gemini_api_key", "INVALID_KEY")

    from app.services.gemini import generate_text

    # The HTTP request will 400/403 but should be caught and return None
    result = asyncio.new_event_loop().run_until_complete(
        generate_text("hello", max_tokens=5)
    )
    assert result is None


# ---- tests for search normalisation ----

def test_normalize_name_strips_accents():
    """normalize_name should strip Portuguese diacritics for search matching."""
    from app.services.text import normalize_name
    assert normalize_name("João") == "joao"
    assert normalize_name("São Paulo") == "sao paulo"
    assert normalize_name("Rua do Século") == "rua do seculo"
    assert normalize_name("  Café  ") == "cafe"


def test_normalize_name_handles_prepositions():
    """Queries with and without prepositions normalise consistently."""
    from app.services.text import normalize_name
    a = normalize_name("rua joao freitas branco")
    b = normalize_name("rua joao de freitas branco")
    # These should be DIFFERENT after normalisation (proving why AI correction helps)
    assert a != b
    assert "de" in b
    assert "de" not in a
