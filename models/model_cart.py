from sqlalchemy import CheckConstraint, Column, Integer, String, ForeignKey, Float, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Cart(Base):
    __tablename__ = "carts"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(200), index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    notes = Column(String(500), nullable=True)
    status = Column(String(20), default="active")  # active, ordered, archived



    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")


class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(Integer, primary_key=True, index=True)
    cart_id = Column(Integer, ForeignKey("carts.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    variant_id = Column(Integer, ForeignKey("product_variants.id"), nullable=True)  # ← NOUVEAU
    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    
    # -------------------
    # Nouvelle colonne pour la couleur
    # -------------------
    color_id = Column(Integer, ForeignKey("product_colors.id"), nullable=True)

    cart = relationship("Cart", back_populates="items")
    product = relationship("Product")
    color = relationship("ProductColor")  # relation ORM pour accéder aux infos couleur
    variant = relationship("ProductVariant", foreign_keys=[variant_id])

    __table_args__ = (
        CheckConstraint(
            '(product_id IS NOT NULL AND variant_id IS NULL) OR (product_id IS NULL AND variant_id IS NOT NULL)',
            name='check_item_type'
        ),
    )

class Settings(Base):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True)
    key = Column(String(50), unique=True)
    value = Column(String(200))
