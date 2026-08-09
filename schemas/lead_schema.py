from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class LeadCreate(BaseModel):
    name: str
    whatsapp: str
    product_requested: str
  

class LeadUpdateStatus(BaseModel):
    status: str  # pending / confirmed / cancelled

class LeadOut(BaseModel):
    id: int
    name: str
    whatsapp: str
    product_requested: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
