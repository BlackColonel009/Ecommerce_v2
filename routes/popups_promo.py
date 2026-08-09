from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from database import get_db
from models.model_popoups_promo import PopupModel
from schemas.popups_promo_schema import PopupOut
from utils.file_manager import save_upload_file
from routes.auth import get_current_admin


router = APIRouter(prefix="/popup", tags=["Popups & Promotions"])

@router.post("/", response_model=PopupOut)
def create_popup(
    title: str = Form(...),
    message: str = Form(...),

    cta_text: Optional[str] = Form(None),
    cta_link: Optional[str] = Form(None),

    trigger: str = Form("on_load"),
    delay_seconds: Optional[int] = Form(None),

    is_active: bool = Form(True),
    start_date: Optional[datetime] = Form(None),
    end_date: Optional[datetime] = Form(None),

    image: UploadFile = File(...),

    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    image_path = save_upload_file(image)

    popup = PopupModel(
        title=title,
        message=message,
        image_url=image_path,
        cta_text=cta_text,
        cta_link=cta_link,
        trigger=trigger,
        delay_seconds=delay_seconds,
        is_active=is_active,
        start_date=start_date,
        end_date=end_date
    )

    db.add(popup)
    db.commit()
    db.refresh(popup)
    return popup

@router.get("/", response_model=List[PopupOut])
def get_popups(
    db: Session = Depends(get_db),
    # admin = Depends(get_current_admin)
):
    return db.query(PopupModel).order_by(PopupModel.created_at.desc()).all()

@router.put("/{popup_id}", response_model=PopupOut)
def update_popup(
    popup_id: int,

    title: Optional[str] = Form(None),
    message: Optional[str] = Form(None),

    cta_text: Optional[str] = Form(None),
    cta_link: Optional[str] = Form(None),

    trigger: Optional[str] = Form(None),
    delay_seconds: Optional[int] = Form(None),

    is_active: Optional[bool] = Form(None),
    start_date: Optional[datetime] = Form(None),
    end_date: Optional[datetime] = Form(None),

    image: Optional[UploadFile] = File(None),

    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    popup = db.query(PopupModel).filter(PopupModel.id == popup_id).first()
    if not popup:
        raise HTTPException(status_code=404, detail="Popup not found")

    if title is not None:
        popup.title = title
    if message is not None:
        popup.message = message
    if cta_text is not None:
        popup.cta_text = cta_text
    if cta_link is not None:
        popup.cta_link = cta_link
    if trigger is not None:
        popup.trigger = trigger
    if delay_seconds is not None:
        popup.delay_seconds = delay_seconds
    if is_active is not None:
        popup.is_active = is_active
    if start_date is not None:
        popup.start_date = start_date
    if end_date is not None:
        popup.end_date = end_date
    if image:
        popup.image_url = save_upload_file(image)

    db.commit()
    db.refresh(popup)
    return popup

@router.delete("/{popup_id}")
def delete_popup(
    popup_id: int,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    popup = db.query(PopupModel).filter(PopupModel.id == popup_id).first()
    if not popup:
        raise HTTPException(status_code=404, detail="Popup not found")

    db.delete(popup)
    db.commit()
    return {"message": "Popup supprimé avec succès"}


@router.get("/{popup_id}", response_model=PopupOut)
def get_popup(
    popup_id: int,
    db: Session = Depends(get_db),
    # admin = Depends(get_current_admin)  # tu peux remettre si tu veux sécuriser
):
    popup = db.query(PopupModel).filter(PopupModel.id == popup_id).first()
    if not popup:
        raise HTTPException(status_code=404, detail="Popup not found")
    return popup