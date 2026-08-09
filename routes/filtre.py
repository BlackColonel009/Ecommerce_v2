
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models.model_marketing import PromoType
from models.model_product import Inventory, Price, Product, ProductImage, ProductSpec
from models.model_marketing import Banner as BannerModel, Popup as PopupModel, Promo as PromoModel
from models.model_product import Product as ProductModel
from models.model_brands import ProductBrand as Brand
from utils.file_manager import save_upload_file
from schemas.product_schema import ProductSchema as ProductSchema, ProductColorSchema
from fastapi import Query
from sqlalchemy import and_
from sqlalchemy.sql import func
from fastapi import Query
from models.model_product import ProductColor, Price
from models.model_category import ProductCategory as CategoryModel

router = APIRouter(prefix="/filter", tags=["Filtres"])


# GET /products/filter?color=black

from models.model_product import ProductColor

@router.get("/color", response_model=List[ProductSchema])
def filter_products(
    color: str = Query(..., description="Couleur produit (ex: black)"),
    db: Session = Depends(get_db)
):
    return (
        db.query(ProductModel)
        .join(ProductColor)
        .filter(
            ProductColor.color.ilike(color),
            ProductModel.is_deleted == False
        )
        .all()
    )

@router.get("/products/{id}/colors", response_model=List[ProductColorSchema])
def get_product_colors(id: int, db: Session = Depends(get_db)):
    return (
        db.query(ProductColor)
        .filter(ProductColor.product_id == id)
        .all()
    )


@router.get("/")
def get_filters(db: Session = Depends(get_db)):
    # Récupérer les marques avec nombre de produits
    brands = (
        db.query(Brand.name, func.count(Product.id))
        .join(Product)
        .filter(Product.is_deleted == False)
        .group_by(Brand.name)
        .all()
    )

    # Récupérer les couleurs avec nombre de produits
    colors = (
        db.query(ProductColor.color, func.count(ProductColor.product_id))
        .group_by(ProductColor.color)
        .all()
    )

    # Récupérer min/max prix
    min_price = db.query(func.min(Price.price)).scalar() or 0
    max_price = db.query(func.max(Price.price)).scalar() or 0

    return {
        "brands": [{"name": b[0], "count": b[1]} for b in brands],
        "colors": [{"name": c[0], "count": c[1]} for c in colors],
        "price": {"min": min_price, "max": max_price}
    }