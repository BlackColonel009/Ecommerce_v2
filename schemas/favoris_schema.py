from pydantic import BaseModel

from schemas.product_schema import ProductSchema

class FavoriteBase(BaseModel):
    product_id: int

class FavoriteCreate(FavoriteBase):
    pass


class FavoriteProduct(BaseModel):
    id: int
    name: str
    slug: str
    

    class Config:
        from_attributes = True

class FavoriteOut(BaseModel):
    id: int
    product: ProductSchema

    class Config:
        from_attributes = True
