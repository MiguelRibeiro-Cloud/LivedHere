"""Thin async wrapper around the Google Gemini REST API.

All calls go through this module so the API key is never exposed to the
frontend and usage is centralised for logging / caching.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


async def generate_text(
    prompt: str,
    *,
    model: str = "gemini-2.0-flash-lite",
    max_tokens: int = 100,
    temperature: float = 0.1,
    system: str | None = None,
    json_mode: bool = False,
) -> str | None:
    """Send a single-turn prompt to Gemini and return the text response.

    Returns ``None`` when the API key is missing, the request fails, or the
    response cannot be parsed — callers should always fall back gracefully.
    """
    if not settings.gemini_api_key:
        return None

    url = f"{_BASE}/{model}:generateContent"

    body: dict[str, Any] = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "maxOutputTokens": max_tokens,
            "temperature": temperature,
        },
    }

    if system:
        body["systemInstruction"] = {"parts": [{"text": system}]}

    if json_mode:
        body["generationConfig"]["responseMimeType"] = "application/json"

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(8.0)) as client:
            resp = await client.post(
                url,
                params={"key": settings.gemini_api_key},
                json=body,
            )
            if resp.status_code != 200:
                logger.warning("Gemini API %s: %s", resp.status_code, resp.text[:300])
                return None
            data = resp.json()
    except Exception:
        logger.warning("Gemini API call failed", exc_info=True)
        return None

    try:
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError, TypeError):
        return None
