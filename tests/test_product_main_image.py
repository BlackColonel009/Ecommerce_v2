from types import SimpleNamespace

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import models  # noqa: F401
import routes.product as product_routes
from database import Base, get_db
from main import app
from models.model_brands import ProductBrand
from models.model_category import ProductCategory
from models.model_product import Product, ProductImage
from routes.auth import get_current_admin


def test_product_main_image_selection_for_existing_and_new_images(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(engine)

    with TestingSession() as session:
        category = ProductCategory(name="Images", slug="images")
        brand = ProductBrand(name="Images brand")
        session.add_all([category, brand])
        session.flush()
        product = Product(name="Produit images", slug="produit-images", category_id=category.id, brand_id=brand.id)
        other_product = Product(name="Autre produit", slug="autre-produit", category_id=category.id, brand_id=brand.id)
        session.add_all([product, other_product])
        session.flush()
        first = ProductImage(product_id=product.id, image_url="uploads/first.webp", is_main=True)
        second = ProductImage(product_id=product.id, image_url="uploads/second.webp", is_main=False)
        foreign = ProductImage(product_id=other_product.id, image_url="uploads/foreign.webp", is_main=True)
        session.add_all([first, second, foreign])
        session.commit()
        product_id, second_id, foreign_id = product.id, second.id, foreign.id

    def override_db():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_admin] = lambda: SimpleNamespace(id=1, is_superadmin=True)
    client = TestClient(app)
    try:
        existing = client.put(f"/products/{product_id}", data={"main_image_id": str(second_id)})
        assert existing.status_code == 200
        with TestingSession() as session:
            images = session.query(ProductImage).filter(ProductImage.product_id == product_id).order_by(ProductImage.id).all()
            assert [image.is_main for image in images] == [False, True]

        foreign_response = client.put(f"/products/{product_id}", data={"main_image_id": str(foreign_id)})
        assert foreign_response.status_code == 400

        monkeypatch.setattr(
            product_routes,
            "save_upload_file",
            lambda upload: f"uploads/products/{upload.filename}",
        )
        replacement = client.put(
            f"/products/{product_id}",
            data={"new_main_image_index": "1"},
            files=[
                ("images", ("new-one.webp", b"one", "image/webp")),
                ("images", ("new-two.webp", b"two", "image/webp")),
            ],
        )
        assert replacement.status_code == 200
        with TestingSession() as session:
            images = session.query(ProductImage).filter(ProductImage.product_id == product_id).order_by(ProductImage.id).all()
            assert len(images) == 2
            assert [image.is_main for image in images] == [False, True]
            assert images[1].image_url.endswith("new-two.webp")
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(get_current_admin, None)
        Base.metadata.drop_all(engine)
        engine.dispose()
