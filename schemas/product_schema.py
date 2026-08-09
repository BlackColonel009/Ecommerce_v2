from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from schemas.brand_schema import BrandBase
from schemas.category_schema import CategoryBase
from schemas.marketing_schema import Promo


# -------------------------
# Base
# -------------------------
class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: int
    brand_id: int


# -------------------------
# Create (multipart handled in routes)
# -------------------------
class ProductCreate(ProductBase):
    pass


# -------------------------
# Specs
# -------------------------
class ProductSpec(BaseModel):
    id: int
    key: str
    value: str

    class Config:
        from_attributes = True


# -------------------------
# Images
# -------------------------
class ProductImage(BaseModel):
    id: int
    image_url: str
    is_main: bool

    class Config:
        from_attributes = True


# -------------------------
# Price
# -------------------------
class Price(BaseModel):
    id: int
    price: float
    currency: str

    class Config:
        from_attributes = True


# -------------------------
# Inventory
# -------------------------
class Inventory(BaseModel):
    id: int
    quantity: int

    class Config:
        from_attributes = True

# -------------------------
# Color Schema
# -------------------------
class ProductColorSchema(BaseModel):
    id: int
    color: str

    class Config:
        from_attributes = True



# -------------------------
# Review / Avis
# -------------------------
class Review(BaseModel):
    id: int
    rating: float
    comment: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
        
# -------------------------
# Accesoire
# -------------------------

class AccessorySchema(BaseModel):
    id: int
    name: str
    prices: List[Price]  # pour afficher le prix dans le select
    




# -------------------------
# Product Response enrichi
# -------------------------
class ProductSchema(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    category: CategoryBase
    brand: BrandBase
    rating: float                     # moyenne des avis
    is_deleted: bool 
    images: List[ProductImage] = []
    specs: List[ProductSpec] = []
    prices: List[Price] = []
    inventory: Optional[Inventory]
    colors: List[ProductColorSchema] = []
    reviews: List[Review] = []        # ✅ liste des avis du produit
    accessories: List[AccessorySchema] = [] 
    has_variants: bool = False
    variants_count: int = 0



    class Config:
        from_attributes = True

class ProductWithPromoSchema(ProductSchema):
    promo: Optional[Promo] = None
