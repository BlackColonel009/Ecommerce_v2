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


# -------------------- CREATE BANNER --------------------
@router.post("/banner", response_model=BannerSchema)
def create_banner(
    title: str = Form(...),
    link: Optional[str] = Form(None),
    position: str = Form("homepage"),
    order: int = Form(0),
    is_active: bool = Form(True),
    start_date: Optional[str] = Form(None),
    end_date: Optional[str] = Form(None),

    image: UploadFile = File(...),
    image_mobile: Optional[UploadFile] = File(None),

    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    file_path = save_upload_file(image)
    mobile_path = save_upload_file(image_mobile) if image_mobile else None

    banner = BannerModel(
        title=title,
        link=link,
        position=position,
        order=order,
        is_active=is_active,
        start_date=start_date,
        end_date=end_date,
        image_url=file_path,
        image_mobile_url=mobile_path
    )
    db.add(banner)
    db.commit()
    db.refresh(banner)
    return banner



# -------------------- LIST BANNERS --------------------
@router.get("/banner", response_model=List[BannerSchema])
def list_banners(db: Session = Depends(get_db)):
    return db.query(BannerModel).all()


# -------------------- UPDATE BANNER --------------------
@router.put("/banner/{banner_id}", response_model=BannerSchema)
def update_banner(
    banner_id: int,
    title: Optional[str] = Form(None),
    link: Optional[str] = Form(None),
    position: Optional[str] = Form(None),
    order: Optional[int] = Form(None),
    is_active: Optional[bool] = Form(None),
    start_date: Optional[str] = Form(None),
    end_date: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    image_mobile: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    banner = db.query(BannerModel).filter(BannerModel.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")

    if title: banner.title = title
    if link: banner.link = link
    if position: banner.position = position
    if order is not None: banner.order = order
    if is_active is not None: banner.is_active = is_active
    if start_date: banner.start_date = datetime.fromisoformat(start_date)
    if end_date: banner.end_date = datetime.fromisoformat(end_date)
    if image: banner.image_url = save_upload_file(image)
    if image_mobile: banner.image_mobile_url = save_upload_file(image_mobile)

    db.commit()
    db.refresh(banner)
    return banner



# -------------------- DELETE BANNER --------------------
@router.delete("/banner/{banner_id}")
def delete_banner(banner_id: int, db: Session = Depends(get_db), admin = Depends(get_current_admin)):
    banner = db.query(BannerModel).filter(BannerModel.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    db.delete(banner)
    db.commit()
    return {"message": "Banner deleted successfully"}
