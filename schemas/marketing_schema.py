from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from models.model_marketing import PromoType


class Banner(BaseModel):
    id: int
    title: str
    link: Optional[str]
    position: str
    order: int
    is_active: bool
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    image_url: str
    image_mobile_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class Popup(BaseModel):
    id: int
    title: str
    message: str
    image_url: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Promo(BaseModel):
    id: int
    product_id: int
    tag: PromoType
    discount_percent: int
    start_date: datetime
    end_date: datetime
    product_name: str  # nouveau champ

    class Config:
        from_attributes = True
