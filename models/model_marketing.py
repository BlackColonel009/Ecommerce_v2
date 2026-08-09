from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import relationship
from typing import List, Optional
from datetime import datetime
from database import Base
from models.model_product import Product

from .enums import PromoType   # ton enum python






class Banner(Base):
    __tablename__ = "banners"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    link = Column(String, nullable=True)

    position = Column(String, default="homepage")  # homepage, slider, sidebar, mobile, footer
    order = Column(Integer, default=0)  # affichage

    image_url = Column(String, nullable=False)
    image_mobile_url = Column(String, nullable=True)

    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)



class Popup(Base):
    __tablename__ = "popups"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    image_url = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    


class Promo(Base):
    __tablename__ = "promos"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    tag = Column(
        SAEnum(
            *[e.value for e in PromoType],  # 👈 liste des valeurs de l'Enum
            name="promotype",
            native_enum=True
        ),
        nullable=False
    )
    discount_percent = Column(Integer, nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    

    product = relationship("Product", back_populates="promos")
    
    @property
    def product_name(self):
        return self.product.name