import logging

import aiosmtplib

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_magic_link_email(email: str, link: str) -> None:
    subject = "Your LivedHere magic sign-in link"
    body = f"Click to sign in: {link}\n\nThis link expires in 15 minutes."

    if not settings.send_real_email:
        logger.info("DEV_MAGIC_LINK %s -> %s", email, link)
        return

    message = (
        f"From: {settings.email_from}\r\n"
        f"To: {email}\r\n"
        f"Subject: {subject}\r\n\r\n"
        f"{body}"
    )

    await aiosmtplib.send(
        message,
        hostname=settings.email_host,
        port=settings.email_port,
        username=settings.email_user or None,
        password=settings.email_pass or None,
        start_tls=True,
    )
