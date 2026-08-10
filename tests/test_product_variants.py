from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import models  # noqa: F401
from database import Base
from models.model_brands import ProductBrand
from models.model_category import ProductCategory
from models.model_product import Product, ProductVariant
from routes.product import attach_variant_metadata


def test_product_variant_metadata_counts_only_active_variants():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(engine)

    with TestingSession() as session:
        category = ProductCategory(name="Portables variantes", slug="portables-variantes")
        brand = ProductBrand(name="Marque variantes")
        session.add_all([category, brand])
        session.flush()

        product = Product(
            name="Portable configurable",
            slug="portable-configurable",
            category_id=category.id,
            brand_id=brand.id,
        )
        session.add(product)
        session.flush()
        session.add_all(
            [
                ProductVariant(
                    product_id=product.id,
                    sku="PORTABLE-8-512",
                    ram="8GB",
                    storage="512GB SSD",
                    processor="i5",
                    price=500000,
                    quantity=5,
                    is_active=True,
                ),
                ProductVariant(
                    product_id=product.id,
                    sku="PORTABLE-16-1T-INACTIVE",
                    ram="16GB",
                    storage="1TB SSD",
                    processor="i7",
                    price=700000,
                    quantity=0,
                    is_active=False,
                ),
            ]
        )
        session.commit()

        enriched = attach_variant_metadata(product, session)

        assert enriched.has_variants is True
        assert enriched.variants_count == 1
