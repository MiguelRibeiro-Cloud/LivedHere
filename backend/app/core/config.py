from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "LivedHere API"
    api_prefix: str = "/api"
    environment: str = Field(default="development", alias="ENVIRONMENT")
    app_url: str = Field(default="http://localhost:5173", alias="APP_URL")

    database_url: str = Field(alias="DATABASE_URL")

    jwt_secret: str = Field(default="replace_me_with_a_long_secret", alias="JWT_SECRET")
    jwt_algorithm: str = "HS256"
    session_ttl_minutes: int = 60 * 24 * 7

    send_real_email: bool = Field(default=False, alias="SEND_REAL_EMAIL")
    email_host: str = Field(default="", alias="EMAIL_HOST")
    email_port: int = Field(default=587, alias="EMAIL_PORT")
    email_user: str = Field(default="", alias="EMAIL_USER")
    email_pass: str = Field(default="", alias="EMAIL_PASS")
    email_from: str = Field(default="noreply@livedhere.local", alias="EMAIL_FROM")

    admin_email: str = Field(default="admin@example.com", alias="ADMIN_EMAIL")

    captcha_provider: str = Field(default="none", alias="CAPTCHA_PROVIDER")
    captcha_secret: str = Field(default="", alias="CAPTCHA_SECRET")

    cors_origins: str = Field(default="http://localhost:5173", alias="CORS_ORIGINS")


settings = Settings()
