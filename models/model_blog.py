from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class BlogPost(Base):
    __tablename__ = "blog_posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(220), nullable=False)
    slug = Column(String(240), unique=True, nullable=False, index=True)
    excerpt = Column(String(500), nullable=True)
    content = Column(Text, nullable=False)
    cover_image = Column(String(500), nullable=True)
    image_alt = Column(String(255), nullable=True)
    category = Column(String(100), nullable=False, default="Conseils", index=True)
    tags = Column(String(500), nullable=True)
    status = Column(String(20), nullable=False, default="draft", index=True)
    is_featured = Column(Boolean, nullable=False, default=False)
    seo_title = Column(String(70), nullable=True)
    seo_description = Column(String(170), nullable=True)
    canonical_url = Column(String(500), nullable=True)
    related_product_slugs = Column(Text, nullable=True)
    author_id = Column(Integer, ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    author = relationship("Admin")

    @property
    def author_name(self):
        return self.author.username if self.author else "Équipe New Technologies"

    @property
    def tag_list(self):
        return [tag.strip() for tag in (self.tags or "").split(",") if tag.strip()]

    @property
    def related_products(self):
        return [slug.strip() for slug in (self.related_product_slugs or "").split(",") if slug.strip()]

