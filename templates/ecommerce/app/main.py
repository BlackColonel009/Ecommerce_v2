from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, PlainTextResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pathlib import Path
from datetime import date
import math
import sys

from sqlalchemy import bindparam, text
from sqlalchemy.exc import SQLAlchemyError

PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from database import engine

app = FastAPI()

APP_DIR = Path(__file__).resolve().parent
app.mount("/static", StaticFiles(directory=APP_DIR / "static"), name="static")
templates = Jinja2Templates(directory=APP_DIR / "templates")


@app.middleware("http")
async def cache_static_assets(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/static/") and response.status_code == 200:
        suffix = Path(request.url.path).suffix.lower()
        if suffix in {".js", ".css"}:
            # Les fichiers applicatifs doivent être revalidés pour éviter qu'une
            # ancienne version JS ne continue à bloquer une page après un correctif.
            response.headers["Cache-Control"] = "no-cache"
        else:
            response.headers.setdefault("Cache-Control", "public, max-age=604800")
    return response

PUBLIC_SITE_URL = "https://newtechnologiestg.com"
SITEMAP_PATHS = (
    ("/", "daily", "1.0"),
    ("/shop", "daily", "0.9"),
    ("/category", "weekly", "0.8"),
    ("/services", "monthly", "0.8"),
    ("/logiciels", "weekly", "0.8"),
    ("/about", "monthly", "0.6"),
    ("/contact", "monthly", "0.6"),
    ("/faq", "monthly", "0.6"),
    ("/terms-and-conditions", "yearly", "0.3"),
    ("/blog", "weekly", "0.8"),
)


def api_base_for(request: Request) -> str:
    return "http://localhost:8010" if request.url.hostname in {"localhost", "127.0.0.1"} else "https://api.newtechnologiestg.com"


def as_dicts(result):
    return [dict(row) for row in result.mappings().all()]


def public_blog_posts(page=1, limit=9, q="", category="", tag=""):
    conditions = ["status = 'published'", "(published_at IS NULL OR published_at <= CURRENT_TIMESTAMP)"]
    params = {"limit": limit, "offset": (page - 1) * limit}
    if q:
        conditions.append("(LOWER(title) LIKE :q OR LOWER(excerpt) LIKE :q OR LOWER(content) LIKE :q)")
        params["q"] = f"%{q.lower()}%"
    if category:
        conditions.append("LOWER(category) = :category")
        params["category"] = category.lower()
    if tag:
        conditions.append("LOWER(tags) LIKE :tag")
        params["tag"] = f"%{tag.lower()}%"
    where = " AND ".join(conditions)
    try:
        with engine.connect() as connection:
            total = connection.execute(text(f"SELECT COUNT(*) FROM blog_posts WHERE {where}"), params).scalar_one()
            rows = connection.execute(text(
                f"SELECT * FROM blog_posts WHERE {where} "
                "ORDER BY is_featured DESC, published_at DESC, created_at DESC LIMIT :limit OFFSET :offset"
            ), params)
            return as_dicts(rows), total
    except SQLAlchemyError:
        return [], 0


def public_blog_post(slug: str):
    try:
        with engine.connect() as connection:
            row = connection.execute(text(
                "SELECT * FROM blog_posts WHERE slug = :slug AND status = 'published' "
                "AND (published_at IS NULL OR published_at <= CURRENT_TIMESTAMP)"
            ), {"slug": slug}).mappings().first()
            return dict(row) if row else None
    except SQLAlchemyError:
        return None


def public_blog_taxonomy():
    try:
        with engine.connect() as connection:
            rows = connection.execute(text(
                "SELECT category, tags FROM blog_posts WHERE status = 'published' "
                "AND (published_at IS NULL OR published_at <= CURRENT_TIMESTAMP)"
            )).mappings().all()
        categories = sorted({row["category"] for row in rows if row["category"]}, key=str.casefold)
        tags = sorted({tag.strip() for row in rows for tag in (row["tags"] or "").split(",") if tag.strip()}, key=str.casefold)
        return categories, tags
    except SQLAlchemyError:
        return [], []


def related_blog_posts(post, limit=3):
    if not post:
        return []
    try:
        with engine.connect() as connection:
            rows = connection.execute(text(
                "SELECT * FROM blog_posts WHERE status = 'published' AND id != :id "
                "AND (published_at IS NULL OR published_at <= CURRENT_TIMESTAMP) "
                "ORDER BY CASE WHEN category = :category THEN 0 ELSE 1 END, published_at DESC LIMIT :limit"
            ), {"id": post["id"], "category": post["category"], "limit": limit})
            return as_dicts(rows)
    except SQLAlchemyError:
        return []


def related_products(csv_slugs):
    slugs = [slug.strip() for slug in (csv_slugs or "").split(",") if slug.strip()]
    if not slugs:
        return []
    statement = text(
        "SELECT p.id, p.name, p.slug, "
        "(SELECT image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_main DESC, pi.id LIMIT 1) AS image_url, "
        "(SELECT price FROM prices pr WHERE pr.product_id = p.id ORDER BY pr.id LIMIT 1) AS price "
        "FROM products p WHERE p.slug IN :slugs AND p.is_deleted = false"
    ).bindparams(bindparam("slugs", expanding=True))
    try:
        with engine.connect() as connection:
            return as_dicts(connection.execute(statement, {"slugs": slugs}))
    except SQLAlchemyError:
        return []


@app.get("/robots.txt", response_class=PlainTextResponse, include_in_schema=False)
def robots_txt():
    return "\n".join(
        (
            "User-agent: *",
            "Allow: /",
            "Disallow: /auth",
            "Disallow: /cart",
            "Disallow: /wishlist",
            "Disallow: /my-account",
            "Disallow: /my-mobile-account",
            f"Sitemap: {PUBLIC_SITE_URL}/sitemap.xml",
        )
    )


@app.get("/sitemap.xml", include_in_schema=False)
def sitemap_xml():
    last_modified = date.today().isoformat()
    entries = "".join(
        f"<url><loc>{PUBLIC_SITE_URL}{path}</loc><lastmod>{last_modified}</lastmod>"
        f"<changefreq>{frequency}</changefreq><priority>{priority}</priority></url>"
        for path, frequency, priority in SITEMAP_PATHS
    )
    try:
        with engine.connect() as connection:
            slugs = connection.execute(text(
                "SELECT slug, COALESCE(updated_at, created_at) AS modified FROM blog_posts "
                "WHERE status = 'published' AND (published_at IS NULL OR published_at <= CURRENT_TIMESTAMP)"
            )).mappings().all()
        entries += "".join(
            f"<url><loc>{PUBLIC_SITE_URL}/blog/{row['slug']}</loc><lastmod>{row['modified'].date().isoformat()}</lastmod>"
            "<changefreq>monthly</changefreq><priority>0.7</priority></url>" for row in slugs
        )
    except SQLAlchemyError:
        pass
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        f"{entries}</urlset>"
    )
    return Response(content=xml, media_type="application/xml")

