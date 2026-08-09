from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from sqlalchemy.orm import Session
from database import get_db
from models.model_product import Product
from models.model_category import ProductCategory as CategoryModel
from schemas.brand_schema import BrandCreate, Brand
from models.model_brands import ProductBrand as BrandModel

from schemas.product_schema import ProductSchema
from routes.auth import get_current_admin

router = APIRouter(prefix="/brands", tags=["Brands"])


# -------------------- Create Brand --------------------
@router.post("/", response_model=Brand)
def create_brand(data: BrandCreate, db: Session = Depends(get_db), _admin = Depends(get_current_admin)):
    existing = db.query(BrandModel).filter(BrandModel.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Brand already exists")

    brand = BrandModel(name=data.name)
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return brand


# -------------------- List Brands --------------------
@router.get("/", response_model=list[Brand])
def get_brands(db: Session = Depends(get_db)):
    return db.query(BrandModel).all()


