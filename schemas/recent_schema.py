from pydantic import BaseModel
from datetime import datetime

from schemas.product_schema import ProductSchema

class RecentCreate(BaseModel):
    product_id: int


class RecentOut(BaseModel):
    id: int
    product_id: int
    viewed_at: datetime
    product: ProductSchema

    class Config:
        from_attributes = True
