from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.model_recent import RecentView
from models.model_product import Product
from schemas.recent_schema import RecentCreate, RecentOut
from sqlalchemy import desc
from routes.auth import get_current_admin

router = APIRouter(prefix="/recent", tags=["Recent Views"])


# -----------------------------------
# ADD RECENT VIEW
# -----------------------------------
from fastapi import Request

@router.post("/", response_model=RecentOut)
def add_recent(data: RecentCreate, request: Request, db: Session = Depends(get_db)):
    device_id = request.cookies.get("device_id")
    if not device_id:
        raise HTTPException(400, "Device ID manquant")

    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")

    # Vérifier si déjà vu
    existing = db.query(RecentView).filter(
        RecentView.device_id == device_id,
        RecentView.product_id == data.product_id
    ).first()

    if existing:
        existing.viewed_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing

    # Créer nouvelle vue
    item = RecentView(
        device_id=device_id,
        product_id=data.product_id
    )
    db.add(item)
    db.commit()

    # Limiter à 20 produits
    items = db.query(RecentView).filter(
        RecentView.device_id == device_id
    ).order_by(desc(RecentView.viewed_at)).all()

    if len(items) > 20:
        for old in items[20:]:
            db.delete(old)
        db.commit()

    db.refresh(item)
    return item

# -----------------------------------
# LIST RECENT PRODUCTS
# -----------------------------------
@router.get("/", response_model=list[RecentOut])
def list_recent(request: Request, db: Session = Depends(get_db)):
    device_id = request.cookies.get("device_id")
    if not device_id:
        raise HTTPException(400, "Device ID manquant")

    return db.query(RecentView).filter(
        RecentView.device_id == device_id
    ).order_by(desc(RecentView.viewed_at)).all()
# -----------------------------------
# LIST ALL DEVICES AND THEIR RECENT PRODUCTS
# -----------------------------------
from sqlalchemy.orm import joinedload

@router.get("/all-devices", response_model=dict)
def list_all_devices(db: Session = Depends(get_db), _admin = Depends(get_current_admin)):
    """
    Retourne un dictionnaire { device_id: [products] }
    """
    # On récupère tous les récents avec le produit lié
    recents = db.query(RecentView).options(joinedload(RecentView.product)).order_by(desc(RecentView.viewed_at)).all()

    result = {}
    for r in recents:
        if r.device_id not in result:
            result[r.device_id] = []
        # tu peux adapter ce que tu veux renvoyer pour chaque produit
        result[r.device_id].append({
            "product_id": r.product.id,
            "name": r.product.name,
            "slug": r.product.slug,
            "viewed_at": r.viewed_at
        })

    return result
