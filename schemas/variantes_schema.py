# schemas/variant_schema.py
from pydantic import BaseModel
from typing import Optional

from schemas.product_schema import ProductSchema  # ← Importe le schema produit

class VariantSchema(BaseModel):
    id: int
    sku: str
    ram: Optional[str] = None
    storage: Optional[str] = None
    processor: Optional[str] = None
    price: float
    quantity: int
    product: Optional[ProductSchema] = None  # ← AJOUTE CETTE LIGNE
    
    class Config:
        from_attributes = True