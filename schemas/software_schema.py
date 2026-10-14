from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class SoftwareOut(BaseModel):
    id: int
    name: str
    slug: str
    badge: str
    short_description: Optional[str] = None
    description: Optional[str] = None
    features: Optional[str] = None
    feature_list: list[str] = Field(default_factory=list)
    platforms: Optional[str] = None
    platform_list: list[str] = Field(default_factory=list)
    image_url: Optional[str] = None
    image_alt: Optional[str] = None
    discover_url: Optional[str] = None
    trial_url: Optional[str] = None
    download_url: Optional[str] = None
    status: str
    sort_order: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SoftwareList(BaseModel):
    data: list[SoftwareOut]
    total: int
