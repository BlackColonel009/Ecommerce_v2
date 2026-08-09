
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models.model_marketing import Banner as BannerModel, Popup as PopupModel, Promo as PromoModel
from models.model_product import Product as ProductModel
from models.model_review import Review
from models.model_users import Admin
from routes.auth import get_current_admin
from schemas.review_schema import ReviewCreate, ReviewSchema
from sqlalchemy.sql import func
from fastapi import Query

router = APIRouter(prefix="/reviews", tags=["Avis"])


# Reccuperer les review d'un produit


@router.get("/{product_id}", response_model=List[ReviewSchema])
def get_reviews(product_id: int, db: Session = Depends(get_db)):
    return db.query(Review).filter(Review.product_id == product_id).order_by(Review.created_at.desc()).all()


@router.post("/{product_id}", response_model=ReviewSchema)
def add_review(
    product_id: int,
    review_data: ReviewCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # ✅ Utilise la vraie valeur envoyée
    review = Review(
        product_id=product_id,
        admin_id=current_admin.id,
        rating=review_data.rating,
        comment=review_data.comment
    )

    db.add(review)
    db.commit()
    db.refresh(review)

    # 🔄 Recalcul de la note moyenne
    avg_rating = db.query(func.avg(Review.rating))\
                   .filter(Review.product_id == product_id)\
                   .scalar()

    product.rating = round(avg_rating or 0, 2)
    db.commit()

    return review

# routes/reviews.py ou dans auth.py

@router.get("/{user_id}/reviews")
def get_user_reviews(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: Admin = Depends(get_current_admin)  # Optionnel: pour protéger
):
    """
    Récupère tous les avis d'un utilisateur
    """
    reviews = db.query(Review).filter(Review.admin_id == user_id).all()
    
    return [
        {
            "id": r.id,
            "product_id": r.product_id,
            "product_name": r.product.name if r.product else None,
            "product_image": r.product.images[0].image_url if r.product and r.product.images else None,
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at,
        }
        for r in reviews
    ]

