import logging
from email.message import EmailMessage

import aiosmtplib

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_magic_link_email(email: str, link: str) -> None:
    subject = "Your LivedHere magic sign-in link"
    body = (
        f"Click to sign in:\n\n{link}\n\n"
        "This link expires in 15 minutes.\n\n"
        "If you did not request this, you can safely ignore this email."
    )

    if not settings.send_real_email:
        logger.info("DEV_MAGIC_LINK %s -> %s", email, link)
        return

    msg = EmailMessage()
    msg["From"] = settings.email_from
    msg["To"] = email
    msg["Subject"] = subject
    msg.set_content(body)

    await aiosmtplib.send(
        msg,
        hostname=settings.email_host,
        port=settings.email_port,
        username=settings.email_user or None,
        password=settings.email_pass or None,
        start_tls=True,
    )
