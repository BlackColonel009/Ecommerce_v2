from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class BlogPostOut(BaseModel):
    id: int
    title: str
    slug: str
    excerpt: Optional[str] = None
    content: str
    cover_image: Optional[str] = None
    image_alt: Optional[str] = None
    category: str
    tags: Optional[str] = None
    tag_list: list[str] = Field(default_factory=list)
    status: str
    is_featured: bool
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    canonical_url: Optional[str] = None
    related_product_slugs: Optional[str] = None
    related_products: list[str] = Field(default_factory=list)
    author_id: Optional[int] = None
    author_name: str
    published_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BlogPostList(BaseModel):
    data: list[BlogPostOut]
    total: int
    page: int
    limit: int
    pages: int


class BlogTaxonomy(BaseModel):
    categories: list[str]
    tags: list[str]
