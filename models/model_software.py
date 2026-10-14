from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from database import Base


class Software(Base):
    __tablename__ = "software"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(160), nullable=False)
    slug = Column(String(180), nullable=False, unique=True, index=True)
    badge = Column(String(60), nullable=False, default="Logiciel")
    short_description = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    features = Column(Text, nullable=True)
    platforms = Column(String(255), nullable=True)
    image_url = Column(String(500), nullable=True)
    image_alt = Column(String(255), nullable=True)
    discover_url = Column(String(500), nullable=True)
    trial_url = Column(String(500), nullable=True)
    download_url = Column(String(500), nullable=True)
    status = Column(String(20), nullable=False, default="draft", index=True)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    @property
    def feature_list(self):
        return [item.strip() for item in (self.features or "").splitlines() if item.strip()]

    @property
    def platform_list(self):
        return [item.strip() for item in (self.platforms or "").split(",") if item.strip()]
