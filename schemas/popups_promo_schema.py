from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PopupBase(BaseModel):
    title: str
    message: str
    cta_text: Optional[str] = None
    cta_link: Optional[str] = None
    trigger: str = "on_load"
    delay_seconds: Optional[int] = None
    is_active: bool = True
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    


class PopupOut(PopupBase):
    id: int
    image_url: str
    created_at: datetime

    class Config:
        from_attributes = True
