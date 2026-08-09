from pydantic import BaseModel, Field
from typing import List, Optional, Union

from schemas.product_schema import ProductSchema
from schemas.variantes_schema import VariantSchema

# ---------------------------
# CART ITEM CREATE / UPDATE
# ---------------------------

class CartItemCreate(BaseModel):
    product_id: int
    quantity: int
    color_id: Optional[int] = None  # <-- ajout couleur


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1)
    color_id: Optional[int] = None  # optionnel si on veut permettre changement couleur


class CartItemCreate(BaseModel):
    product_id: int
    quantity: int
    color_id: Optional[int] = None
    promo_price: Optional[float] = None  # ✅ Ajout du champ promo


# ------------------------------------
# CART ITEM WITH VARIANT
# ------------------------------------
class CartItemWithVariantCreate(BaseModel):
    variant_id: int
    quantity: int
    color_id: Optional[int] = None

class CartItemWithProductCreate(BaseModel):
    product_id: int
    quantity: int
    color_id: Optional[int] = None
    promo_price: Optional[float] = None

# Union type pour accepter les deux
CartItemCreate = Union[CartItemWithProductCreate, CartItemWithVariantCreate]

# ---------------------------
# CART ITEM RESPONSE
# ---------------------------

class CartItemSchema(BaseModel):
    id: int
    product_id: Optional[int] = None  # Maintenant optionnel car on peut l'avoir via variant
    variant_id: Optional[int] = None
    product: Optional[ProductSchema] = None
    variant: Optional[VariantSchema] = None
    quantity: int
    price: float
    total: float
    color_id: Optional[int] = None
    
    class Config:
        from_attributes = True


# ---------------------------
# CART RESPONSE
# ---------------------------

class CartSchema(BaseModel):
    id: int
    device_id: str
    items: List[CartItemSchema]
    total_amount: float

    class Config:
        from_attributes = True


class CartUpdateNotes(BaseModel):
    notes: Optional[str]

# Dans tes schemas (ex: cart_schema.py)

# ---------------------------
# WHATSAPP RESPONSE
# ---------------------------

class WhatsAppMessage(BaseModel):
    whatsapp_url: str
    message_preview: str
    total_amount: float

class WhatsAppRequest(BaseModel):
    notes: Optional[str] = None
    location: Optional[dict] = None 
