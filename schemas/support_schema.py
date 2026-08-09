from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ContactMessage(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str]
    subject: str
    message: str
    created_at: datetime

    class Config:
        from_attributes = True
