from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import models  # noqa: F401
from database import Base, get_db
from main import app
from models.model_brands import ProductBrand
from models.model_cart import Cart, CartItem
from models.model_category import ProductCategory
from models.model_product import Inventory, Price, Product, ProductVariant


def test_cart_quantity_supports_products_and_variants_and_never_reaches_zero():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(engine)

    with TestingSession() as session:
        category = ProductCategory(name="Test", slug="test")
        brand = ProductBrand(name="Test brand")
        session.add_all([category, brand])
        session.flush()
        simple = Product(name="Produit simple", slug="produit-simple", category_id=category.id, brand_id=brand.id)
        parent = Product(name="Produit variante", slug="produit-variante", category_id=category.id, brand_id=brand.id)
        session.add_all([simple, parent])
        session.flush()
        session.add_all([
            Price(product_id=simple.id, price=1000),
            Price(product_id=parent.id, price=1500),
            Inventory(product_id=simple.id, quantity=8),
            Inventory(product_id=parent.id, quantity=8),
        ])
        variant = ProductVariant(product_id=parent.id, sku="TEST-VARIANT", price=1500, quantity=6, is_active=True)
        session.add(variant)
        session.flush()
        cart = Cart(device_id="device-cart-test", status="active")
        session.add(cart)
        session.flush()
        simple_item = CartItem(cart_id=cart.id, product_id=simple.id, quantity=1, price=1000, total=1000)
        variant_item = CartItem(cart_id=cart.id, variant_id=variant.id, quantity=2, price=1500, total=3000)
        session.add_all([simple_item, variant_item])
        session.commit()
        simple_item_id, variant_item_id = simple_item.id, variant_item.id

    def override_db():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)
    client.cookies.set("device_id", "device-cart-test")
    try:
        simple_response = client.put(f"/cart/item/{simple_item_id}", json={"quantity": 3})
        assert simple_response.status_code == 200
        assert next(item for item in simple_response.json()["items"] if item["id"] == simple_item_id)["quantity"] == 3

        variant_response = client.put(f"/cart/item/{variant_item_id}", json={"quantity": 4})
        assert variant_response.status_code == 200
        assert next(item for item in variant_response.json()["items"] if item["id"] == variant_item_id)["quantity"] == 4

        zero_response = client.put(f"/cart/item/{simple_item_id}", json={"quantity": 0})
        assert zero_response.status_code == 422

        client.cookies.set("device_id", "another-device")
        foreign_response = client.put(f"/cart/item/{simple_item_id}", json={"quantity": 2})
        assert foreign_response.status_code == 404
    finally:
        app.dependency_overrides.pop(get_db, None)
        Base.metadata.drop_all(engine)
        engine.dispose()
