from pydantic import BaseModel, EmailStr, Field, HttpUrl
from typing import Optional
from datetime import datetime

class NewsletterSubscribe(BaseModel):
    email: EmailStr
    is_active: Optional[bool] = True
    subscribed_at: Optional[datetime] = None
    bonus_code: Optional[str] = None
    bonus_amount: Optional[int] = 10000
    bonus_used: Optional[bool] = False
    bonus_expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class NewsletterOut(BaseModel):
    id:int
    email: EmailStr
    is_active: Optional[bool] = True
    subscribed_at: Optional[datetime] = None
    bonus_code: Optional[str] = None
    bonus_amount: Optional[int] = 10000
    bonus_used: Optional[bool] = False
    bonus_expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NewsletterCampaign(BaseModel):
    """Contenu d'une offre envoyée depuis le dashboard."""

    subject: str = Field(min_length=3, max_length=160)
    title: str = Field(min_length=3, max_length=120)
    message: str = Field(min_length=3, max_length=4000)
    cta_label: str = Field(default="Voir les offres", min_length=2, max_length=60)
    cta_url: HttpUrl | None = None
