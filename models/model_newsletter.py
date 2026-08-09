from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class NewsletterSubscriber(Base):
    __tablename__ = "newsletter_subscribers"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False)

    # Statut abonnement
    is_active = Column(Boolean, default=True)
    subscribed_at = Column(DateTime, default=datetime.utcnow)

    # 🎁 Bonus
    bonus_code = Column(String, unique=True, nullable=True)
    bonus_amount = Column(Integer, default=10000)
    bonus_used = Column(Boolean, default=False)
    bonus_expires_at = Column(DateTime, nullable=True)

    user_id = Column(Integer, ForeignKey("admins.id"), nullable=True)
    user = relationship("Admin", back_populates="newsletter_subscriptions")