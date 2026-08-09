import re

from sqlalchemy import Column, Integer, String, Text, ForeignKey, Float, Boolean, DateTime, Table, event
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime



# ------------------------
# Products
# ------------------------


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    slug = Column(String(220), unique=True, nullable=False)
    rating = Column(Float, default=0)  # ce sera mis à jour automatiquement
    description = Column(Text, nullable=True)
    category_id = Column(Integer, ForeignKey("product_categories.id"))
    brand_id = Column(Integer, ForeignKey("product_brands.id"))
    is_active = Column(Boolean, default=True)
    
    @staticmethod
    def generate_slug(name):
        """Génère un slug à partir du nom du produit"""
        # Convertit en minuscules, remplace les espaces par des tirets
        slug = re.sub(r'[^\w\s-]', '', name.lower())
        slug = re.sub(r'[-\s]+', '-', slug)
        return slug
    

            
    # -----------------------
    # CORBEILLE
    # -----------------------
    is_deleted = Column(Boolean, default=False)

    category = relationship("ProductCategory", backref="products")
    brand = relationship("ProductBrand", backref="products")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")

    specs = relationship("ProductSpec", back_populates="product", cascade="all, delete-orphan")
    prices = relationship("Price", back_populates="product", cascade="all, delete-orphan")
    inventory = relationship("Inventory", back_populates="product", uselist=False)
    colors = relationship("ProductColor", back_populates="product", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="product", cascade="all, delete-orphan")

    
    
    promos = relationship("Promo", back_populates="product")
    
    @property
    def active_promo(self):
        now = datetime.utcnow()
        return next(
            (p for p in self.promos if p.start_date <= now <= p.end_date),
            None
        )

    created_at = Column(DateTime(timezone=True), server_default=func.now())

@event.listens_for(Product, 'before_insert')
def receive_before_insert(mapper, connection, target):
    """Génère le slug automatiquement si pas fourni ou si le nom change"""
    if target.name and (not target.slug or target.slug == ""):
        target.slug = Product.generate_slug(target.name)

# ------------------------
# Product Images
# ------------------------
class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"))
    image_url = Column(String(255), nullable=False)
    alt_text = Column(String(150), nullable=True)
    is_main = Column(Boolean, default=False)

    product = relationship("Product", back_populates="images")
    
# ------------------------
# Product Specs
# ------------------------
class ProductSpec(Base):
    __tablename__ = "product_specs"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"))
    key = Column(String(100), nullable=False)
    value = Column(String(255), nullable=False)
    
    product = relationship("Product", back_populates="specs")
    

# ------------------------
# Prices
# ------------------------
class Price(Base):
    __tablename__ = "prices"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"))
    price = Column(Float, nullable=False)
    currency = Column(String(10), default="USD")
    is_discount = Column(Boolean, default=False)
    discounted_price = Column(Float, nullable=True)
    
    product = relationship("Product", back_populates="prices")

# ------------------------
# Inventory (optionnel)
# ------------------------
class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"))
    quantity = Column(Integer, default=0)
    location = Column(String(100), nullable=True)

    product = relationship("Product", back_populates="inventory")

# ------------------------
# Color (optionnel)
# ------------------------

class ProductColor(Base):
    __tablename__ = "product_colors"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"))
    color = Column(String(50), index=True, nullable=False)

    product = relationship("Product", back_populates="colors")


# À ajouter dans ton models.py, après la classe ProductColor par exemple

# ------------------------
# Product Variants (NOUVEAU)
# ------------------------
class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    
    # Identifiant unique pour cette variante (ex: "HP290-16-512")
    sku = Column(String(100), unique=True, nullable=False)
    
    # Caractéristiques (on peut ajouter d'autres colonnes plus tard)
    ram = Column(String(20), nullable=True)        # "8GB", "16GB", "32GB"
    storage = Column(String(30), nullable=True)    # "256GB SSD", "512GB SSD", "1TB SSD"
    processor = Column(String(50), nullable=True)  # "i5", "i7", "Ryzen 5"
    color_id = Column(Integer, ForeignKey("product_colors.id"), nullable=True)  # Lier à ta table couleurs existante
    
    # Prix et stock
    price = Column(Float, nullable=False)          # Prix de cette variante
    compare_at_price = Column(Float, nullable=True) # Prix barré (optionnel)
    quantity = Column(Integer, default=0)          # Stock pour cette variante
    
    # Status
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relations
    product = relationship("Product", backref="variants")
    color = relationship("ProductColor")  # Lien avec la couleur si besoin
    
    def __repr__(self):
        return f"<ProductVariant {self.sku}>"