from pydantic import BaseModel


class BrandBase(BaseModel):
    name: str
    
    class Config:
        from_attributes = True


class BrandCreate(BrandBase):
    pass


class Brand(BrandBase):
    id: int

    class Config:
        from_attributes = True
