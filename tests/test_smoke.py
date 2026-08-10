from fastapi.testclient import TestClient
from lxml import html
from pathlib import Path
from types import SimpleNamespace
import pytest

from main import app as api_app
from templates.dashboard.app.main import app as dashboard_app
from templates.ecommerce.app.main import app as storefront_app
from config import settings
from utils.security import create_access_token
from utils.security import hash_password
from database import get_db


def test_api_root_is_available():
    response = TestClient(api_app).get("/")

    assert response.status_code == 200
    assert "message" in response.json()


def test_product_placeholder_is_available_and_cacheable():
    response = TestClient(api_app).get("/placeholder.jpg")

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/webp"
    assert "max-age" in response.headers["cache-control"]


def test_dashboard_origin_is_allowed_by_cors():
    response = TestClient(api_app).options(
        "/auth/login",
        headers={
            "Origin": "http://localhost:8012",
            "Access-Control-Request-Method": "POST",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:8012"
    assert response.headers["access-control-allow-credentials"] == "true"


def test_public_dashboard_login_preflight_is_allowed():
    response = TestClient(api_app).options(
        "/auth/login",
        headers={
            "Origin": "https://dashboard.newtechnologiestg.com",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == (
        "https://dashboard.newtechnologiestg.com"
    )
    assert response.headers["access-control-allow-credentials"] == "true"


@pytest.mark.parametrize(
    ("path", "method", "request_headers"),
    (
        ("/visitor", "POST", "content-type"),
        ("/cart/", "GET", None),
        ("/favorites/", "POST", "content-type"),
    ),
)
def test_public_storefront_preflights_are_allowed(path, method, request_headers):
    headers = {
        "Origin": "https://newtechnologiestg.com",
        "Access-Control-Request-Method": method,
    }
    if request_headers:
        headers["Access-Control-Request-Headers"] = request_headers

    response = TestClient(api_app).options(path, headers=headers)

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://newtechnologiestg.com"
    assert response.headers["access-control-allow-credentials"] == "true"
    assert method in response.headers["access-control-allow-methods"]


def test_admin_login_sets_secure_session_cookie():
    admin = SimpleNamespace(
        id=1,
        username="admin@alpha.com",
        email="admin@alpha.com",
        hashed_password=hash_password("admin123"),
        is_superadmin=True,
    )

    class FakeQuery:
        def filter(self, *_args):
            return self

        def first(self):
            return admin

    class FakeSession:
        def query(self, *_args):
            return FakeQuery()

    def override_db():
        yield FakeSession()

    api_app.dependency_overrides[get_db] = override_db
    try:
        response = TestClient(api_app).post(
            "/auth/login",
            data={"username": "admin@alpha.com", "password": "admin123"},
            headers={"Origin": "http://localhost:8012"},
        )
    finally:
        api_app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 200
    cookie = response.headers["set-cookie"]
    assert settings.ADMIN_COOKIE_NAME in cookie
    assert "HttpOnly" in cookie
    assert "SameSite=lax" in cookie


def test_admin_route_requires_authentication():
    response = TestClient(api_app).get("/subscribe/admin/newsletter")

    assert response.status_code == 401


def test_storefront_home_renders():
    response = TestClient(storefront_app).get("/")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]

    document = html.fromstring(response.text)
    assert document.xpath("string(//html/@lang)") == "fr-TG"
    assert len(document.xpath("//h1")) == 1
    assert document.xpath("//meta[@name='google-site-verification']/@content")
    assert document.xpath("//meta[@name='description']/@content")
    assert document.xpath("//link[@rel='canonical']/@href") == [
        "https://newtechnologiestg.com/"
    ]
    assert document.xpath("//script[@type='application/ld+json']")

    element_ids = document.xpath("//@id")
    assert len(element_ids) == len(set(element_ids))

    static_root = Path("templates/ecommerce/app/static")
    local_assets = document.xpath(
        "//link[starts-with(@href, '/static/')]/@href | "
        "//script[starts-with(@src, '/static/')]/@src | "
        "//img[starts-with(@src, '/static/')]/@src"
    )
    missing_assets = [
        asset for asset in local_assets
        if not (static_root / asset.split("?", 1)[0].removeprefix("/static/")).exists()
    ]
    assert missing_assets == []


def test_storefront_login_renders():
    response = TestClient(storefront_app).get("/login")

    assert response.status_code == 200
    document = html.fromstring(response.text)
    assert document.xpath("//*[@id='signupFormMobile']")
    assert document.xpath("//*[@id='signupUsername']")
    assert document.xpath("//*[@id='signupEmail']")
    assert document.xpath("//script[contains(@src, 'mobile_auth.js?v=')]")


def test_sidebar_signup_requests_a_unique_username():
    response = TestClient(storefront_app).get("/auth")

    assert response.status_code == 200
    document = html.fromstring(response.text)
    assert document.xpath("//*[@id='sidebarSignupUsername']")
    assert len(document.xpath("//*[@id='login']//input[@name='username']")) == 1
    assert len(document.xpath("//*[@id='signup']//input[@name='username']")) == 1


def test_storefront_exposes_search_engine_files():
    client = TestClient(storefront_app)

    robots = client.get("/robots.txt")
    sitemap = client.get("/sitemap.xml")

    assert robots.status_code == 200
    assert "Sitemap: https://newtechnologiestg.com/sitemap.xml" in robots.text
    assert "Disallow: /cart" in robots.text
    assert sitemap.status_code == 200
    assert "https://newtechnologiestg.com/shop" in sitemap.text
    assert sitemap.headers["content-type"].startswith("application/xml")


def test_storefront_shop_uses_modern_theme_and_keeps_catalogue_hooks():
    response = TestClient(storefront_app).get("/shop")

    assert response.status_code == 200
    document = html.fromstring(response.text)
    assert document.xpath("string(//html/@lang)") == "fr-TG"
    assert len(document.xpath("//h1")) == 1
    assert "shop-modern" in document.xpath("string(//body/@class)")
    assert document.xpath("//*[@id='brandFilters']")
    assert document.xpath("//*[@id='colorFilters']")
    assert document.xpath("//*[@id='sortSelect']")
    assert document.xpath("//*[@id='showSelect']")
    assert document.xpath("//*[@id='shopFilters']")
    assert document.xpath("//link[@href='/static/css/shop-modern.css']")
    assert document.xpath("//script[@src='/static/js/shop-modern.js']")


def test_storefront_inner_pages_share_modern_theme_and_valid_heading_structure():
    client = TestClient(storefront_app)
    paths = (
        "/category", "/category-product", "/category-slug", "/single-product",
        "/cart", "/wishlist", "/my-account", "/my-mobile-account", "/login",
        "/reset-password", "/services", "/logiciels", "/about", "/contact",
        "/faq", "/terms-and-conditions", "/blog",
    )

    for path in paths:
        response = client.get(path)
        assert response.status_code == 200
        document = html.fromstring(response.text)
        assert document.xpath("string(//html/@lang)") == "fr-TG"
        assert len(document.xpath("//h1")) == 1
        assert "nt-inner-page" in document.xpath("string(//body/@class)")
        assert document.xpath("//link[starts-with(@href, '/static/css/inner-modern.css')]")

        element_ids = document.xpath("//@id")
        assert len(element_ids) == len(set(element_ids))


def test_private_storefront_pages_are_not_indexable():
    client = TestClient(storefront_app)

    for path in ("/cart", "/wishlist", "/my-account", "/my-mobile-account", "/login", "/reset-password"):
        response = client.get(path)
        document = html.fromstring(response.text)
        directives = " ".join(document.xpath("//meta[@name='robots']/@content"))
        assert "noindex" in directives


def test_internal_brand_carousels_use_shared_theme_without_touching_home():
    css = Path("templates/ecommerce/app/static/css/inner-modern.css").read_text(encoding="utf-8")
    home = TestClient(storefront_app).get("/")

    assert ".nt-inner-page .marque-container" in css
    assert "/static/css/inner-modern.css" not in home.text


def test_product_review_button_has_dedicated_visible_states():
    product_js = Path("templates/ecommerce/app/static/js/product.js").read_text(encoding="utf-8")
    css = Path("templates/ecommerce/app/static/css/inner-modern.css").read_text(encoding="utf-8")

    assert 'class="nt-review-submit"' in product_js
    assert "nt-review-submit__label" in product_js
    assert "is-loading" in product_js
    assert "is-success" in product_js
    assert ".nt-review-submit" in css
    assert "color: #fff !important" in css
    assert "prefers-reduced-motion" in css


def test_cart_quantity_controls_are_ajax_only_and_bounded():
    cart_js = Path("templates/ecommerce/app/static/js/cart.js").read_text(encoding="utf-8")
    cart_schema = Path("schemas/cart_schema.py").read_text(encoding="utf-8")

    assert 'type="button" class="nt-cart-minus' in cart_js
    assert 'type="button" class="nt-cart-plus' in cart_js
    assert "queueQuantityUpdate" in cart_js
    assert "Math.max(1, qty - 1)" in cart_js
    assert "quantity: int = Field(ge=1)" in cart_schema


def test_contextual_blog_and_promotion_rail_is_shared_and_accessible():
    rail_js = Path("templates/ecommerce/app/static/js/context-rail.js").read_text(encoding="utf-8")
    rail_css = Path("templates/ecommerce/app/static/css/context-rail.css").read_text(encoding="utf-8")
    cart_utils = Path("templates/ecommerce/app/static/js/cart_utils.js").read_text(encoding="utf-8")

    assert "/blog/latest?limit=6" in rail_js
    assert "/products/featured" in rail_js
    assert "/products/on-sale" in rail_js
    assert "/products/top-rated" in rail_js
    assert "aria-label" in rail_js
    assert "position: fixed" in rail_css
    assert "prefers-reduced-motion" in rail_css
    assert "context-rail.js?v=" in cart_utils


def test_dashboard_product_editor_sends_explicit_main_image_selection():
    dashboard_js = Path("templates/dashboard/app/static/js/product.js").read_text(encoding="utf-8")
    dashboard_template = Path("templates/dashboard/app/templates/product_manage.html").read_text(encoding="utf-8")

    assert 'formData.append("main_image_id", mainImageId)' in dashboard_js
    assert 'formData.append("new_main_image_index"' in dashboard_js
    assert "selectNewMainImage" in dashboard_js
    assert "setTimeout(() =>" not in dashboard_js[dashboard_js.index("function previewNewImages"):dashboard_js.index("function createPreviewContainer")]
    assert "product.js?v=20260810-main-image-fix" in dashboard_template


def test_modern_navigation_and_footer_components_render():
    client = TestClient(storefront_app)
    expected_ids = {
        "/nav": {"currencyDropdown", "sidebarNavToggler"},
        "/search": {
            "searchProduct", "searchProduct1", "search-results",
            "cart-count", "cart-total", "wishlist-count", "desktopAccountLink",
        },
        "/mobile-menu": {
            "mobileSearchInput", "mobileSearchButton",
            "mobile-search-results", "cart-count-mobile", "cart-total-mobile",
        },
        "/footer": {"subscribeSrEmail", "subscribeButton"},
    }

    for path, required_ids in expected_ids.items():
        response = client.get(path)
        assert response.status_code == 200
        document = html.fromstring(response.text)
        element_ids = document.xpath("//@id")
        assert required_ids.issubset(set(element_ids))
        assert len(element_ids) == len(set(element_ids))

        if path == "/nav":
            assert document.xpath("//*[@data-currency='USD']")
            assert document.xpath("//*[@data-currency='EUR']")

    search = client.get("/search")
    search_document = html.fromstring(search.text)
    assert search_document.xpath("//a[@id='desktopAccountLink']/@href") == [
        "/my-mobile-account"
    ]
    assert search_document.xpath("//a[@href='/blog']")


def test_blog_public_api_and_admin_protection():
    client = TestClient(api_app)

    assert client.get("/blog/").status_code == 200
    assert client.get("/blog/taxonomy").status_code == 200
    assert client.get("/blog/admin/all").status_code == 401


def test_social_login_is_explicitly_unavailable():
    document = html.fromstring(TestClient(storefront_app).get("/auth").text)
    buttons = document.xpath("//*[@data-social-unavailable]")

    assert len(buttons) == 4
    assert all(button.get("aria-disabled") == "true" for button in buttons)


def test_dashboard_home_renders():
    client = TestClient(dashboard_app)
    client.cookies.set(
        settings.ADMIN_COOKIE_NAME,
        create_access_token({"admin_id": 1}),
    )
    response = client.get("/")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert 'id="registered-products"' in response.text


def test_dashboard_blog_manager_is_protected_and_rendered_for_admin():
    anonymous = TestClient(dashboard_app).get("/blog_manage", follow_redirects=False)
    assert anonymous.status_code == 303
    assert anonymous.headers["location"] == "/login"

    client = TestClient(dashboard_app)
    client.cookies.set(
        settings.ADMIN_COOKIE_NAME,
        create_access_token({"admin_id": 1}),
    )
    response = client.get("/blog_manage")
    document = html.fromstring(response.text)

    assert response.status_code == 200
    assert document.xpath("//form[@id='blogForm']")
    assert document.xpath("//*[@id='blogPostList']")
    assert document.xpath("//*[@id='blogPagination']")
    assert document.xpath("//script[@src='/static/js/blog-admin.js']")


def test_dashboard_navigation_exposes_blog_manager():
    client = TestClient(dashboard_app)
    client.cookies.set(
        settings.ADMIN_COOKIE_NAME,
        create_access_token({"admin_id": 1}),
    )
    response = client.get("/nav")
    document = html.fromstring(response.text)

    assert response.status_code == 200
    assert document.xpath("//a[@href='/blog_manage']")


def test_dashboard_redirects_anonymous_visitors_to_login():
    response = TestClient(dashboard_app).get("/", follow_redirects=False)

    assert response.status_code == 303
    assert response.headers["location"] == "/login"


def test_dashboard_login_redirects_authenticated_admin():
    client = TestClient(dashboard_app)
    client.cookies.set(
        settings.ADMIN_COOKIE_NAME,
        create_access_token({"admin_id": 1}),
    )

    response = client.get("/login", follow_redirects=False)

    assert response.status_code == 303
    assert response.headers["location"] == "/"


def test_dashboard_logout_clears_session_cookie():
    client = TestClient(dashboard_app)
    client.cookies.set(
        settings.ADMIN_COOKIE_NAME,
        create_access_token({"admin_id": 1}),
    )

    response = client.get("/logout", follow_redirects=False)

    assert response.status_code == 303
    assert response.headers["location"] == "/login"
    assert settings.ADMIN_COOKIE_NAME in response.headers["set-cookie"]
    assert "Max-Age=0" in response.headers["set-cookie"]


def test_dashboard_login_uses_modern_secure_form():
    response = TestClient(dashboard_app).get("/login")
    document = html.fromstring(response.text)

    assert response.status_code == 200
    assert document.xpath("string(//html/@lang)") == "fr"
    assert document.xpath("//link[@href='/static/css/login-modern.css']")
    assert document.xpath("//form[@id='loginForm']")
    assert document.xpath("//input[@autocomplete='username']")
    assert document.xpath("//input[@autocomplete='current-password']")
    assert 'credentials: "include"' in response.text
