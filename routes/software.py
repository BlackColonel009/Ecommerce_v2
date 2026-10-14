import re
import unicodedata
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy.orm import Session

from database import get_db
from models.model_software import Software
from routes.auth import get_current_admin, has_permission
from schemas.software_schema import SoftwareList, SoftwareOut

router = APIRouter(prefix="/software", tags=["Logiciels"])
UPLOAD_DIR = Path("uploads/software")
VALID_STATUSES = {"draft", "published", "archived"}


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "logiciel"


def unique_slug(db: Session, value: str, requested: Optional[str] = None, item_id: Optional[int] = None) -> str:
    base, candidate, suffix = slugify(requested or value), slugify(requested or value), 2
    while True:
        query = db.query(Software).filter(Software.slug == candidate)
        if item_id:
            query = query.filter(Software.id != item_id)
        if not query.first():
            return candidate
        candidate, suffix = f"{base}-{suffix}", suffix + 1


def status_value(value: str) -> str:
    value = (value or "draft").strip().lower()
    if value not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Statut invalide")
    return value


def save_image(image: Optional[UploadFile]) -> Optional[str]:
    if not image or not image.filename:
        return None
    if Path(image.filename).suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        raise HTTPException(status_code=400, detail="Utilisez une image JPG, PNG, WEBP ou GIF")
    content = image.file.read()
    if not content or len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image vide ou supérieure à 15 Mo")
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    target = UPLOAD_DIR / f"{uuid.uuid4().hex}.webp"
    try:
        from io import BytesIO
        with Image.open(BytesIO(content)) as source:
            optimized = ImageOps.exif_transpose(source)
            optimized.thumbnail((1600, 1200), Image.Resampling.LANCZOS)
            if optimized.mode not in {"RGB", "RGBA"}:
                optimized = optimized.convert("RGBA" if "transparency" in optimized.info else "RGB")
            optimized.save(target, "WEBP", quality=84, method=6, optimize=True)
    except (UnidentifiedImageError, OSError, ValueError) as error:
        raise HTTPException(status_code=400, detail="Le fichier n’est pas une image valide") from error
    return target.as_posix()


def assign(item: Software, *, name: str, slug: Optional[str], badge: str, short_description: Optional[str], description: Optional[str], features: Optional[str], platforms: Optional[str], image_alt: Optional[str], discover_url: Optional[str], trial_url: Optional[str], download_url: Optional[str], status: str, sort_order: int, db: Session):
    if len(name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Le nom du logiciel doit contenir au moins 2 caractères")
    item.name = name.strip()
    item.slug = unique_slug(db, name, slug, item.id)
    item.badge = (badge or "Logiciel").strip()[:60]
    item.short_description = short_description.strip() if short_description else None
    item.description = description.strip() if description else None
    item.features = features.strip() if features else None
    item.platforms = platforms.strip() if platforms else None
    item.image_alt = (image_alt or name).strip()[:255]
    item.discover_url = discover_url.strip() if discover_url else None
    item.trial_url = trial_url.strip() if trial_url else None
    item.download_url = download_url.strip() if download_url else None
    item.status = status_value(status)
    item.sort_order = max(0, sort_order or 0)


@router.get("/", response_model=list[SoftwareOut])
def list_public(db: Session = Depends(get_db)):
    return db.query(Software).filter(Software.status == "published").order_by(Software.sort_order, Software.name).all()


@router.get("/admin/all", response_model=SoftwareList)
def list_admin(db: Session = Depends(get_db), _admin=Depends(get_current_admin), _permitted=Depends(has_permission("manage_products"))):
    items = db.query(Software).order_by(Software.sort_order, Software.updated_at.desc()).all()
    return {"data": items, "total": len(items)}


@router.post("/admin", response_model=SoftwareOut, status_code=201)
def create_software(name: str = Form(...), slug: Optional[str] = Form(None), badge: str = Form("Logiciel"), short_description: Optional[str] = Form(None), description: Optional[str] = Form(None), features: Optional[str] = Form(None), platforms: Optional[str] = Form(None), image_alt: Optional[str] = Form(None), discover_url: Optional[str] = Form(None), trial_url: Optional[str] = Form(None), download_url: Optional[str] = Form(None), status: str = Form("draft"), sort_order: int = Form(0), image: Optional[UploadFile] = File(None), db: Session = Depends(get_db), _admin=Depends(get_current_admin), _permitted=Depends(has_permission("manage_products"))):
    item = Software()
    assign(item, name=name, slug=slug, badge=badge, short_description=short_description, description=description, features=features, platforms=platforms, image_alt=image_alt, discover_url=discover_url, trial_url=trial_url, download_url=download_url, status=status, sort_order=sort_order, db=db)
    item.image_url = save_image(image)
    db.add(item); db.commit(); db.refresh(item)
    return item


@router.put("/admin/{software_id}", response_model=SoftwareOut)
def update_software(software_id: int, name: str = Form(...), slug: Optional[str] = Form(None), badge: str = Form("Logiciel"), short_description: Optional[str] = Form(None), description: Optional[str] = Form(None), features: Optional[str] = Form(None), platforms: Optional[str] = Form(None), image_alt: Optional[str] = Form(None), discover_url: Optional[str] = Form(None), trial_url: Optional[str] = Form(None), download_url: Optional[str] = Form(None), status: str = Form("draft"), sort_order: int = Form(0), image: Optional[UploadFile] = File(None), db: Session = Depends(get_db), _admin=Depends(get_current_admin), _permitted=Depends(has_permission("manage_products"))):
    item = db.get(Software, software_id)
    if not item:
        raise HTTPException(status_code=404, detail="Logiciel introuvable")
    assign(item, name=name, slug=slug, badge=badge, short_description=short_description, description=description, features=features, platforms=platforms, image_alt=image_alt, discover_url=discover_url, trial_url=trial_url, download_url=download_url, status=status, sort_order=sort_order, db=db)
    uploaded = save_image(image)
    if uploaded:
        item.image_url = uploaded
    db.commit(); db.refresh(item)
    return item


@router.delete("/admin/{software_id}")
def delete_software(software_id: int, db: Session = Depends(get_db), _admin=Depends(get_current_admin), _permitted=Depends(has_permission("manage_products"))):
    item = db.get(Software, software_id)
    if not item:
        raise HTTPException(status_code=404, detail="Logiciel introuvable")
    db.delete(item); db.commit()
    return {"message": "Logiciel supprimé"}
