from pydantic import BaseModel, Field
from typing import Optional, List


from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AdminInfo(BaseModel):
    id: int
    username: str
    email: str

class ReviewSchema(BaseModel):
    id: int
    rating: float
    comment: Optional[str]
    created_at: datetime
    admin: AdminInfo

    class Config:
        from_attributes = True

class ReviewCreate(BaseModel):
    comment: str
    rating: int = Field(..., ge=1, le=5)  # 🔒 sécurisé entre 1 et 5


class ProductWithReviewsSchema(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    rating: float
    reviews: List[ReviewSchema] = []

    class Config:
        from_attributes = True
