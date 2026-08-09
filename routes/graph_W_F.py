from fastapi import APIRouter, Depends, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from database import get_db
from models.model_product import Product

templates = Jinja2Templates(directory="templates")

router = APIRouter(prefix="/graph", tags=["Graph"])
@router.get("/{slug}")
async def get_product_page(slug: str, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.slug == slug).first()
    
    if not product:
        return HTMLResponse("<h1>404 - Produit non trouvé</h1>", status_code=404)
    
    image_url = product.images[0].image_url if product.images else "default.jpg"
    product_url = f"https://newtechnologiestg.com/single-product?slug={slug}"
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>{product.name}</title>
        <meta property="og:title" content="{product.name}" />
        <meta property="og:description" content="{product.description[:150]}..." />
        <meta property="og:image" content="https://api.newtechnologiestg.com/{image_url}" />
        <meta property="og:url" content="{product_url}" />
        <meta property="og:type" content="product" />
        
        <!-- ✅ REDIRECTION AUTOMATIQUE VERS LA VRAIE PAGE -->
        <meta http-equiv="refresh" content="0; url={product_url}" />
    </head>
    <body>
        <!-- Optionnel : un message qui s'affiche si la redirection échoue -->
        <p>Redirection vers <a href="{product_url}">{product.name}</a>...</p>
    </body>
    </html>
    """
    
    return HTMLResponse(content=html)