import math
import re
import unicodedata
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from PIL import Image, ImageOps, UnidentifiedImageError

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
from models.model_blog import BlogPost
from routes.auth import get_current_admin, has_permission
from schemas.blog_schema import BlogPostList, BlogPostOut, BlogTaxonomy


router = APIRouter(prefix="/blog", tags=["Blog"])
BLOG_UPLOAD_DIR = Path("uploads/blog")
DEFAULT_COVER = "/static/img/Banniere/tech2.jpg"
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
VALID_STATUSES = {"draft", "published", "archived"}


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-") or "article"


def unique_slug(db: Session, title: str, requested_slug: Optional[str] = None, post_id: Optional[int] = None) -> str:
    base = slugify(requested_slug or title)
    candidate = base
    index = 2
    while True:
        query = db.query(BlogPost).filter(BlogPost.slug == candidate)
        if post_id is not None:
            query = query.filter(BlogPost.id != post_id)
        if not query.first():
            return candidate
        candidate = f"{base}-{index}"
        index += 1


def normalize_csv(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    unique_values = []
    for item in value.split(","):
        clean = item.strip()
        if clean and clean.casefold() not in {existing.casefold() for existing in unique_values}:
            unique_values.append(clean)
    return ",".join(unique_values) or None


def save_cover(image: Optional[UploadFile]) -> Optional[str]:
    if not image or not image.filename:
        return None
    extension = Path(image.filename).suffix.lower()
    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="L’image doit être au format JPG, PNG, WEBP ou GIF")
    content = image.file.read()
    if not content or len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="L’image est vide ou dépasse 15 Mo")
    BLOG_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    destination = BLOG_UPLOAD_DIR / f"{uuid.uuid4().hex}.webp"
    try:
        from io import BytesIO
        with Image.open(BytesIO(content)) as source:
            optimized = ImageOps.exif_transpose(source)
            optimized.thumbnail((1800, 1200), Image.Resampling.LANCZOS)
            if optimized.mode not in {"RGB", "RGBA"}:
                optimized = optimized.convert("RGBA" if "transparency" in optimized.info else "RGB")
            optimized.save(destination, "WEBP", quality=82, method=6, optimize=True)
    except (UnidentifiedImageError, OSError, ValueError) as error:
        raise HTTPException(status_code=400, detail="Le fichier envoyé n’est pas une image valide") from error
    return destination.as_posix()


def validate_status(status: str) -> str:
    normalized = status.strip().lower()
    if normalized not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Statut invalide")
    return normalized


def apply_public_filters(query, q: Optional[str], category: Optional[str], tag: Optional[str]):
    now = datetime.now(timezone.utc)
    query = query.filter(
        BlogPost.status == "published",
        or_(BlogPost.published_at.is_(None), BlogPost.published_at <= now),
    )
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(or_(BlogPost.title.ilike(pattern), BlogPost.excerpt.ilike(pattern), BlogPost.content.ilike(pattern)))
    if category:
        query = query.filter(BlogPost.category.ilike(category.strip()))
    if tag:
        query = query.filter(BlogPost.tags.ilike(f"%{tag.strip()}%"))
    return query


