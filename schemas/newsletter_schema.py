from pydantic import BaseModel, EmailStr
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