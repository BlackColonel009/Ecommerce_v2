from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base


class PopupModel(Base):
    __tablename__ = "popups_promotions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)

    image_url = Column(String, nullable=False)

    cta_text = Column(String, nullable=True)
    cta_link = Column(String, nullable=True)

    trigger = Column(String, default="on_load")  # on_load | delay
    delay_seconds = Column(Integer, nullable=True)

    is_active = Column(Boolean, default=True)

    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    