from datetime import datetime
import re
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import json
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models.model_cart import CartItem
from models.model_marketing import Promo, PromoType
from models.model_product import Inventory, Price, Product, ProductColor, ProductImage, ProductSpec, ProductVariant
from models.model_marketing import Banner as BannerModel, Popup as PopupModel, Promo as PromoModel
from models.model_product import Product as ProductModel
from models.model_brands import ProductBrand as Brand
from models.model_category import ProductCategory as CategoryModel
from utils.file_manager import save_upload_file
from routes.auth import get_current_admin
from schemas.product_schema import ProductSchema as ProductSchema, ProductColorSchema, ProductWithPromoSchema
from fastapi import Query

router = APIRouter(prefix="/products", tags=["Products"])

def generate_slug(name):
        """Génère un slug à partir du nom du produit"""
        # Convertit en minuscules, remplace les espaces par des tirets
        slug = re.sub(r'[^\w\s-]', '', name.lower())
        slug = re.sub(r'[-\s]+', '-', slug)
        return slug


def default_product_image_for_category(category_slug: str) -> str:
    """Retourne une illustration locale cohérente quand aucun fichier n'est envoyé."""
    slug = (category_slug or "").strip().lower()

    if "occas" in slug:
        if "laptop" in slug:
            profile = "laptop"
        elif "desktop" in slug:
            profile = "desktop"
        elif "smartphone" in slug:
            profile = "phone"
        else:
            profile = "display"
    elif slug.startswith("laptop"):
        profile = "laptop"
    elif slug.startswith("desktop"):
        profile = "desktop"
    elif slug in {"ecran", "smart-tv", "projecteur", "video-accesoires-o-v"}:
        profile = "display"
    elif slug in {"imprimante", "jet-encre", "scanner", "copieur", "toner", "encre", "toner-encre"}:
        profile = "printer"
    elif slug.startswith("camera"):
        profile = "camera"
    elif slug in {"audio", "speaker", "headphone", "accesoires-o-v"}:
        profile = "audio"
    elif slug.startswith("smartphones"):
        profile = "phone"
    elif slug.startswith("tablettes"):
        profile = "tablet"
    elif "gaming" in slug or slug in {"games", "consoles", "consoles-accesoires", "console-accesoires"}:
        profile = "gaming"
    elif slug.startswith("montres"):
        profile = "watch"
    elif slug in {"office", "windows", "licence-num-office", "licence-num-windows"}:
        profile = "software"
    elif slug in {"pieces", "memoire", "disque", "carte-m", "processeur", "boitier-pc", "refroidisseur", "graphique", "accesoires-pc"}:
        profile = "component"
    elif slug in {"resaux", "reseaux", "switch", "routeur", "accessoires-reseaux", "adaptateur-wifi"}:
        profile = "network"
    elif slug in {"batterie", "onduleurs", "batterie-onduleurs", "alimentation", "chargeurs-pc"}:
        profile = "power"
    else:
        profile = "accessory"

    return f"uploads/products/demo-placeholders/demo-{profile}.webp"


def generate_sku(product_slug, attributes, index=None):
    """Génère un SKU unique à partir des caractéristiques"""
    base = product_slug.upper().replace('-', '')
    
    # Extraire les valeurs importantes
    ram = attributes.get('ram', '').replace('GB', '').strip()
    storage = attributes.get('storage', '').replace(' ', '').replace('GB', '').replace('TB', 'T')[:3]
    
    # ✅ NOUVEAU : Ajouter le processeur pour éviter les doublons
    processor = attributes.get('processor', '').replace(' ', '').replace('-', '')[:3]  # Prend les 3 premiers caractères
    
    # Construire le SKU de base
    sku_parts = [base]
    if ram:
        sku_parts.append(f"R{ram}")
    if storage:
        sku_parts.append(f"S{storage}")
    if processor:
        sku_parts.append(processor.upper())  # Ajoute le processeur (ex: I5, I7, RYZ)
    
    sku = '-'.join(sku_parts)
    
    # ✅ Si le SKU existe déjà, ajouter un suffixe numérique
    # Cette partie sera utilisée dans la route, pas ici
    # sku = f"{sku}-{int(time.time())}"
    
    return sku

