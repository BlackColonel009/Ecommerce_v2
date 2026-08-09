from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class RecentView(Base):
    __tablename__ = "recent_views"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(200), index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"))
    viewed_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product")
