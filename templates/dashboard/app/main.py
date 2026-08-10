from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pathlib import Path
import sys
from jose import JWTError, jwt

PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from config import settings

app = FastAPI()

APP_DIR = Path(__file__).resolve().parent
app.mount("/static", StaticFiles(directory=APP_DIR / "static"), name="static")
templates = Jinja2Templates(directory=APP_DIR / "templates")

PUBLIC_PATHS = {"/login", "/forgot-password", "/logout"}


def has_valid_admin_session(request: Request) -> bool:
    token = request.cookies.get(settings.ADMIN_COOKIE_NAME)
    if not token:
        return False

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload.get("admin_id") is not None
    except JWTError:
        return False


@app.middleware("http")
async def protect_dashboard(request: Request, call_next):
    path = request.url.path.rstrip("/") or "/"
    is_static = path == "/static" or path.startswith("/static/")
    session_is_valid = has_valid_admin_session(request)

    if path == "/login" and session_is_valid:
        return RedirectResponse(url="/", status_code=303)

    if not is_static and path not in PUBLIC_PATHS and not session_is_valid:
        response = RedirectResponse(url="/login", status_code=303)
        if request.cookies.get(settings.ADMIN_COOKIE_NAME):
            response.delete_cookie(
                settings.ADMIN_COOKIE_NAME,
                path="/",
                secure=settings.admin_cookie_is_secure(request.url.hostname),
                httponly=True,
                samesite="lax",
                domain=settings.admin_cookie_domain_for_host(request.url.hostname),
            )
        return response

    return await call_next(request)

@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/cards", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("cards.html", {"request": request})

@app.get("/buttons", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("buttons.html", {"request": request})

@app.get("/blank", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("blank.html", {"request": request})

@app.get("/product_manage", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("product_manage.html", {"request": request})

@app.get("/marketing", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("marketing.html", {"request": request})

@app.get("/popup_promos", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("popup_promos.html", {"request": request})

@app.get("/leads_manage", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("leads_manage.html", {"request": request})
    

@app.get("/support_manage", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("support_manage.html", {"request": request})

@app.get("/trash", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("trash.html", {"request": request})


@app.get("/404", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("404.html", {"request": request})

@app.get("/charts", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("charts.html", {"request": request})

@app.get("/forgot-password", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("forgot-password.html", {"request": request})

@app.get("/tables", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("tables.html", {"request": request})

@app.get("/utilities_animation", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("utilities-animation.html", {"request": request})

@app.get("/utilities_other", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("utilities-other.html", {"request": request})

@app.get("/utilities_color", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("utilities-color.html", {"request": request})

@app.get("/utilities_border", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("utilities-border.html", {"request": request})

# @app.get("/footer", response_class=HTMLResponse)
# def index(request: Request):
#     return templates.TemplateResponse("footer.html", {"request": request})

@app.get("/login", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})


@app.get("/logout")
def logout(request: Request):
    response = RedirectResponse(url="/login", status_code=303)
    response.delete_cookie(
        settings.ADMIN_COOKIE_NAME,
        path="/",
        secure=settings.admin_cookie_is_secure(request.url.hostname),
        httponly=True,
        samesite="lax",
        domain=settings.admin_cookie_domain_for_host(request.url.hostname),
    )
    return response

@app.get("/nav", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("nav.html", {"request": request})

@app.get("/topnav", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("top_nav_bar.html", {"request": request})

# @app.get("/reset-password", response_class=HTMLResponse)
# def index(request: Request):
#     return templates.TemplateResponse("reset-password.html", {"request": request})

@app.get("/register", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})

@app.get("/clients", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("clients.html", {"request": request})

@app.get("/newsletter", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("newsletter-manager.html", {"request": request})


@app.get("/blog_manage", response_class=HTMLResponse)
def blog_manage(request: Request):
    return templates.TemplateResponse("blog_manage.html", {"request": request})





