from sqlalchemy import Column, Integer, String, DateTime
from database import Base
from datetime import datetime

class Visitor(Base):
    __tablename__ = "visitors"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, nullable=False)  # pour identifier un utilisateur unique
    source = Column(String, default="Direct")  # Direct / Social / Referral
    date = Column(DateTime, default=datetime.utcnow)
