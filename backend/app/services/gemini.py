"""Thin async wrapper around the Google Gemini / Gemma REST API.

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
    model: str = "gemma-3-27b-it",
    max_tokens: int = 100,
    temperature: float = 0.1,
    system: str | None = None,
    json_mode: bool = False,
) -> str | None:
    """Send a single-turn prompt and return the text response.

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
        # Gemma models don't support systemInstruction; prepend to first user msg
        if model.startswith("gemma"):
            body["contents"][0]["parts"][0]["text"] = (
                f"[System instructions — follow strictly]\n{system}\n\n"
                f"[User message]\n{body['contents'][0]['parts'][0]['text']}"
            )
        else:
            body["systemInstruction"] = {"parts": [{"text": system}]}

    # JSON mode (responseMimeType) is only supported by Gemini models, not Gemma
    if json_mode and not model.startswith("gemma"):
        body["generationConfig"]["responseMimeType"] = "application/json"

    return await _call_api(url, body)


async def generate_chat(
    messages: list[dict[str, str]],
    *,
    model: str = "gemma-3-27b-it",
    max_tokens: int = 256,
    temperature: float = 0.3,
    system: str | None = None,
) -> str | None:
    """Send a multi-turn conversation and return the model's reply.

    ``messages`` is a list of dicts with ``role`` ("user" | "model") and
    ``text`` keys.  The system instruction is passed separately.
    """
    if not settings.gemini_api_key:
        return None

    url = f"{_BASE}/{model}:generateContent"

    contents: list[dict[str, Any]] = []
    for msg in messages:
        role = "model" if msg["role"] in ("assistant", "model") else "user"
        contents.append({"role": role, "parts": [{"text": msg["text"]}]})

    body: dict[str, Any] = {
        "contents": contents,
        "generationConfig": {
            "maxOutputTokens": max_tokens,
            "temperature": temperature,
        },
    }

    if system:
        # Gemma models don't support systemInstruction; prepend to first msg
        if model.startswith("gemma") and contents:
            first_text = contents[0]["parts"][0]["text"]
            contents[0]["parts"][0]["text"] = (
                f"[System instructions — follow strictly]\n{system}\n\n"
                f"[User message]\n{first_text}"
            )
        else:
            body["systemInstruction"] = {"parts": [{"text": system}]}

    return await _call_api(url, body)


async def _call_api(url: str, body: dict[str, Any]) -> str | None:
    """Shared HTTP call logic."""
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
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
