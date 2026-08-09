

from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product")

    __table_args__ = (
        UniqueConstraint("device_id", "product_id", name="unique_favorite_product_per_device"),
    )


class CompareItem(Base):
    __tablename__ = "compare_items"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product")

    __table_args__ = (
        UniqueConstraint("device_id", "product_id", name="unique_compare_product_per_device"),
    )



created_at = Column(DateTime(timezone=True), server_default=func.now())