@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse(request, "index-modern.html")


@app.get("/blog", response_class=HTMLResponse)
def blog_index(request: Request, page: int = 1, q: str = "", category: str = "", tag: str = ""):
    page = max(1, page)
    posts, total = public_blog_posts(page=page, q=q.strip(), category=category.strip(), tag=tag.strip())
    categories, tags = public_blog_taxonomy()
    return templates.TemplateResponse(request, "blog.html", {
        "posts": posts, "total": total, "page": page, "pages": max(1, math.ceil(total / 9)),
        "q": q.strip(), "category": category.strip(), "tag": tag.strip(), "categories": categories, "tags": tags,
        "api_base": api_base_for(request),
    })


@app.get("/blog/{slug}", response_class=HTMLResponse)
def blog_article(request: Request, slug: str):
    post = public_blog_post(slug)
    status_code = 200 if post else 404
    return templates.TemplateResponse(request, "blog-article.html", {
        "post": post, "related_posts": related_blog_posts(post),
        "related_products": related_products(post.get("related_product_slugs") if post else None),
        "api_base": api_base_for(request), "public_url": PUBLIC_SITE_URL,
    }, status_code=status_code)

@app.get("/footer", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse(request, "footer-modern.html")

@app.get("/login", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("mobile-account.html", {"request": request})

@app.get("/reset-password", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("reset-password.html", {"request": request})

@app.get("/nav", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse(request, "nav-home-modern.html")

@app.get("/auth", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("auth_client.html", {"request": request})

@app.get("/search", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse(request, "search-bar-modern.html")



@app.get("/mobile-menu", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse(request, "mobile-menu-modern.html")

@app.get("/marque", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("shop.html", {"request": request})


@app.get("/shop", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("shop.html", {"request": request})

@app.get("/category-product", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("product-category.html", {"request": request})

@app.get("/category-slug", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("product-category_slug.html", {"request": request})

@app.get("/category", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("category.html", {"request": request})

@app.get("/single-product", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("single-product.html", {"request": request})



@app.get("/cart", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("cart.html", {"request": request})

@app.get("/wishlist", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("wishlist.html", {"request": request})

@app.get("/terms-and-conditions", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("terms-and-conditions.html", {"request": request})

@app.get("/contact", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("contact.html", {"request": request})

@app.get("/about", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("about.html", {"request": request})

@app.get("/my-account", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("my-account.html", {"request": request})


@app.get("/my-mobile-account", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("mobile-account.html", {"request": request})

@app.get("/faq", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("faq.html", {"request": request})

@app.get("/services", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("services.html", {"request": request})

@app.get("/logiciels", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("logiciels.html", {"request": request})


# --------------------------------------------
# 404
# --------------------------------------------

@app.get("/blog", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("Blog-404.html", {"request": request})

@app.get("/home1", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("home1.html", {"request": request})
