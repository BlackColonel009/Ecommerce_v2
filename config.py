from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
from urllib.parse import urlparse


ENV_FILE = Path(__file__).resolve().with_name(".env")

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

    PROJECT_NAME: str
    PROJECT_VERSION: str

    # ⚡️ DATABASE_URL n'est pas un champ à valider, juste une constante
    # DATABASE_URL: ClassVar[str] = "postgresql://postgres.tpnesqsizufxwwvvgcwv:immobilier2025@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"
    DATABASE_URL: str
    

    SUPABASE_URL: str
    SUPABASE_KEY: str

    SECRET_KEY: str
    ALGORITHM: str
    DOMAIN: str
    
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ADMIN_COOKIE_NAME: str = "nt_admin_session"
    ADMIN_COOKIE_DOMAIN: str = ".newtechnologiestg.com"
    COOKIE_SECURE: bool = False

    SUPERADMIN_USERNAME: str
    SUPERADMIN_EMAIL: str
    SUPERADMIN_PASSWORD: str

    MAIL_USERNAME: str
    MAIL_PASSWORD: str
    MAIL_FROM: str
    MAIL_FROM_NAME: str = "New Technologies"
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False
    FRONTEND_URL: str = "http://localhost:8001"
    DASHBOARD_URL: str = "http://localhost:8002"
    # Clé serveur du moteur de recherche utilisé uniquement dans le dashboard.
    # Ne jamais l'exposer dans les fichiers JavaScript.
    SERPER_API_KEY: str | None = None

    @property
    def cors_origins(self) -> list[str]:
        origins = {
            "http://127.0.0.1:8001",
            "http://127.0.0.1:8002",
            "http://localhost:8001",
            "http://localhost:8002",
            # Origines publiques officielles. Elles restent autorisees meme si
            # un serveur conserve temporairement ses URL locales dans le .env.
            "https://newtechnologiestg.com",
            "https://www.newtechnologiestg.com",
            "https://dashboard.newtechnologiestg.com",
            self.FRONTEND_URL.rstrip("/"),
            self.DASHBOARD_URL.rstrip("/"),
        }
        for configured_origin in (self.FRONTEND_URL, self.DASHBOARD_URL):
            configured_origin = configured_origin.rstrip("/")
            if "localhost" in configured_origin:
                origins.add(configured_origin.replace("localhost", "127.0.0.1"))
            elif "127.0.0.1" in configured_origin:
                origins.add(configured_origin.replace("127.0.0.1", "localhost"))
        domain = self.DOMAIN.strip().rstrip("/")
        if domain:
            domain = domain.removeprefix("https://").removeprefix("http://")
            origins.update(
                {
                    f"https://{domain}",
                    f"https://www.{domain}",
                    f"https://dashboard.{domain}",
                }
            )
        return sorted(origins)

    def admin_cookie_domain_for_host(self, host_or_url: str | None) -> str | None:
        """Partage la session admin entre l'API et le dashboard en production."""
        if not host_or_url:
            return None

        parsed = urlparse(
            host_or_url if "://" in host_or_url else f"//{host_or_url}"
        )
        hostname = (parsed.hostname or "").lower().rstrip(".")
        cookie_domain = self.ADMIN_COOKIE_DOMAIN.strip().lower().rstrip(".")
        root_domain = cookie_domain.lstrip(".")
        if hostname == root_domain or hostname.endswith(f".{root_domain}"):
            return f".{root_domain}"
        return None

    def admin_cookie_is_secure(self, host_or_url: str | None) -> bool:
        return self.COOKIE_SECURE or self.admin_cookie_domain_for_host(host_or_url) is not None


settings = Settings()

# config/mail.py
from fastapi_mail import ConnectionConfig

conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    USE_CREDENTIALS=True,
)

# from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
# from pydantic import BaseModel, EmailStr
# import os


# async def send_newsletter_welcome_email(email: EmailStr):
#     html = f"""
#     <h3>Bienvenue à NEW TECHNOLOGIES notre Ecommerce !</h3>
#     <p>Merci de vous être inscrit à notre newsletter.</p>
#     <p>Nous vous tiendrons informé(e) des nouveautés, événements et publications.</p>
#     <p>Et comme promis vous avez un bon de 10000F sur votre premier achat chez nous!🔥</p>
#     <p>N'hesitez pas à nous le rappeler également en nous contactant par Whatsapp dans le panier.👌😍</p>
#     """

#     msg = MessageSchema(
#         subject="Bienvenue sur CARES TOGO 🎉",
#         recipients=[email],
#         body=html,
#         subtype="html"
#     )

#     fm = FastMail(conf)
#     await fm.send_message(msg)
