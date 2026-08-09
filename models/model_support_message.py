# models/support_message.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class SupportMessage(Base):
    __tablename__ = "support_messages"

    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("contact_messages.id"), nullable=False)
    name = Column(String)
    email = Column(String)
    message = Column(Text)

    replied = Column(Boolean, default=False)
    reply_message = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    replied_at = Column(DateTime, nullable=True)
    
    contact = relationship("ContactMessage", back_populates="support_responses")
    
    
