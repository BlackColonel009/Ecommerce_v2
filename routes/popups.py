from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from database import get_db
from models.model_marketing import Banner as BannerModel, Popup as PopupModel, Promo as PromoModel
from schemas.marketing_schema import Banner as BannerSchema, Popup as PopupSchema, Promo as PromoSchema
from utils.file_manager import save_upload_file
from routes.auth import get_current_admin

router = APIRouter(prefix="/marketing", tags=["Marketing"])
# -------------------- CREATE POPUP --------------------
@router.post("/popup", response_model=PopupSchema)
def create_popup(
    title: str = Form(...),
    message: str = Form(...),
    is_active: bool = Form(False),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    img_path = save_upload_file(image) if image else None

    popup = PopupModel(
        title=title,
        message=message,
        is_active=is_active,
        image_url=img_path
    )
    db.add(popup)
    db.commit()
    db.refresh(popup)
    return popup


# -------------------- LIST POPUPS --------------------
@router.get("/popup", response_model=List[PopupSchema])
def list_popups(db: Session = Depends(get_db)):
    return db.query(PopupModel).all()


# -------------------- UPDATE POPUP --------------------
@router.put("/popup/{popup_id}", response_model=PopupSchema)
def update_popup(
    popup_id: int,
    title: Optional[str] = Form(None),
    message: Optional[str] = Form(None),
    is_active: Optional[bool] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    popup = db.query(PopupModel).filter(PopupModel.id == popup_id).first()
    if not popup:
        raise HTTPException(status_code=404, detail="Popup not found")

    if title:
        popup.title = title
    if message:
        popup.message = message
    if is_active is not None:
        popup.is_active = is_active
    if image:
        popup.image_url = save_upload_file(image)

    db.commit()
    db.refresh(popup)
    return popup


# -------------------- DELETE POPUP --------------------
@router.delete("/popup/{popup_id}")
def delete_popup(popup_id: int, db: Session = Depends(get_db), admin = Depends(get_current_admin)):
    popup = db.query(PopupModel).filter(PopupModel.id == popup_id).first()
    if not popup:
        raise HTTPException(status_code=404, detail="Popup not found")
    db.delete(popup)
    db.commit()
    return {"message": "Popup deleted successfully"}
