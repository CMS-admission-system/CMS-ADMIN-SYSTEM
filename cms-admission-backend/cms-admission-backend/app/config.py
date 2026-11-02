from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_env_candidates = [
    Path.cwd() / ".env",
    Path(__file__).resolve().parent.parent / ".env",
    Path(__file__).resolve().parent.parent.parent / ".env",
    Path(__file__).resolve().parent.parent.parent.parent / ".env",
]
_env_file = next((str(p) for p in _env_candidates if p.is_file()), ".env")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_env_file, extra="ignore")

    DATABASE_URL: str = ""
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    MOBILE_UPLOAD_BASE_URL: str = "http://localhost:5173/upload"

    JWT_SECRET: str = "change-me-dev-only"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480

    AADHAAR_ENC_KEY: str = ""

    UPLOAD_TOKEN_EXPIRE_MINUTES: int = 120
    UPLOAD_DIR: str = "./uploads"

    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "change-this-password"

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "cmsadsystem@gmail.com"
    SMTP_TLS: bool = True
    FRONTEND_BASE_URL: str = "http://localhost:5173"


    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def db_url(self) -> str:
        url = self.DATABASE_URL.strip()
        if not url:
            return "sqlite:///./admission.db"
        if url.startswith("mysql://") and "+pymysql" not in url:
            url = url.replace("mysql://", "mysql+pymysql://", 1)
        elif url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif url.startswith("postgresql://") and "+psycopg2" not in url:
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        # Strip unsupported query parameters like ?ssl-mode=REQUIRED for PyMySQL compatibility
        for param in ["?ssl-mode=REQUIRED", "&ssl-mode=REQUIRED", "?ssl-mode=required", "&ssl-mode=required"]:
            url = url.replace(param, "")
        return url


settings = Settings()
