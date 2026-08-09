from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import selectinload
import re
from sqlalchemy.orm import Session
from database import get_db
from schemas.category_schema import CategoryCreate, Category
from models.model_category import ProductCategory as CategoryModel
from models.model_product import Product
from typing import List
from schemas.product_schema import  ProductSchema
from sqlalchemy.sql import func

from utils.file_manager import save_upload_file
from utils.product_service import get_category_with_relations, products_by_multiple_categories
from routes.auth import get_current_admin


router = APIRouter(prefix="/categories", tags=["Categories"])


# -------------------- Create Category --------------------
def slugify(text: str) -> str:
    """
    Transforme un texte en slug :
    - minuscules
    - espaces -> tirets
    - caractères spéciaux supprimés
    """
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)  # supprime tout sauf lettres, chiffres, espace et tiret
    text = re.sub(r"[\s_-]+", "-", text)  # remplace espaces/underscores multiples par un tiret
    text = re.sub(r"^-+|-+$", "", text)   # supprime tirets en début/fin
    return text

@router.post("/", response_model=Category)
def create_category(
    name: str = Form(...),
    slug: str | None = Form(None),
    parent_id: int | None = Form(None),
    image: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    _admin = Depends(get_current_admin)
):
    # Vérifier si la catégorie existe déjà
    existing = db.query(CategoryModel).filter(CategoryModel.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")

    # Générer le slug automatiquement
    slug = slug if slug else slugify(name)

    # Sauvegarde de l'image si présente
    image_url = None
    if image:
        image_url = save_upload_file(image)  # ✅ utilise ton utilitaire

    # Créer la catégorie
    category = CategoryModel(
        name=name,
        slug=slug,
        parent_id=parent_id,
        image_url=image_url
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


from fastapi import UploadFile, File, Form

@router.put("/{category_id}", response_model=Category)
def update_category(
    category_id: int,
    name: str = Form(None),
    slug: str = Form(None),
    parent_id: int | None = Form(None),
    image: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    _admin = Depends(get_current_admin)
):
    category = db.query(CategoryModel).filter(CategoryModel.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Mise à jour des champs
    if name:
        category.name = name
        # si slug non fourni, on régénère automatiquement
        category.slug = slug or slugify(name)
    elif slug:
        category.slug = slug

    if parent_id is not None:
        category.parent_id = parent_id

    # Mise à jour de l'image si upload
    if image:
        image_url = save_upload_file(image)
        category.image_url = image_url

    db.commit()
    db.refresh(category)
    return category


# -------------------- List Categories --------------------
@router.get("/", response_model=list[Category])
def get_categories(db: Session = Depends(get_db)):
    return db.query(CategoryModel).all()




# -------------------- Get Brand by ID --------------------
@router.get("/category/{slug}", response_model=List[ProductSchema])
def products_by_category(slug: str, db: Session = Depends(get_db)):
    return (
        db.query(Product)
        .join(Product.category)  # relation ORM
        .filter(
            CategoryModel.slug == slug,  # utiliser le modèle SQLAlchemy, pas le Pydantic
            Product.is_deleted == False
        )
        .all()
    )

from fastapi import Query

from sqlalchemy import select

@router.get("/accessories", response_model=List[ProductSchema])
def accessories_products(
    parent_slug: str = Query(...),
    limit: int = Query(3, ge=1),
    db: Session = Depends(get_db)
):
    # 1. Trouver la catégorie
    category = db.query(CategoryModel).filter(CategoryModel.slug == parent_slug).first()
    if not category:
        raise HTTPException(404, "Catégorie non trouvée")

    # 2. Récupérer les produits de la catégorie parente
    products = (
        db.query(Product)
        .filter(
            Product.category_id == category.parent_id, 
            Product.is_deleted == False
        )
        .order_by(func.random())
        .limit(limit)
        .all()
    )
    
    return products

@router.get("/cat_in_cat/{slug}")
def read_category_by_slug(
    slug: str,
    page: int = 1,
    limit: int = 20,
    sort: str = "default",
    brands: str = None,
    colors: str = None,
    minPrice: float = None,
    maxPrice: float = None,
    db: Session = Depends(get_db)
):
    # 🔥 transformer en liste
    slug_list = slug.split(",")

    categories = db.query(CategoryModel)\
        .filter(CategoryModel.slug.in_(slug_list))\
        .all()

    if not categories:
        raise HTTPException(status_code=404, detail="Catégories introuvables")

    category_ids = [c.id for c in categories]

    return products_by_multiple_categories(
        db,
        category_ids=category_ids,
        page=page,
        limit=limit,
        sort=sort,
        brands=brands.split(",") if brands else [],
        colors=colors.split(",") if colors else [],
        min_price=minPrice,
        max_price=maxPrice
    )




@router.get("/{id}")
def read_category(
    id: int,
    page: int = 1,
    limit: int = 20,
    sort: str = "default",
    brands: str = None,
    colors: str = None,
    minPrice: float = None,
    maxPrice: float = None,
    db: Session = Depends(get_db)
):
    
    
    category_data = get_category_with_relations(
        db,
        id,
        page=page,
        limit=limit,
        sort=sort,
        brands=brands.split(",") if brands else [],
        colors=colors.split(",") if colors else [],
        min_price=minPrice,
        max_price=maxPrice
    )
    if not category_data:
        raise HTTPException(status_code=404, detail="Catégorie introuvable")
    return category_data





@router.delete("/{category_id}", response_model=dict)
def delete_category(category_id: int, db: Session = Depends(get_db), _admin = Depends(get_current_admin)):
    category = db.query(CategoryModel).filter(CategoryModel.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    db.delete(category)
    db.commit()
    return {"message": f"Category {category_id} deleted successfully"}
    
# ******************* Accesoire sous catégorie *****************

# GET /products/accessories?parent_slug=accessoire&limit=3



