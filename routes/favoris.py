from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from models.model_favoris_compare import Favorite
from models.model_product import Product
from schemas.favoris_schema import FavoriteCreate, FavoriteOut

router = APIRouter(prefix="/favorites", tags=["Favorites"])

# -------------------------
# ADD TO FAVORITES
# -------------------------
@router.post("/", response_model=FavoriteOut)
def add_favorite(data: FavoriteCreate, request: Request, db: Session = Depends(get_db)):
    device_id = request.cookies.get("device_id")
    if not device_id:
        raise HTTPException(400, "Device ID cookie missing")

    # Vérifier produit existe
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")

    # Vérifier si déjà existant
    existing = db.query(Favorite).filter(
        Favorite.device_id == device_id,
        Favorite.product_id == data.product_id
    ).first()

    if existing:
        return existing

    fav = Favorite(device_id=device_id, product_id=data.product_id)
    db.add(fav)
    db.commit()
    db.refresh(fav)
    return fav

# -------------------------
# REMOVE FROM FAVORITES
# -------------------------
@router.delete("/{favorite_id}")
def remove_favorite(favorite_id: int, request: Request, db: Session = Depends(get_db)):
    device_id = request.cookies.get("device_id")
    fav = db.query(Favorite).filter(Favorite.id == favorite_id, Favorite.device_id == device_id).first()
    if not fav:
        raise HTTPException(404, "Favorite not found")

    db.delete(fav)
    db.commit()
    return {"message": "Removed from favorites"}

# -------------------------
# LIST FAVORITES BY DEVICE
# -------------------------
@router.get("/", response_model=list[FavoriteOut])
def list_favorites(request: Request, db: Session = Depends(get_db)):
    device_id = request.cookies.get("device_id")
    if not device_id:
        raise HTTPException(400, "Device ID cookie missing")

    return db.query(Favorite).filter(Favorite.device_id == device_id).all()

# -------------------------
# CHECK IF PRODUCT IS FAVORITE
# -------------------------
@router.get("/check/{product_id}")
def is_favorite(product_id: int, request: Request, db: Session = Depends(get_db)):
    device_id = request.cookies.get("device_id")
    if not device_id:
        raise HTTPException(400, "Device ID cookie missing")

    fav = db.query(Favorite).filter(
        Favorite.device_id == device_id,
        Favorite.product_id == product_id
    ).first()

    return {"is_favorite": fav is not None}