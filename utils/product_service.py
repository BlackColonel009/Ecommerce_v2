from sqlalchemy.orm import Session
from models.model_brands import ProductBrand
from models.model_category import ProductCategory
from models.model_product import Price, Product, ProductColor  # seulement Product

def get_product_with_category(db: Session, product_id: int):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return None
    
    # relation déjà chargée via SQLAlchemy lazy loading
    category = product.category
    return {
        "id": product.id,
        "name": product.name,
        "category": {
            "id": category.id if category else None,
            "name": category.name if category else f"Catégorie #{product.category_id}"
        }
    }
# services/category_service.py

# services/category_service.py

def get_category_with_relations(
    db: Session,
    category_id: int,
    page: int = 1,
    limit: int = 20,
    sort: str = "default",
    brands: list = [],
    colors: list = [],
    min_price: float = None,
    max_price: float = None
):
    category = db.query(ProductCategory).filter(ProductCategory.id == category_id).first()
    if not category:
        return None

    query = db.query(Product).filter(
        Product.category_id == category_id,
        Product.is_deleted == False
    )

    # Filtre par marque (nom)
    if brands:
        query = query.join(Product.brand).filter(ProductBrand.name.in_(brands))

    # Filtre par couleur
    if colors:
        query = query.join(Product.colors).filter(ProductColor.color.in_(colors))

    # Filtre par prix
    if min_price is not None and max_price is not None:
        query = query.join(Product.prices).filter(Price.price.between(min_price, max_price))

    # Tri
    if sort == "price_asc":
        query = query.join(Product.prices).order_by(Price.price.asc())
    elif sort == "price_desc":
        query = query.join(Product.prices).order_by(Price.price.desc())
    elif sort == "rating":
        query = query.order_by(Product.rating.desc())
    else:
        query = query.order_by(Product.created_at.desc())

    total = query.count()
    products = query.offset((page - 1) * limit).limit(limit).all()

    return {
        "id": category.id,
        "name": category.name,
        "description": category.description,
        "category": {
            "id": category.id,
            "name": category.name,
            "slug": category.slug,
            "parent_id": category.parent_id
        },
        "products": [serialize_product(prod) for prod in products],
        "total": total,
        "page": page,
        "limit": limit
    }
    
def products_by_multiple_categories(
    db: Session,
    category_ids: list,
    page: int = 1,
    limit: int = 20,
    sort: str = "default",
    brands: list = None,
    colors: list = None,
    min_price: float = None,
    max_price: float = None
):
    brands = brands or []
    colors = colors or []

    # 🔎 Récupération des catégories
    categories = db.query(ProductCategory)\
        .filter(ProductCategory.id.in_(category_ids))\
        .all()

    if not categories:
        return None

    # 🔥 Query principale
    query = db.query(Product).filter(
        Product.category_id.in_(category_ids),
        Product.is_deleted == False
    )

    # 🔹 Filtre marque
    if brands:
        query = query.join(Product.brand)\
            .filter(ProductBrand.name.in_(brands))

    # 🔹 Filtre couleur
    if colors:
        query = query.join(Product.colors)\
            .filter(ProductColor.color.in_(colors))

    # 🔹 Filtre prix
    if min_price is not None and max_price is not None:
        query = query.join(Product.prices)\
            .filter(Price.price.between(min_price, max_price))

    # 🔹 Tri
    if sort == "price_asc":
        query = query.join(Product.prices).order_by(Price.price.asc())
    elif sort == "price_desc":
        query = query.join(Product.prices).order_by(Price.price.desc())
    elif sort == "rating":
        query = query.order_by(Product.rating.desc())
    else:
        query = query.order_by(Product.created_at.desc())

    total = query.count()
    products = query.offset((page - 1) * limit).limit(limit).all()

    return {
        "categories": [
            {
                "id": cat.id,
                "name": cat.name,
                "slug": cat.slug,
                "parent_id": cat.parent_id
            }
            for cat in categories
        ],
        "products": [serialize_product(prod) for prod in products],
        "total": total,
        "page": page,
        "limit": limit
    }

    
def serialize_product(product):
    return {
        "id": product.id,
        "name": product.name,
        "slug": product.slug,
        "description": product.description,
        "category": {
            "id": product.category.id if product.category else product.category_id,
            "name": product.category.name if product.category else None,
            "slug": product.category.slug if product.category else None,
            "parent_id": product.category.parent_id if product.category else None
        } if product.category else None,
        "brand": {
            "name": product.brand.name if product.brand else None
        },
        "rating": product.rating,
        "is_deleted": product.is_deleted,
        "images": [
            {"id": img.id, "image_url": img.image_url, "is_main": getattr(img, "is_main", False)}
            for img in product.images
        ],
        "specs": [
            {"id": spec.id, "key": spec.key, "value": spec.value}
            for spec in product.specs
        ],
        "prices": [
            {"id": price.id, "price": price.price, "currency": price.currency}
            for price in product.prices
        ],
        "inventory": {
            "id": product.inventory.id,
            "quantity": product.inventory.quantity
        } if product.inventory else None,
        "colors": [
            {"id": color.id, "color": color.color}
            for color in product.colors
        ],
        "reviews": [
            {"id": review.id, "rating": review.rating, "comment": review.comment, "created_at": review.created_at}
            for review in product.reviews
        ],
        "accessories": []
    }