@router.get("/", response_model=BlogPostList)
def list_public_posts(
    page: int = Query(1, ge=1),
    limit: int = Query(9, ge=1, le=50),
    q: Optional[str] = None,
    category: Optional[str] = None,
    tag: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = apply_public_filters(db.query(BlogPost), q, category, tag)
    total = query.count()
    posts = query.order_by(BlogPost.is_featured.desc(), BlogPost.published_at.desc(), BlogPost.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {"data": posts, "total": total, "page": page, "limit": limit, "pages": max(1, math.ceil(total / limit))}


@router.get("/taxonomy", response_model=BlogTaxonomy)
def blog_taxonomy(db: Session = Depends(get_db)):
    posts = apply_public_filters(db.query(BlogPost), None, None, None).all()
    categories = sorted({post.category for post in posts if post.category})
    tags = sorted({tag for post in posts for tag in post.tag_list}, key=str.casefold)
    return {"categories": categories, "tags": tags}


@router.get("/latest", response_model=list[BlogPostOut])
def latest_posts(limit: int = Query(4, ge=1, le=12), db: Session = Depends(get_db)):
    return apply_public_filters(db.query(BlogPost), None, None, None).order_by(BlogPost.published_at.desc(), BlogPost.created_at.desc()).limit(limit).all()


@router.get("/article/{slug}", response_model=BlogPostOut)
def public_post(slug: str, db: Session = Depends(get_db)):
    post = apply_public_filters(db.query(BlogPost), None, None, None).filter(BlogPost.slug == slug).first()
    if not post:
        raise HTTPException(status_code=404, detail="Article introuvable")
    return post


@router.get("/admin/all", response_model=BlogPostList)
def admin_posts(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin), _permitted=Depends(has_permission("manage_products")),
):
    query = db.query(BlogPost)
    if status:
        query = query.filter(BlogPost.status == validate_status(status))
    if q:
        query = query.filter(BlogPost.title.ilike(f"%{q.strip()}%"))
    total = query.count()
    posts = query.order_by(BlogPost.updated_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {"data": posts, "total": total, "page": page, "limit": limit, "pages": max(1, math.ceil(total / limit))}


@router.post("/admin", response_model=BlogPostOut, status_code=201)
def create_post(
    title: str = Form(...),
    content: str = Form(...),
    excerpt: Optional[str] = Form(None),
    slug: Optional[str] = Form(None),
    category: str = Form("Conseils"),
    tags: Optional[str] = Form(None),
    status: str = Form("draft"),
    is_featured: bool = Form(False),
    image_alt: Optional[str] = Form(None),
    seo_title: Optional[str] = Form(None),
    seo_description: Optional[str] = Form(None),
    canonical_url: Optional[str] = Form(None),
    related_product_slugs: Optional[str] = Form(None),
    published_at: Optional[datetime] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin), _permitted=Depends(has_permission("manage_products")),
):
    if len(title.strip()) < 4:
        raise HTTPException(status_code=400, detail="Le titre doit contenir au moins 4 caractères")
    if len(content.strip()) < 20:
        raise HTTPException(status_code=400, detail="Le contenu doit contenir au moins 20 caractères")
    normalized_status = validate_status(status)
    post = BlogPost(
        title=title.strip(), slug=unique_slug(db, title, slug), content=content.strip(),
        excerpt=(excerpt or content[:220]).strip(), cover_image=save_cover(image) or DEFAULT_COVER,
        image_alt=(image_alt or title).strip(), category=category.strip() or "Conseils",
        tags=normalize_csv(tags), status=normalized_status, is_featured=is_featured,
        seo_title=(seo_title or title[:70]).strip(), seo_description=(seo_description or excerpt or content[:160]).strip()[:170],
        canonical_url=canonical_url.strip() if canonical_url else None,
        related_product_slugs=normalize_csv(related_product_slugs), author_id=admin.id,
        published_at=published_at or (datetime.now(timezone.utc) if normalized_status == "published" else None),
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.put("/admin/{post_id}", response_model=BlogPostOut)
def update_post(
    post_id: int,
    title: str = Form(...), content: str = Form(...), excerpt: Optional[str] = Form(None),
    slug: Optional[str] = Form(None), category: str = Form("Conseils"), tags: Optional[str] = Form(None),
    status: str = Form("draft"), is_featured: bool = Form(False), image_alt: Optional[str] = Form(None),
    seo_title: Optional[str] = Form(None), seo_description: Optional[str] = Form(None),
    canonical_url: Optional[str] = Form(None), related_product_slugs: Optional[str] = Form(None),
    published_at: Optional[datetime] = Form(None), image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db), _admin=Depends(get_current_admin), _permitted=Depends(has_permission("manage_products")),
):
    post = db.get(BlogPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Article introuvable")
    if len(title.strip()) < 4:
        raise HTTPException(status_code=400, detail="Le titre doit contenir au moins 4 caractères")
    if len(content.strip()) < 20:
        raise HTTPException(status_code=400, detail="Le contenu doit contenir au moins 20 caractères")
    normalized_status = validate_status(status)
    post.title = title.strip()
    post.slug = unique_slug(db, title, slug, post_id)
    post.content = content.strip()
    post.excerpt = (excerpt or content[:220]).strip()
    post.category = category.strip() or "Conseils"
    post.tags = normalize_csv(tags)
    post.status = normalized_status
    post.is_featured = is_featured
    post.image_alt = (image_alt or title).strip()
    post.seo_title = (seo_title or title[:70]).strip()
    post.seo_description = (seo_description or excerpt or content[:160]).strip()[:170]
    post.canonical_url = canonical_url.strip() if canonical_url else None
    post.related_product_slugs = normalize_csv(related_product_slugs)
    if image and image.filename:
        post.cover_image = save_cover(image)
    if published_at:
        post.published_at = published_at
    elif normalized_status == "published" and not post.published_at:
        post.published_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(post)
    return post


@router.delete("/admin/{post_id}")
def delete_post(post_id: int, db: Session = Depends(get_db), _admin=Depends(get_current_admin), _permitted=Depends(has_permission("manage_products"))):
    post = db.get(BlogPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Article introuvable")
    db.delete(post)
    db.commit()
    return {"message": "Article supprimé"}
