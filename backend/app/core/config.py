from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


_DEVELOPMENT_JWT_SECRET = "replace_me_with_a_long_secret"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "LivedHere API"
    api_prefix: str = "/api"
    environment: str = Field(default="development", alias="ENVIRONMENT")
    app_url: str = Field(default="http://localhost:80", alias="APP_URL")

    database_url: str = Field(alias="DATABASE_URL")

    jwt_secret: str = Field(default=_DEVELOPMENT_JWT_SECRET, alias="JWT_SECRET")
    jwt_algorithm: str = "HS256"
    session_ttl_minutes: int = 60 * 24 * 7

    send_real_email: bool = Field(default=False, alias="SEND_REAL_EMAIL")
    email_host: str = Field(default="", alias="EMAIL_HOST")
    email_port: int = Field(default=587, alias="EMAIL_PORT")
    email_user: str = Field(default="", alias="EMAIL_USER")
    email_pass: str = Field(default="", alias="EMAIL_PASS")
    email_from: str = Field(default="noreply@livedhere.local", alias="EMAIL_FROM")

    admin_emails_raw: str = Field(default="admin@example.com", alias="ADMIN_EMAILS")
    admin_email_legacy: str = Field(default="", alias="ADMIN_EMAIL")

    captcha_provider: str = Field(default="none", alias="CAPTCHA_PROVIDER")
    captcha_secret: str = Field(default="", alias="CAPTCHA_SECRET")

    cors_origins: str = Field(default="http://localhost:80", alias="CORS_ORIGINS")

    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-3.5-flash-lite", alias="GEMINI_MODEL")

    @model_validator(mode="after")
    def require_production_jwt_secret(self) -> "Settings":
        if self.environment.strip().lower() == "production" and self.jwt_secret.strip() in {
            "",
            _DEVELOPMENT_JWT_SECRET,
            "replace_with_at_least_32_characters_long_secret",
        }:
            raise ValueError("JWT_SECRET must be configured with a non-example value in production")
        return self

    @model_validator(mode="after")
    def require_production_email_delivery(self) -> "Settings":
        if self.environment.strip().lower() == "production" and not self.send_real_email:
            raise ValueError("SEND_REAL_EMAIL must be enabled in production")
        return self

    @property
    def admin_emails(self) -> set[str]:
        raw_values = [self.admin_emails_raw]
        if self.admin_email_legacy:
            raw_values.append(self.admin_email_legacy)
        normalized = {
            email.strip().lower()
            for chunk in raw_values
            for email in chunk.split(",")
            if email.strip()
        }
        return normalized

    def is_admin_email(self, email: str) -> bool:
        return email.strip().lower() in self.admin_emails


settings = Settings()