# Dans ta route


@router.post("/")
async def create_product(
    # Informations de base
    name: str = Form(...),
    slug: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    category_id: int = Form(...),
    brand_id: int = Form(...),
    rating: Optional[float] = Form(0.0),
    
    # Specs et couleurs
    specs: Optional[List[str]] = Form(None),
    color: Optional[List[str]] = Form(None),
    
    # ✅ NOUVEAU : Gestion des variantes avec prix d'affichage
    variants_data: Optional[str] = Form(None),      # JSON des variantes
    display_price: Optional[float] = Form(None),    # Prix à afficher
    currency: str = Form("XOF"),
    
    # Anciens champs (compatibilité)
    prices: Optional[List[float]] = Form(None),
    stock: int = Form(0),
    
    # Images
    images: Optional[List[UploadFile]] = File(None),
    
    db: Session = Depends(get_db),
    _admin = Depends(get_current_admin)
):
    try:
        name = name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Le nom du produit est obligatoire")
        if rating is not None and not 0 <= rating <= 5:
            raise HTTPException(status_code=400, detail="La note du produit doit être comprise entre 0 et 5")
        category = db.get(CategoryModel, category_id)
        if not category:
            raise HTTPException(status_code=400, detail="La catégorie sélectionnée n'existe pas")
        if not db.get(Brand, brand_id):
            raise HTTPException(status_code=400, detail="La marque sélectionnée n'existe pas")

        # Générer le slug si non fourni
        slug = slug.strip() if slug and slug.strip() else generate_slug(name)
        existing_slug = db.query(Product).filter(Product.slug == slug).first()
        if existing_slug:
            raise HTTPException(status_code=409, detail=f"Le slug '{slug}' est déjà utilisé par un autre produit")
        
        # ✅ NETTOYER LA DESCRIPTION (garder les accents, les %, les retours à la ligne)
        if description:
            try:
                # 1️⃣ Décoder l'URL encoding si présent
                from urllib.parse import unquote
                description = unquote(description)
                
                # 2️⃣ Garder tous les caractères imprimables, accents, et retours à la ligne
                # On supprime uniquement les caractères de contrôle SAUF \n, \t, \r
                description = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]', '', description)
                
                # 3️⃣ Normaliser les retours à la ligne (Windows → Unix)
                description = description.replace('\r\n', '\n').replace('\r', '\n')
                
                # 4️⃣ Limiter la longueur pour la base de données
                description = description[:5000]
                
                print(f"✅ Description nettoyée: {len(description)} caractères")
                
            except Exception as e:
                print(f"⚠️ Erreur nettoyage description: {e}")
                # En cas d'erreur, on garde la description originale
                pass
        
        # ---------------------
        # 1) Create Product
        # ---------------------
        product = Product(
            name=name,
            slug=slug,
            description=description,  # Description nettoyée
            category_id=category_id,
            brand_id=brand_id,
            rating=rating
        )
        db.add(product)
        db.flush()

        # ---------------------
        # 2) Save Images
        # ---------------------
        valid_images = [image for image in (images or []) if image and image.filename]
        if valid_images:
            for i, image in enumerate(valid_images):
                file_path = save_upload_file(image)
                img = ProductImage(
                    product_id=product.id,
                    image_url=file_path,
                    alt_text=f"Image de {name}"[:150],
                    is_main=(i == 0)
                )
                db.add(img)
        else:
            db.add(ProductImage(
                product_id=product.id,
                image_url=default_product_image_for_category(category.slug),
                alt_text=f"Illustration automatique — {category.name}"[:150],
                is_main=True
            ))

        # ---------------------
        # 3) Specs - VERSION AVEC LETTRES SPÉCIALES
        # ---------------------
        if specs:
            valid_specs = []
            invalid_specs = []
            
            for item in specs:
                try:
                    # Nettoyer l'entrée
                    item = item.strip()
                    if not item:
                        continue
                        
                    # Trouver le premier ':'
                    if ':' not in item:
                        invalid_specs.append(item)
                        continue
                        
                    parts = item.split(':', 1)
                    key = parts[0].strip()
                    value = parts[1].strip()
                    
                    # ✅ GARDER LES LETTRES SPÉCIALES (accents, caractères Unicode)
                    # On supprime uniquement les caractères de contrôle
                    key = re.sub(r'[\x00-\x1f\x7f]', '', key)
                    value = re.sub(r'[\x00-\x1f\x7f]', '', value)
                    
                    # Remplacer les espaces multiples par un seul underscore
                    key = re.sub(r'\s+', '_', key)
                    
                    # Limiter la longueur
                    key = key[:100]
                    value = value[:255]
                    
                    if key and value:
                        db.add(ProductSpec(
                            product_id=product.id,
                            key=key,
                            value=value
                        ))
                        valid_specs.append(item)
                    else:
                        invalid_specs.append(item)
                        
                except Exception as e:
                    invalid_specs.append(item)
                    print(f"❌ Erreur sur spec {item}: {e}")
            
            print(f"✅ {len(valid_specs)} specs valides, {len(invalid_specs)} ignorées")
            
            # 👉 Si trop de specs invalides, on annule TOUT
            if invalid_specs and len(invalid_specs) > len(valid_specs):
                db.rollback()
                raise HTTPException(400, detail=f"Trop de specs invalides. Exemple: {invalid_specs[0]}")

        # ---------------------
        # 4) Colors
        # ---------------------
        if color:
            for c in color:
                if not c.strip():
                    db.rollback()
                    raise HTTPException(400, detail="Couleur vide non autorisée")
                # ✅ Nettoyer la couleur aussi
                clean_color = re.sub(r'[\x00-\x1f\x7f]', '', c.strip())
                db.add(ProductColor(
                    product_id=product.id,
                    color=clean_color
                ))
        
        # ---------------------
        # 5) Gestion des variantes
        # ---------------------
        
        if variants_data:
            import json
            try:
                variants = json.loads(variants_data)
                
                # ✅ Vérifier que variants n'est pas vide
                if not variants:
                    db.rollback()
                    raise HTTPException(400, detail="variants_data ne peut pas être vide")
                
                # ✅ Vérifier les doublons de SKU dans la requête
                skus_in_request = []
                created_variants = []
                
                for i, v in enumerate(variants):
                    # Validation du prix
                    if 'price' not in v:
                        db.rollback()
                        raise HTTPException(400, detail="Champ 'price' manquant dans une variante")
                    
                    sku = v.get('sku')
                    if not sku:
                        sku = generate_sku(product.slug, v, i)
                    
                    # Vérifier si le SKU est en double dans la requête
                    if sku in skus_in_request:
                        sku = f"{sku}-{i}"
                    skus_in_request.append(sku)
                    
                    # ✅ Vérifier si le SKU existe déjà en base
                    existing = db.query(ProductVariant).filter(ProductVariant.sku == sku).first()
                    if existing:
                        import time
                        sku = f"{sku}-{int(time.time())}"
                    
                    # ✅ Nettoyer les champs texte des variantes
                    ram = v.get('ram')
                    if ram:
                        ram = re.sub(r'[\x00-\x1f\x7f]', '', ram)
                    
                    storage = v.get('storage')
                    if storage:
                        storage = re.sub(r'[\x00-\x1f\x7f]', '', storage)
                    
                    processor = v.get('processor')
                    if processor:
                        processor = re.sub(r'[\x00-\x1f\x7f]', '', processor)
                    
                    variant = ProductVariant(
                        product_id=product.id,
                        sku=sku,
                        ram=ram,
                        storage=storage,
                        processor=processor,
                        price=float(v['price']),
                        quantity=int(v.get('stock', 0)),
                        color_id=v.get('color_id')
                    )
                    db.add(variant)
                    created_variants.append(variant)
                
                # ✅ AJOUTER LE PRIX D'AFFICHAGE UNE SEULE FOIS
                if display_price is not None:
                    db.add(Price(
                        product_id=product.id,
                        price=display_price,
                        currency=currency
                    ))
                else:
                    if variants:
                        first_price = float(variants[0]['price'])
                        db.add(Price(
                            product_id=product.id,
                            price=first_price,
                            currency=currency
                        ))
                
            except json.JSONDecodeError:
                db.rollback()
                raise HTTPException(status_code=400, detail="Format variants_data invalid (JSON invalide)")
            except ValueError as e:
                db.rollback()
                raise HTTPException(status_code=400, detail=f"Erreur de valeur dans variants_data: {str(e)}")
            except KeyError as e:
                db.rollback()
                raise HTTPException(status_code=400, detail=f"Champ manquant dans variants_data: {e}")
        else:
            # Mode compatible : produit simple
            if prices:
                for p in prices:
                    if p <= 0:
                        db.rollback()
                        raise HTTPException(400, detail="Le prix doit être supérieur à 0")
                    db.add(Price(
                        product_id=product.id,
                        price=p,
                        currency=currency
                    ))
            
            if stock < 0:
                db.rollback()
                raise HTTPException(400, detail="Le stock ne peut pas être négatif")
            else:
                db.add(Inventory(
                    product_id=product.id,
                    quantity=stock
                ))

        # ✅ TOUT EST VALIDE - on commit
        db.commit()
        db.refresh(product)

        return {
            "message": "Product created successfully",
            "product_id": product.id,
            "slug": product.slug,
            "has_variants": variants_data is not None,
            "variants_count": len(variants) if variants_data else 0,
            "display_price": display_price
        }

    except HTTPException:
        # Déjà géré avec rollback, on relance
        raise
    except Exception as e:
        # Erreur inattendue
        db.rollback()
        print(f"❌ Erreur inattendue: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur interne: {str(e)}")

