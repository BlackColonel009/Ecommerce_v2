from typing import Optional
from pydantic import BaseModel
from typing import List, TYPE_CHECKING






# ------------ Base ------------
class CategoryBase(BaseModel):
    id: int
    name: str
    slug: str
    parent_id: Optional[int] = None
    


    class Config:
        from_attributes = True


# ------------ Create ------------
class CategoryCreate(CategoryBase):
    parent_id: Optional[int] = None  # <-- autorise la création d'une sous-catégorie



# ------------ Response ------------
class Category(CategoryBase):
    id: int
    name: str
    slug: str
    image_url: Optional[str] = None
    

    class Config:
        from_attributes = True



class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    parent_id: Optional[int] = None
    # image_url ne sera pas passé directement, on gère via UploadFile
    class Config:
        from_attributes = True
