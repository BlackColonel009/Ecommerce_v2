from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.model_favoris_compare import CompareItem
from models.model_product import Product
from schemas.compare_schema import CompareCreate, CompareOut

router = APIRouter(prefix="/compare", tags=["Compare"])


# -------------------------
# ADD PRODUCT TO COMPARE
# -------------------------
@router.post("/", response_model=CompareOut)
def add_compare(data: CompareCreate, db: Session = Depends(get_db)):

    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")

    # limite à 4 produits
    count = db.query(CompareItem).filter(CompareItem.device_id == data.device_id).count()
    if count >= 4:
        raise HTTPException(400, "Max 4 items in comparison list")

    # éviter doublon
    existing = db.query(CompareItem).filter(
        CompareItem.device_id == data.device_id,
        CompareItem.product_id == data.product_id
    ).first()

    if existing:
        return existing

    item = CompareItem(device_id=data.device_id, product_id=data.product_id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


# -------------------------
# REMOVE FROM COMPARE
# -------------------------
@router.delete("/{compare_id}")
def remove_compare(compare_id: int, db: Session = Depends(get_db)):
    item = db.query(CompareItem).filter(CompareItem.id == compare_id).first()
    if not item:
        raise HTTPException(404, "Compare item not found")

    db.delete(item)
    db.commit()
    return {"message": "Removed from compare list"}


# -------------------------
# LIST COMPARE ITEMS
# -------------------------
@router.get("/{device_id}", response_model=list[CompareOut])
def list_compare(device_id: str, db: Session = Depends(get_db)):
    return db.query(CompareItem).filter(CompareItem.device_id == device_id).all()
