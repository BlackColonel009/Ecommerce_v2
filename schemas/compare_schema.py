from pydantic import BaseModel
from schemas.favoris_schema import FavoriteProduct


class CompareBase(BaseModel):
    device_id: str
    product_id: int

class CompareCreate(CompareBase):
    pass

class CompareOut(BaseModel):
    id: int
    product: FavoriteProduct  # même format

    class Config:
        from_attributes = True