# @router.get("/", response_model=List[ProductSchema])
# def list_products(db: Session = Depends(get_db)):
#     return db.query(Product).all()


@router.put("/{product_id}")
async def update_product(
    product_id: int,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    category_id: Optional[int] = Form(None),
    brand_id: Optional[int] = Form(None),
    specs: Optional[List[str]] = Form(None),       # format "key:value"
    
    # ✅ COULEURS
    color: Optional[List[str]] = Form(None),
    
    # Pour les variantes
    variants_data: Optional[str] = Form(None),
    
    # ✅ Prix d'affichage
    display_price: Optional[float] = Form(None),
    currency: str = Form("XOF"),
    
    # Anciens champs (pour compatibilité)
    prices: Optional[List[float]] = Form(None),
    stock: Optional[int] = Form(None),
    
    images: Optional[List[UploadFile]] = File(None),
    main_image_id: Optional[int] = Form(None),
    new_main_image_index: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    _admin = Depends(get_current_admin)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # ---------------------
    # Update basic fields
    # ---------------------
    if name:
        product.name = name
    if description:
        product.description = description
    if category_id:
        product.category_id = category_id
    if brand_id:
        product.brand_id = brand_id

    # ---------------------
    # ✅ UPDATE SPECS - Version robuste (comme dans create)
    # ---------------------
    if specs:
        valid_specs = []
        invalid_specs = []
        
        # Supprimer les anciennes specs
        db.query(ProductSpec).filter(ProductSpec.product_id == product_id).delete()
        
        for item in specs:
            try:
                # Nettoyer l'entrée
                item = item.strip()
                if not item:
                    continue
                    
                # Trouver le premier ':'
                if ':' not in item:
                    invalid_specs.append(item)
                    continue
                    
                parts = item.split(':', 1)
                key = parts[0].strip()
                value = parts[1].strip()
                
                # ✅ GARDER LES LETTRES SPÉCIALES
                import re
                key = re.sub(r'[\x00-\x1f\x7f]', '', key)
                value = re.sub(r'[\x00-\x1f\x7f]', '', value)
                
                # Remplacer les espaces multiples par un seul underscore
                key = re.sub(r'\s+', '_', key)
                
                # Limiter la longueur
                key = key[:100]
                value = value[:255]
                
                if key and value:
                    db.add(ProductSpec(
                        product_id=product_id,
                        key=key,
                        value=value
                    ))
                    valid_specs.append(item)
                else:
                    invalid_specs.append(item)
                    
            except Exception as e:
                invalid_specs.append(item)
                print(f"❌ Erreur sur spec {item}: {e}")
        
        print(f"✅ {len(valid_specs)} specs valides, {len(invalid_specs)} ignorées")
        
        # Si trop de specs invalides, on annule
        if invalid_specs and len(invalid_specs) > len(valid_specs):
            db.rollback()
            raise HTTPException(400, detail=f"Trop de specs invalides. Exemple: {invalid_specs[0]}")

    # ---------------------
    # Update colors
    # ---------------------
    if color:
        db.query(ProductColor).filter(ProductColor.product_id == product_id).delete()
        for c in color:
            if not c.strip():
                raise HTTPException(400, detail="Couleur vide non autorisée")
            import re
            clean_color = re.sub(r'[\x00-\x1f\x7f]', '', c.strip())
            db.add(ProductColor(product_id=product_id, color=clean_color))

    # ---------------------
    # Update variants
    # ---------------------
    if variants_data:
        import json
        try:
            variants = json.loads(variants_data)
            
            # Vérifier les paniers
            old_variants = db.query(ProductVariant).filter(
                ProductVariant.product_id == product_id
            ).all()
            
            old_variant_ids = [v.id for v in old_variants]
            
            if old_variant_ids:
                cart_items_with_variants = db.query(CartItem).filter(
                    CartItem.variant_id.in_(old_variant_ids)
                ).all()
                
                if cart_items_with_variants:
                    for item in cart_items_with_variants:
                        db.delete(item)
                    db.commit()
            
            # Supprimer les anciennes variantes
            db.query(ProductVariant).filter(ProductVariant.product_id == product_id).delete()
            
            # Créer les nouvelles variantes
            for v in variants:
                sku = v.get('sku')
                if not sku:
                    base = product.slug.upper()
                    ram_part = v.get('ram', '').replace('GB', '').strip() if v.get('ram') else ''
                    storage_part = v.get('storage', '').replace(' ', '').replace('GB', '').replace('TB', 'T')[:4] if v.get('storage') else ''
                    sku = f"{base}-{ram_part}-{storage_part}".strip('-')
                
                variant = ProductVariant(
                    product_id=product_id,
                    sku=sku,
                    ram=v.get('ram'),
                    storage=v.get('storage'),
                    processor=v.get('processor'),
                    price=v['price'],
                    compare_at_price=v.get('compare_at_price'),
                    quantity=v.get('stock', 0),
                    color_id=v.get('color_id')
                )
                db.add(variant)
            
            # Gestion du prix d'affichage
            db.query(Price).filter(Price.product_id == product_id).delete()
            
            if display_price is not None:
                db.add(Price(
                    product_id=product_id,
                    price=display_price,
                    currency=currency
                ))
            else:
                if variants and len(variants) > 0:
                    first_price = float(variants[0]['price'])
                    db.add(Price(
                        product_id=product_id,
                        price=first_price,
                        currency=currency
                    ))
            
            db.query(Inventory).filter(Inventory.product_id == product_id).delete()
            
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Format variants_data invalid")
        except KeyError as e:
            raise HTTPException(status_code=400, detail=f"Champ manquant dans variants_data: {e}")

    # ---------------------
    # Update prices (produit simple)
    # ---------------------
    if prices and not variants_data:
        db.query(Price).filter(Price.product_id == product_id).delete()
        for p in prices:
            db.add(Price(product_id=product_id, price=p, currency=currency))

    # ---------------------
    # Update stock (produit simple)
    # ---------------------
    if stock is not None and not variants_data:
        inv = db.query(Inventory).filter(Inventory.product_id == product_id).first()
        if inv:
            inv.quantity = stock
        else:
            db.add(Inventory(product_id=product_id, quantity=stock))

    # ---------------------
    # Update images
    # ---------------------
    valid_images = [image for image in (images or []) if image and image.filename]
    if valid_images:
        selected_index = new_main_image_index if new_main_image_index is not None else 0
        if selected_index < 0 or selected_index >= len(valid_images):
            raise HTTPException(status_code=400, detail="L'image principale sélectionnée est invalide")

        db.query(ProductImage).filter(ProductImage.product_id == product_id).delete()
        for i, img_file in enumerate(valid_images):
            file_path = save_upload_file(img_file)
            db.add(ProductImage(
                product_id=product_id,
                image_url=file_path,
                alt_text=f"Image de {product.name}"[:150],
                is_main=(i == selected_index),
            ))
    elif main_image_id is not None:
        selected_image = db.query(ProductImage).filter(
            ProductImage.id == main_image_id,
            ProductImage.product_id == product_id,
        ).first()
        if not selected_image:
            raise HTTPException(status_code=400, detail="Cette image n'appartient pas au produit")

        db.query(ProductImage).filter(ProductImage.product_id == product_id).update(
            {ProductImage.is_main: False},
            synchronize_session=False,
        )
        db.query(ProductImage).filter(ProductImage.id == main_image_id).update(
            {ProductImage.is_main: True},
            synchronize_session=False,
        )

    db.commit()
    db.refresh(product)
    
    return {
        "message": "Product updated successfully", 
        "product_id": product.id,
        "has_variants": variants_data is not None,
        "display_price": display_price
    }

# *************************** PROMOS **************************


@router.get("/featured", response_model=List[ProductWithPromoSchema])
def featured_products(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    products = (
        db.query(ProductModel)
        .join(PromoModel)
        .filter(
            PromoModel.tag == PromoType.featured,
            PromoModel.start_date <= now,
            PromoModel.end_date >= now
        )
        .all()
    )

    return [
        ProductWithPromoSchema.from_orm(product).copy(update={"promo": product.active_promo})
        for product in products
    ]


@router.get("/on-sale", response_model=List[ProductWithPromoSchema])
def on_sale_products(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    products = (
        db.query(ProductModel)
        .join(PromoModel)
        .filter(
            PromoModel.tag == PromoType.on_sale,
            PromoModel.start_date <= now,
            PromoModel.end_date >= now
        )
        .all()
    )

    return [
        ProductWithPromoSchema.from_orm(product).copy(update={"promo": product.active_promo})
        for product in products
    ]

@router.get("/top-rated", response_model=List[ProductWithPromoSchema])
def top_rated_products(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    products = (
        db.query(ProductModel)
        .join(PromoModel)
        .filter(
            PromoModel.tag == PromoType.top_rated,
            PromoModel.start_date <= now,
            PromoModel.end_date >= now
        )
        .all()
    )

    return [
        ProductWithPromoSchema.from_orm(product).copy(update={"promo": product.active_promo})
        for product in products
    ]


@router.get("/", response_model=List[ProductSchema])
def list_products(db: Session = Depends(get_db)):
    # afficher uniquement les produits non supprimés
    return db.query(Product).filter(Product.is_deleted == False).all()

@router.get("/all", response_model=dict)
def list_products(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1),
    sort: str = Query("default"),
    brands: str = Query(None),
    colors: str = Query(None),
    minPrice: int = Query(None),
    maxPrice: int = Query(None)
):
    # Récupérer uniquement les produits non supprimés
    products = db.query(Product).filter(Product.is_deleted == False)

    # --- Filtres ---
    if brands:
        brand_list = brands.split(",")
        products = products.filter(Product.brand.has(Brand.name.in_(brand_list)))

    if colors:
        color_list = colors.split(",")
        products = products.filter(Product.colors.any(ProductColor.color.in_(color_list)))

    if minPrice is not None and maxPrice is not None:
        products = products.filter(Product.prices.any(Price.price.between(minPrice, maxPrice)))

    products = products.all()

    # --- Tri ---
    if sort == "price_asc":
        products.sort(key=lambda p: p.prices[0].price if p.prices else 0)
    elif sort == "price_desc":
        products.sort(key=lambda p: p.prices[0].price if p.prices else 0, reverse=True)
    elif sort == "latest":
        products.sort(key=lambda p: p.created_at, reverse=True)
    elif sort == "rating":
        products.sort(key=lambda p: p.rating or 0, reverse=True)

    total = len(products)

    # --- Pagination ---
    start = (page - 1) * limit
    end = start + limit
    paginated = products[start:end]

    # --- Injection promo active ---
    data = [
        ProductWithPromoSchema.from_orm(p).copy(update={"promo": p.active_promo})
        for p in paginated
    ]

    return {
        "data": data,
        "total": total,
        "page": page,
        "limit": limit
    }

# -------------------------------------------
# SEARCH
# -------------------------------------------

@router.get("/search", response_model=dict)
def search_products(
    db: Session = Depends(get_db),
    q: str = Query(..., min_length=2),
    category: Optional[str] = Query(None),
    limit: int = Query(10, ge=1)
):
    # Base : produits non supprimés
    products = db.query(Product).filter(Product.is_deleted == False)

    # Filtre texte (nom ou description)
    products = products.join(Product.brand).join(Product.specs).filter(
        Product.name.ilike(f"%{q}%")
        | Product.description.ilike(f"%{q}%")
        | Product.brand.has(Brand.name.ilike(f"%{q}%"))
        | Product.specs.any(ProductSpec.value.ilike(f"%{q}%"))
    )

    # Filtre catégorie (optionnel)
    if category:
        products = products.join(CategoryModel).filter(CategoryModel.name.ilike(f"%{category}%"))

    # Limiter les résultats
    products = products.limit(limit).all()

    # Injection promo active
    data = [
        ProductWithPromoSchema.from_orm(p).copy(update={"promo": p.active_promo})
        for p in products
    ]

    return {
        "data": data,
        "total": len(products),
        "query": q
    }
    
# -------------------------------------------
# SEARCH END
# -------------------------------------------
    
@router.get("/latest", response_model=List[ProductSchema])
def latest_products(
    limit: int = Query(10, description="Nombre de produits récents à récupérer"),
    db: Session = Depends(get_db)
):
    return (
        db.query(Product)
        .filter(Product.is_deleted == False)
        .order_by(Product.created_at.desc())
        .limit(limit)
        .all()
    )


# ************************** CORBEILLE **************************
@router.get("/trash", response_model=List[ProductSchema])
def list_trash(db: Session = Depends(get_db), _admin = Depends(get_current_admin)):
    products = db.query(Product).filter(Product.is_deleted == True).all()
    return products


@router.put("/trash/{product_id}")
def move_to_trash(product_id: int, db: Session = Depends(get_db), _admin = Depends(get_current_admin)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.is_deleted = True
    db.commit()
    return {"message": "Product moved to trash"}


@router.put("/restore/{product_id}")
def restore_product(product_id: int, db: Session = Depends(get_db), _admin = Depends(get_current_admin)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.is_deleted = False
    db.commit()
    return {"message": "Product restored successfully"}


@router.delete("/permanent/{product_id}")
def delete_product_permanent(product_id: int, db: Session = Depends(get_db), _admin = Depends(get_current_admin)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Supprimer toutes les relations (même si aucune ligne n'est trouvée)
    db.query(Promo).filter(Promo.product_id == product_id).delete(synchronize_session=False)
    db.query(CartItem).filter(CartItem.variant_id.in_(
        db.query(ProductVariant.id).filter(ProductVariant.product_id == product_id)
    )).delete(synchronize_session=False)

    db.query(ProductVariant).filter(ProductVariant.product_id == product_id).delete(synchronize_session=False)
    db.query(ProductImage).filter(ProductImage.product_id == product_id).delete(synchronize_session=False)
    db.query(ProductSpec).filter(ProductSpec.product_id == product_id).delete(synchronize_session=False)
    db.query(Price).filter(Price.product_id == product_id).delete(synchronize_session=False)
    db.query(Inventory).filter(Inventory.product_id == product_id).delete(synchronize_session=False)
    db.query(ProductColor).filter(ProductColor.product_id == product_id).delete(synchronize_session=False)

    # Supprimer le produit lui-même
    db.delete(product)
    db.commit()

    return {"message": f"Product {product_id} permanently deleted"}


@router.get("/slug/{slug}", response_model=ProductSchema)
def get_product_by_slug(slug: str, db: Session = Depends(get_db)):
    """
    Récupère un produit par son slug (URL friendly)
    """
    # Nettoie le slug reçu (au cas où)
    slug = slug.strip().lower()
    
    # 1. Cherche d'abord avec le slug exact
    product = db.query(Product).filter(
        Product.slug == slug,
        Product.is_deleted == False,  # Exclut les produits supprimés
        Product.is_active == True      # Seulement les produits actifs
    ).first()
    
    if not product:
        # 2. Si pas trouvé, essaie de générer le slug à partir du nom
        # (au cas où certains produits n'ont pas de slug en base)
        products = db.query(Product).filter(
            Product.is_deleted == False,
            Product.is_active == True
        ).all()
        
        for p in products:
            if p.name:
                p_slug = Product.generate_slug(p.name)
                if p_slug == slug:
                    return p
        
        # 3. Toujours pas trouvé → 404
        raise HTTPException(
            status_code=404, 
            detail=f"Product with slug '{slug}' not found"
        )
    
    return product

@router.get("/{product_id}", response_model=ProductSchema)
def get_product(product_id: int, db: Session = Depends(get_db)):

    product = db.query(Product).filter(Product.id == product_id).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # ✅ Vérifier si le produit a des variantes
    variants_count = db.query(ProductVariant).filter(
        ProductVariant.product_id == product_id,
        ProductVariant.is_active == True
    ).count()

    # ✅ Ajouter l'info has_variants à l'objet product
    # (soit en créant un attribut temporaire)
    product.has_variants = variants_count > 0

    # Optionnel : ajouter aussi le nombre de variantes
    product.variants_count = variants_count

    return product

@router.get("/{product_id}/variants")
def get_product_variants(product_id: int, db: Session = Depends(get_db)):
    """
    Récupère toutes les variantes d'un produit
    """
    try:
        variants = db.query(ProductVariant).filter(
            ProductVariant.product_id == product_id,
            ProductVariant.is_active == True
        ).all()
        
        # Si pas de variantes, retourne une liste vide (pas d'erreur)
        return [
            {
                "id": v.id,
                "sku": v.sku,
                "ram": v.ram,
                "storage": v.storage,
                "processor": v.processor,
                "price": v.price,
                "stock": v.quantity,
                "color_id": v.color_id
            }
            for v in variants
        ]
        
    except Exception as e:
        print(f"Erreur récupération variantes: {e}")
        return []  # Retourne liste vide en cas d'erreur


# *************************** END CORBEILLE **************************

# *************************** Produit de la même catégorie ***********

# GET /products/related/{product_id}?limit=8


from sqlalchemy.sql import func
from fastapi import Query

@router.get("/related/{product_id}", response_model=List[ProductSchema])
def related_products(
    product_id: int,
    limit: int = Query(8, ge=1),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.is_deleted == False
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return (
        db.query(Product)
        .filter(
            Product.category_id == product.category_id,
            Product.id != product_id,
            Product.is_deleted == False
        )
        .order_by(func.random())
        .limit(limit)
        .all()
    )



# GET /products/filter?color=black

