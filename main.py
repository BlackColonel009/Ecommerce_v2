from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request, Response
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from jose import JWTError
import jwt
from config import settings
from policy import afficher_banner
from routes import admin, banner, blog, brands, cart, category, compare, graph_W_F, lead, newsletter, popups, popups_promo, product, promos, recent, review, roles_permissions, stats, support, favoris, visitor, filtre
from script.init_db import init_database
# from routes import (user, annonces, favoris , clicked, galerie)


afficher_banner()


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Démarrage de l'API...")
    init_database()
    print("✅ API prête!")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API de site E-commerce NewTechnologies (petite, moyenne, grande) 📊",
    version=settings.PROJECT_VERSION,
    lifespan=lifespan,
)
app.mount(
    "/uploads", StaticFiles(directory="uploads"), name="uploads"
)


@app.middleware("http")
async def cache_uploaded_images(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/uploads/") and response.status_code == 200:
        response.headers.setdefault("Cache-Control", "public, max-age=604800")
    return response


@app.get("/placeholder.jpg", include_in_schema=False)
@app.get("/images/placeholder.jpg", include_in_schema=False)
def product_placeholder():
    return FileResponse(
        "uploads/products/demo-placeholders/demo-accessory.webp",
        media_type="image/webp",
        headers={"Cache-Control": "public, max-age=604800"},
    )
app.include_router(category.router)
app.include_router(brands.router)
app.include_router(promos.router)
app.include_router(popups.router)
app.include_router(banner.router)
app.include_router(support.router)
app.include_router(product.router)
app.include_router(recent.router)
app.include_router(cart.router)
app.include_router(favoris.router)
app.include_router(compare.router)
app.include_router(popups_promo.router)
app.include_router(lead.router)

app.include_router(admin.router)
app.include_router(roles_permissions.router)
app.include_router(stats.router)
app.include_router(visitor.router)
app.include_router(filtre.router)
app.include_router(review.router)
app.include_router(newsletter.router)
app.include_router(graph_W_F.router)
app.include_router(blog.router)




app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# app.include_router(user.router, prefix="/auth", tags=["Authentification"])
# app.mount("/static", StaticFiles(directory="static"), name="static")
# app.include_router(annonces.router)
# app.include_router(favoris.router)
# app.include_router(clicked.router)
# app.include_router(galerie.router)


# Route de test
@app.get("/", tags=["Test"])
def read_root():
    return {"message": "Bienvenue sur l’API site E-commerce NewTechnologies"}

@app.head("/")
def head_root():
    return JSONResponse(content=None)
