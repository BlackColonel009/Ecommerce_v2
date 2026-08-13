from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from models.model_product import Product, ProductColor, ProductVariant
from routes.admin import get_admin_whatsapp_number
from models.model_vistor import Visitor
from sqlalchemy.orm import Session
from database import get_db
from fastapi import Request
from urllib.parse import quote

from models.model_cart import Cart, CartItem
from schemas.cart_schema import (
    CartItemCreate,
    CartItemUpdate,
    CartItemSchema,
    CartSchema,
    CartUpdateNotes,
    WhatsAppMessage
)

router = APIRouter(prefix="/cart", tags=["Cart"])


# ------------------------------------
# 1) CREATE OR GET THE CART
# ------------------------------------
def get_or_create_cart(device_id: str, db: Session):
    cart = db.query(Cart).filter(Cart.device_id == device_id).first()
    if not cart:
        cart = Cart(device_id=device_id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart


# ------------------------------------
# 2) ADD PRODUCT TO CART
# ------------------------------------


@router.post("/add", response_model=CartSchema)
def add_to_cart(payload: dict, request: Request, db: Session = Depends(get_db)):
    """
    Ajoute au panier:
    - Soit un produit simple (avec product_id)
    - Soit une variante (avec variant_id)
    """
    device_id = request.cookies.get("device_id")
    print("[Cart API] 🔎 Cookie device_id reçu:", device_id)

    if not device_id:
        raise HTTPException(400, "Device ID manquant")

    # Récupérer le panier actif
    cart = db.query(Cart).filter(Cart.device_id == device_id, Cart.status == "active").first()
    if not cart:
        cart = Cart(device_id=device_id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
        print("[Cart API] 🆕 Nouveau panier créé pour device_id:", device_id)

    # ✅ CAS 1: Ajout d'une variante
    if "variant_id" in payload:
        variant_id = payload["variant_id"]
        quantity = payload["quantity"]
        color_id = payload.get("color_id")
        
        # Vérifier que la variante existe
        variant = db.query(ProductVariant).filter(
            ProductVariant.id == variant_id,
            ProductVariant.is_active == True
        ).first()
        
        if not variant:
            raise HTTPException(404, "Variante introuvable")
        
        # ✅ Récupérer le product_id depuis la variante
        product_id = variant.product_id  # ← C'EST ICI QU'ON RÉCUPÈRE LE PRODUCT_ID
        
        # Vérifier le stock
        if variant.quantity < quantity:
            raise HTTPException(400, f"Stock insuffisant. Disponible: {variant.quantity}")
        
        # Vérifier si l'item existe déjà
        existing_item = db.query(CartItem).filter(
            CartItem.cart_id == cart.id,
            CartItem.variant_id == variant_id,
            CartItem.color_id == color_id
        ).first()
        
        price = variant.price
        total = price * quantity
        
        if existing_item:
            existing_item.quantity += quantity
            existing_item.total = existing_item.quantity * price
            print(f"[Cart API] 🔄 Quantité mise à jour pour variante: {variant_id}")
        else:
            new_item = CartItem(
                cart_id=cart.id,
                # product_id=product_id,  # ← AJOUTE LE PRODUCT_ID ICI !
                variant_id=variant_id,
                color_id=color_id,
                quantity=quantity,
                price=price,
                total=total
            )
            db.add(new_item)
            print(f"[Cart API] ➕ Nouvelle variante ajoutée au panier: {variant_id} (product_id: {product_id})")
            
    # ✅ CAS 2: Ajout d'un produit simple (ancien comportement)
    elif "product_id" in payload:
        product_id = payload["product_id"]
        quantity = payload["quantity"]
        color_id = payload.get("color_id")
        promo_price = payload.get("promo_price")
        
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(404, "Produit introuvable")
        
        if color_id:
            color_exists = any(c.id == color_id for c in product.colors)
            if not color_exists:
                raise HTTPException(400, "Couleur non disponible pour ce produit")
        
        existing_item = db.query(CartItem).filter(
            CartItem.cart_id == cart.id,
            CartItem.product_id == product_id,
            CartItem.color_id == color_id
        ).first()
        
        # Déterminer le prix
        if promo_price:
            price = promo_price
            print(f"[Cart API] 🎁 Prix promo utilisé: {price}")
        else:
            price = product.prices[0].price if product.prices else 0
            print(f"[Cart API] 💰 Prix normal utilisé: {price}")
        
        total = price * quantity
        
        if existing_item:
            existing_item.quantity += quantity
            existing_item.total = existing_item.quantity * price
            print("[Cart API] 🔄 Quantité mise à jour pour produit:", product_id)
        else:
            new_item = CartItem(
                cart_id=cart.id,
                product_id=product_id,
                color_id=color_id,
                quantity=quantity,
                price=price,
                total=total
            )
            db.add(new_item)
            print("[Cart API] ➕ Nouvel item ajouté au panier:", product_id)
    
    else:
        raise HTTPException(400, "Payload invalide: besoin de product_id ou variant_id")

    db.commit()
    db.refresh(cart)

    cart_total = sum(i.total for i in cart.items)
    print("[Cart API] ✅ Panier mis à jour. Total:", cart_total)

    return CartSchema(
        id=cart.id,
        device_id=cart.device_id,
        items=[
            CartItemSchema(
                id=i.id,
                product_id=i.product_id,
                variant_id=i.variant_id,
                quantity=i.quantity,
                price=i.price,
                total=i.total,
                color_id=i.color_id
            ) for i in cart.items
        ],
        total_amount=cart_total
    )
    
# ------------------------------------
# 3) UPDATE ITEM QUANTITY
# ------------------------------------
from fastapi import HTTPException
from sqlalchemy.orm import Session

@router.put("/item/{item_id}", response_model=CartSchema)
def update_cart_item(
    item_id: int,
    payload: CartItemUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    device_id = request.cookies.get("device_id")
    if not device_id:
        raise HTTPException(status_code=400, detail="Device ID manquant")

    item = (
        db.query(CartItem)
        .join(Cart, Cart.id == CartItem.cart_id)
        .filter(
            CartItem.id == item_id,
            Cart.device_id == device_id,
            Cart.status == "active",
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Article introuvable dans ce panier")

    if item.variant_id:
        variant = db.query(ProductVariant).filter(
            ProductVariant.id == item.variant_id,
            ProductVariant.is_active.is_(True),
        ).first()
        if not variant:
            raise HTTPException(status_code=404, detail="Variante indisponible")
        available_qty = variant.quantity
    else:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product or not product.inventory:
            raise HTTPException(status_code=404, detail="Stock du produit introuvable")
        available_qty = product.inventory.quantity

    if payload.quantity > available_qty:
        raise HTTPException(
            status_code=409,
            detail=f"Stock insuffisant. Disponible : {available_qty}",
        )

    item.quantity = payload.quantity
    item.total = item.quantity * item.price
    if payload.color_id is not None:
        item.color_id = payload.color_id
    cart_id = item.cart_id
    db.commit()

    cart = db.query(Cart).options(
        joinedload(Cart.items).joinedload(CartItem.product),
        joinedload(Cart.items).joinedload(CartItem.variant).joinedload(ProductVariant.product),
        joinedload(Cart.items).joinedload(CartItem.color),
    ).filter(Cart.id == cart_id).first()
    cart_total = sum(i.total for i in cart.items)

    return CartSchema(
        id=cart.id,
        device_id=cart.device_id,
        items=[
            CartItemSchema(
                id=i.id,
                product_id=i.product_id,
                variant_id=i.variant_id,
                quantity=i.quantity,
                price=i.price,
                total=i.total,
                color_id=i.color_id,
                # Charger les infos produit ou variante selon le cas
                product=i.product if i.product_id else None,
                variant=i.variant if i.variant_id else None
            ) for i in cart.items
        ],
        total_amount=cart_total
    )


# ------------------------------------
# 4) DELETE ITEM
# ------------------------------------
@router.delete("/item/{item_id}", response_model=CartSchema)
def delete_cart_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(CartItem).filter(CartItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")

    cart = item.cart
    db.delete(item)
    db.commit()
    db.refresh(cart)

    cart_total = sum(i.total for i in cart.items)

    return CartSchema(
        id=cart.id,
        device_id=cart.device_id,
        items=[
            CartItemSchema(
                id=i.id,
                product_id=i.product_id,
                variant_id=i.variant_id,
                quantity=i.quantity,
                price=i.price,
                total=i.total,
                color_id=i.color_id,
                # Charger les infos produit ou variante selon le cas
                product=i.product if i.product_id else None,
                variant=i.variant if i.variant_id else None
            ) for i in cart.items
        ],
        total_amount=cart_total
    )

# ------------------------------------
# 4.1) Whatsapp single ITEM
# ------------------------------------

@router.get("/{product_id}/whatsapp")
def generate_product_whatsapp(product_id: int, request: Request, db: Session = Depends(get_db)):
    """
    Génère un message WhatsApp pour un produit individuel
    Utilisé quand le prix est 0 ou que le produit n'est pas disponible à l'achat
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")

    visitor = None
    device_id = request.cookies.get("device_id")
    if device_id:
        visitor = (
            db.query(Visitor)
            .filter(Visitor.device_id == device_id, Visitor.first_name.isnot(None))
            .order_by(Visitor.date.desc())
            .first()
        )

    # Construire le message de base
    greeting = f"Bonjour, je suis {visitor.first_name}." if visitor and visitor.first_name else "Bonjour,"
    message = f"🛍️ *Demande d'information produit*\n\n{greeting}\n"
    message += f"📱 *{product.name}*\n"
    
    # Prix (si disponible)
    if product.prices and product.prices[0].price > 0:
        message += f"💰 *Prix:* {product.prices[0].price} XOF\n"
    else:
        message += f"💰 *Prix:* Sur demande\n"
    
    # Catégorie et marque
    if product.category:
        message += f"📂 *Catégorie:* {product.category.name}\n"
    if product.brand:
        message += f"🏭 *Marque:* {product.brand.name}\n"
    
    # Spécifications (max 5)
    if product.specs:
        message += f"\n📋 *Spécifications:*\n"
        for spec in product.specs[:5]:
            message += f"   • {spec.key}: {spec.value}\n"
    
    # Ajouter un message standard
    message += f"\n❓ *Question du client:*\n"
    message += "Je suis intéressé par ce produit. Pouvez-vous me donner plus d'informations ?\n\n"
    message += f"🔗 Lien: https://api.newtechnologiestg.com/graph/{product.slug}"
    
    # Numéro WhatsApp (à configurer)
    whatsapp_number = "22890045876"  # À remplacer par ton numéro
    
    # Encoder le message
    encoded_message = quote(message)
    whatsapp_url = f"https://api.whatsapp.com/send?phone={whatsapp_number}&text={encoded_message}"
    
    return {
        "whatsapp_url": whatsapp_url,
        "message_preview": message,
        "product_id": product.id
    }

# ------------------------------------
# 5) CLEAR CART
# ------------------------------------
@router.delete("/clear", response_model=CartSchema)
def clear_cart(request: Request, db: Session = Depends(get_db)):
    device_id = request.cookies.get("device_id")
    if not device_id:
        raise HTTPException(400, "Device ID manquant")

    cart = db.query(Cart).filter(Cart.device_id == device_id, Cart.status == "active").first()
    if not cart:
        raise HTTPException(404, "Panier introuvable")

    # Supprimer tous les items
    for item in cart.items:
        db.delete(item)
    db.commit()
    db.refresh(cart)

    # Même vide, on renvoie un CartSchema valide
    return CartSchema(
        id=cart.id,
        device_id=cart.device_id,
        items=[],
        total_amount=0.0   # ✅ obligatoire
    )




# ------------------------------------
# 6) GET CART
# ------------------------------------
from sqlalchemy.orm import joinedload

@router.get("/", response_model=CartSchema)
def get_cart(request: Request, db: Session = Depends(get_db)):
    device_id = request.cookies.get("device_id")
    
    # Charger le panier avec TOUTES les relations nécessaires
    cart = db.query(Cart).options(
        joinedload(Cart.items).joinedload(CartItem.product),
        joinedload(Cart.items).joinedload(CartItem.variant).joinedload(ProductVariant.product),  # ← Force le chargement
        joinedload(Cart.items).joinedload(CartItem.color)
    ).filter(
        Cart.device_id == device_id, 
        Cart.status == "active"
    ).first()
    
    if not cart:
        print("❌ [CART GET] Panier introuvable")
        raise HTTPException(404, "Panier introuvable")
    
    print(f"✅ [CART GET] Panier trouvé ID: {cart.id}")
    print(f"📦 [CART GET] Nombre d'items: {len(cart.items)}")

    cart_total = sum(i.total for i in cart.items)
    
    # Analyser chaque item
    for i, item in enumerate(cart.items):
        print(f"\n  --- ITEM {i+1} ---")
        print(f"  ID: {item.id}")
        print(f"  product_id: {item.product_id}")
        print(f"  variant_id: {item.variant_id}")
        print(f"  quantity: {item.quantity}")
        print(f"  price: {item.price}")
        
        # Vérifier les relations
        if item.variant_id:
            print(f"  🔍 C'est une VARIANTE")
            if item.variant:
                print(f"    ✅ Variant trouvé: {item.variant.sku}")
                print(f"    🔍 RAM: {item.variant.ram}")
                print(f"    🔍 Stockage: {item.variant.storage}")
                if item.variant.product:
                    print(f"    ✅ PRODUIT PARENT trouvé via variant.product:")
                    print(f"      - ID: {item.variant.product.id}")
                    print(f"      - Nom: {item.variant.product.name}")
                    print(f"      - Slug: {item.variant.product.slug}")
                else:
                    print(f"    ❌ PRODUIT PARENT NON TROUVÉ dans variant.product")
            else:
                print(f"    ❌ Variant NON TROUVÉ malgré variant_id={item.variant_id}")
        
        elif item.product_id:
            print(f"  🔍 C'est un PRODUIT SIMPLE")
            if item.product:
                print(f"    ✅ Produit trouvé: {item.product.name}")
            else:
                print(f"    ❌ Produit NON TROUVÉ malgré product_id={item.product_id}")
    
    print(f"\n💰 [CART GET] Total panier: {cart_total}\n")

    return CartSchema(
        id=cart.id,
        device_id=cart.device_id,
        items=[
            CartItemSchema(
                id=i.id,
                product_id=i.product_id,
                variant_id=i.variant_id,
                quantity=i.quantity,
                price=i.price,
                total=i.total,
                color_id=i.color_id,
                product=i.product,
                variant=i.variant
            ) for i in cart.items
        ],
        total_amount=cart_total
    )
# ------------------------------------
# 7) GENERATE WHATSAPP MESSAGE
# ------------------------------------


@router.get("/whatsapp", response_model=WhatsAppMessage)
def generate_whatsapp(
    request: Request, 
    notes: Optional[str] = None,
    lat: Optional[float] = None,      # ← Nouveau paramètre
    lng: Optional[float] = None,      # ← Nouveau paramètre
    address: Optional[str] = None,     # ← Nouveau paramètre
    db: Session = Depends(get_db)
):
    device_id = request.cookies.get("device_id")
    if not device_id:
        raise HTTPException(400, "Device ID manquant")
    cart = get_or_create_cart(device_id, db)

    if not cart.items:
        raise HTTPException(400, "Your cart is empty")

    visitor = (
        db.query(Visitor)
        .filter(Visitor.device_id == device_id, Visitor.first_name.isnot(None))
        .order_by(Visitor.date.desc())
        .first()
    )
    greeting = f"Bonjour, je suis {visitor.first_name}." if visitor and visitor.first_name else "Bonjour,"
    message = f"{greeting} Je souhaite commander les articles suivants :\n\n"
    total = 0
    for item in cart.items:
            # ✅ Déterminer le produit (soit direct, soit via variante)
            if item.variant_id and item.variant:
                # C'est une variante
                product = item.variant.product
                variant = item.variant
                
                # Construire le nom avec les caractéristiques de la variante
                specs = []
                if variant.ram:
                    specs.append(f"RAM: {variant.ram}")
                if variant.storage:
                    specs.append(f"Stockage: {variant.storage}")
                if variant.processor:
                    specs.append(f"CPU: {variant.processor}")
                
                product_name = f"{product.name} ({', '.join(specs)})" if specs else product.name
                specs_text = f" └─ {', '.join(specs)}" if specs else ""
                
            else:
                # C'est un produit simple
                product = item.product
                
                if not product:
                    print(f"⚠️ Produit manquant pour l'item {item.id}")
                    continue
                
                # ✅ Récupérer les 3 premières spécifications du produit
                product_specs = []
                if hasattr(product, 'specs') and product.specs:
                    for i, spec in enumerate(product.specs[:3]):  # 3 premiers specs
                        product_specs.append(f"{spec.key}: {spec.value}")
                
                product_name = product.name
                specs_text = f" └─ {', '.join(product_specs)}" if product_specs else ""
            
            price = item.price
            line_total = price * item.quantity
            total += line_total
            
            # ✅ Message avec indentations pour les specs
            message += f"• {product_name} x {item.quantity} = {line_total} XOF\n"
            if specs_text:
                message += f"  {specs_text}\n"
            message += "\n"

        
    message += f"💰 *Total général : {total} XOF*\n\n"

    if notes:
        message += f"📝 Note du client : {notes}\n\n"
    
    # ✅ AJOUTER LA LOCALISATION AU MESSAGE
    if lat and lng:
        message += f"📍 *Localisation GPS:*\n"
        message += f"https://maps.google.com/?q={lat},{lng}\n"
        message += f"Latitude: {lat}\n"
        message += f"Longitude: {lng}\n\n"
    elif address:
        message += f"📍 *Adresse de livraison:*\n{address}\n\n"

    message += "✅ Merci de confirmer la disponibilité 🙏"

    from urllib.parse import quote

    whatsapp_number = get_admin_whatsapp_number(db)
    
    encoded = quote(message)
    whatsapp_url = f"https://api.whatsapp.com/send?phone={whatsapp_number}&text={encoded}"

    return WhatsAppMessage(
        whatsapp_url=whatsapp_url,
        message_preview=message,
        total_amount=total
    )



# mettre à jour les notes du cart

@router.put("/notes", response_model=CartSchema)
def update_cart_notes(request: Request, payload: CartUpdateNotes, db: Session = Depends(get_db)):
    device_id = request.cookies.get("device_id")
    if not device_id:
        raise HTTPException(400, "Device ID manquant")

    cart = db.query(Cart).filter(Cart.device_id == device_id, Cart.status == "active").first()
    if not cart:
        raise HTTPException(404, "Panier introuvable")

    cart.notes = payload.notes
    db.commit()
    db.refresh(cart)

    cart_total = sum(i.total for i in cart.items)

    return CartSchema(
        id=cart.id,
        device_id=cart.device_id,
        items=[
            CartItemSchema(
                id=i.id,
                product_id=i.product_id,
                product=i.product,
                quantity=i.quantity,
                price=i.price,
                total=i.total,
                color_id=i.color_id
            ) for i in cart.items
        ],
        total_amount=cart_total
    )

# sauver les items déjà selectionner dans le card

@router.get("/saved/", response_model=List[CartSchema])
def get_saved_carts(request: Request,  db: Session = Depends(get_db)):
    device_id = request.cookies.get("device_id")
    if not device_id:
        raise HTTPException(400, "Device ID manquant")
    carts = db.query(Cart).filter(Cart.device_id == device_id, Cart.status == "active").all()
    return carts
