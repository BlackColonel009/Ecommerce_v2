from sqlalchemy import create_engine, func, select

from models.model_category import ProductCategory
from models.model_product import Product, ProductImage
from script.seed_demo_catalog import CATEGORY_SLUGS, PRODUCT_PROFILES, seed_demo_catalog


def test_demo_catalog_seed_is_complete_and_idempotent(tmp_path):
    temporary_engine = create_engine("sqlite:///:memory:")
    image_dir = tmp_path / "uploads" / "products" / "demo-placeholders"

    first = seed_demo_catalog(temporary_engine, image_dir)
    second = seed_demo_catalog(temporary_engine, image_dir)

    product_table = Product.__table__
    category_table = ProductCategory.__table__
    image_table = ProductImage.__table__
    with temporary_engine.connect() as connection:
        product_count = connection.scalar(
            select(func.count()).select_from(product_table).where(product_table.c.slug.like("demo-%"))
        )
        category_slugs = set(connection.scalars(select(category_table.c.slug)))
        image_count = connection.scalar(select(func.count()).select_from(image_table))

    assert first["products_created"] == len(CATEGORY_SLUGS)
    assert second["products_created"] == 0
    assert second["products_updated"] == len(CATEGORY_SLUGS)
    assert product_count == len(CATEGORY_SLUGS)
    assert set(CATEGORY_SLUGS).issubset(category_slugs)
    assert image_count == len(CATEGORY_SLUGS)
    assert len(list(image_dir.glob("*.webp"))) == len(PRODUCT_PROFILES)
