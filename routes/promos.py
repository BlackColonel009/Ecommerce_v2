from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from database import get_db
from models.model_marketing import Banner as BannerModel, Popup as PopupModel, Promo as PromoModel, PromoType
from models.model_product import Product as ProductModel
from schemas.marketing_schema import Banner as BannerSchema, Popup as PopupSchema, Promo as PromoSchema

from utils.file_manager import save_upload_file
from routes.auth import get_current_admin

router = APIRouter(prefix="/marketing", tags=["Marketing"])
# -------------------- CREATE PROMO --------------------
@router.post("/promo", response_model=PromoSchema)
def create_promo(
    product_id: int = Form(...),
    tag: Optional[PromoType] = Form(None),
    discount_percent: int = Form(...),
    start_date: datetime = Form(...),
    end_date: datetime = Form(...),
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    
    if end_date <= start_date:
        raise HTTPException(400, "End date must be after start date")

    promo = PromoModel(
        product_id=product_id,
        tag=tag,
        discount_percent=discount_percent,
        start_date=start_date,
        end_date=end_date
    )
    db.add(promo)
    db.commit()
    db.refresh(promo)
    return promo

@router.get("/promo/active")
def active_promos(db: Session = Depends(get_db)):
    now = datetime.utcnow()

    promos = (
        db.query(PromoModel)
        .join(ProductModel, PromoModel.product_id == ProductModel.id)
        .filter(
            PromoModel.start_date <= now,
            PromoModel.end_date >= now
        )
        .all()
    )

    results = []

    for promo in promos:
        product = promo.product  # relation SQLAlchemy

        results.append({
            "promo": {
                "id": promo.id,
                "tag": promo.tag,
                "discount_percent": promo.discount_percent,
                "start_date": promo.start_date,
                "end_date": promo.end_date
            },
            "product": {
                "id": product.id,
                "slug": product.slug,
                "name": product.name,
                "category": {
                    "id": product.category.id,
                    "name": product.category.name,
                    "slug": product.category.slug
                } if product.category else None,
                "brand": {
                    "id": product.brand.id,
                    "name": product.brand.name
                } if product.brand else None,
                "images": [
                    {
                        "id": img.id,
                        "image_url": img.image_url,
                        "is_main": img.is_main
                    } for img in product.images
                ],
                "prices": [
                    {
                        "id": pr.id,
                        "price": pr.price,
                        "currency": pr.currency
                    } for pr in product.prices
                ],
                "specs": [
                    {
                        "id": spec.id,
                        "key": spec.key,
                        "value": spec.value
                    } for spec in product.specs
                ],
                "colors": [
                    {
                        "id": color.id,
                        "name": color.color,
                        
                    } for color in product.colors
                ],
                "inventory": {
                    "quantity": product.inventory.quantity if product.inventory else 0
                }
            }
        })

    return results



# -------------------- LIST PROMOS --------------------
# @router.get("/promo", response_model=List[PromoSchema])
# def list_promos(db: Session = Depends(get_db)):
#     return db.query(PromoModel).all()

@router.get("/promo", response_model=List[PromoSchema])
def list_promos(db: Session = Depends(get_db)):
    promos = db.query(PromoModel).join(ProductModel).order_by(PromoModel.start_date.desc()).all()
    return [
        {
            "id": promo.id,
            "product_id": promo.product_id,
            "tag": promo.tag,
            "product_name": promo.product.name,  # récupère le nom
            "discount_percent": promo.discount_percent,
            "start_date": promo.start_date,
            "end_date": promo.end_date,
        }
        for promo in promos
    ]


# -------------------- UPDATE PROMO --------------------
@router.put("/promo/{promo_id}", response_model=PromoSchema)
def update_promo(
    promo_id: int,
    tag:  Optional[PromoType] = Form(None),
    discount_percent: Optional[int] = Form(None),
    start_date: Optional[datetime] = Form(None),
    end_date: Optional[datetime] = Form(None),
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    promo = db.query(PromoModel).filter(PromoModel.id == promo_id).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Promo not found")

    if discount_percent is not None:
        promo.discount_percent = discount_percent
    if tag is not None:
        promo.tag = tag
    if start_date:
        promo.start_date = start_date
    if end_date:
        promo.end_date = end_date

    db.commit()
    db.refresh(promo)
    return promo

@router.get("/promo/active/{product_id}")
def active_product_promo(product_id: int, db: Session = Depends(get_db)):
    now = datetime.utcnow()

    # Récupérer la promo active pour ce produit spécifique
    promo = (
        db.query(PromoModel)
        .filter(
            PromoModel.product_id == product_id,
            PromoModel.start_date <= now,
            PromoModel.end_date >= now
        )
        .first()  # .first() car un seul produit
    )

    if not promo:
        # Retourner un objet vide si pas de promo
        return {
            "has_promo": False,
            "product_id": product_id
        }

    product = promo.product

    # Calculer le prix après remise
    original_price = product.prices[0].price if product.prices else 0
    discount = promo.discount_percent
    discounted_price = original_price * (100 - discount) / 100

    return {
        "has_promo": True,
        "promo": {
            "id": promo.id,
            "tag": promo.tag,
            "discount_percent": discount,
            "start_date": promo.start_date,
            "end_date": promo.end_date,
            "discounted_price": round(discounted_price, 2)  # Prix après promo
        },
        "product": {
                "id": product.id,
                "name": product.name,
                "category": {
                    "id": product.category.id,
                    "name": product.category.name,
                    "slug": product.category.slug
                } if product.category else None,
                "brand": {
                    "id": product.brand.id,
                    "name": product.brand.name
                } if product.brand else None,
                "images": [
                    {
                        "id": img.id,
                        "image_url": img.image_url,
                        "is_main": img.is_main
                    } for img in product.images
                ],
                "prices": [
                    {
                        "id": pr.id,
                        "price": pr.price,
                        "currency": pr.currency
                    } for pr in product.prices
                ],
                "specs": [
                    {
                        "id": spec.id,
                        "key": spec.key,
                        "value": spec.value
                    } for spec in product.specs
                ],
                "colors": [
                    {
                        "id": color.id,
                        "name": color.color,
                        
                    } for color in product.colors
                ],
                "inventory": {
                    "quantity": product.inventory.quantity if product.inventory else 0
                }
            }
    }

@router.get("/promo/active/slug/{slug}")
def active_product_promo_by_slug(slug: str, db: Session = Depends(get_db)):
    from datetime import datetime
    now = datetime.utcnow()

    # 1) Récupérer d'abord le produit par son slug
    product = db.query(ProductModel).filter(
        ProductModel.slug == slug,
        ProductModel.is_deleted == False,
        ProductModel.is_active == True
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # 2) Récupérer la promo active pour ce produit
    promo = (
        db.query(PromoModel)
        .filter(
            PromoModel.product_id == product.id,
            PromoModel.start_date <= now,
            PromoModel.end_date >= now
        )
        .first()
    )

    if not promo:
        return {
            "has_promo": False,
            "product_id": product.id,
            "slug": product.slug
        }

    # 3) Calculer le prix après remise
    original_price = product.prices[0].price if product.prices else 0
    discount = promo.discount_percent
    discounted_price = original_price * (100 - discount) / 100

    # 4) Retourner les infos avec le slug
    return {
        "has_promo": True,
        "promo": {
            "id": promo.id,
            "tag": promo.tag,
            "discount_percent": discount,
            "start_date": promo.start_date,
            "end_date": promo.end_date,
            "discounted_price": round(discounted_price, 2)
        },
        "product": {
            "id": product.id,
            "name": product.name,
            "slug": product.slug,  # ✅ Ajout du slug ici
            "category": {
                "id": product.category.id,
                "name": product.category.name,
                "slug": product.category.slug
            } if product.category else None,
            "brand": {
                "id": product.brand.id,
                "name": product.brand.name
            } if product.brand else None,
            "images": [
                {
                    "id": img.id,
                    "image_url": img.image_url,
                    "is_main": img.is_main
                } for img in product.images
            ],
            "prices": [
                {
                    "id": pr.id,
                    "price": pr.price,
                    "currency": pr.currency
                } for pr in product.prices
            ],
            "specs": [
                {
                    "id": spec.id,
                    "key": spec.key,
                    "value": spec.value
                } for spec in product.specs
            ],
            "colors": [
                {
                    "id": color.id,
                    "name": color.color,
                } for color in product.colors
            ],
            "inventory": {
                "quantity": product.inventory.quantity if product.inventory else 0
            }
        }
    }

# -------------------- DELETE PROMO --------------------
@router.delete("/promo/{promo_id}")
def delete_promo(promo_id: int, db: Session = Depends(get_db), admin = Depends(get_current_admin)):
    promo = db.query(PromoModel).filter(PromoModel.id == promo_id).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Promo not found")
    db.delete(promo)
    db.commit()
    return {"message": "Promo deleted successfully"}


@router.get("/promo/tags", response_model=list[str])
def get_promo_tags():
    from models.enums import PromoType
    return [tag.value for tag in PromoType]
