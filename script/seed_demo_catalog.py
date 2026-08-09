"""Remplit la base avec un catalogue fictif couvrant les catégories demandées.

Le script crée un produit de démonstration par slug de catégorie, plusieurs
marques, prix, stocks, couleurs, caractéristiques et quelques variantes. Les
illustrations raster sont générées localement dans ``uploads/products``.

Exécution depuis la racine du projet :
    ./.venv/Scripts/python.exe script/seed_demo_catalog.py

Le script est idempotent : les slugs ``demo-*`` existants sont mis à jour et ne
sont jamais dupliqués.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

from dotenv import load_dotenv
from PIL import Image, ImageDraw, ImageFont
from sqlalchemy import create_engine, insert, select, update


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
load_dotenv(PROJECT_ROOT / ".env")

from database import Base, engine as project_engine  # noqa: E402
from models.model_brands import ProductBrand  # noqa: E402
from models.model_category import ProductCategory  # noqa: E402
from models.model_product import (  # noqa: E402
    Inventory,
    Price,
    Product,
    ProductColor,
    ProductImage,
    ProductSpec,
    ProductVariant,
)


RAW_CATEGORY_SLUGS = """
laptop,accesoires-info
laptop
desktop
ecran
imprimante
toner-encre
resaux
accessoires-info
office,windows
camera,camera-accesoires,camera-security
camera-accesoires-cam
camera-security
audio
speaker,headphone
smartphones,smartphones-ref
smartphones
smartphones-ref
smartphones-accesoires
tablettes
tablettes-accesoires
games
consoles
consoles-accesoires
setup-gaming
consoles-accesoires,consoles,games,setup-gaming
smart-tv, projecteur
headphone
speaker,audio
video-accesoires-o-v
montres-h,montres-f
montres-h
montres-f
montres-p
montres-promo
imprimante,jet-encre,copieur
jet-encre
scanner
copieur
toner
encre
office
licence-num-office
windows
licence-num-windows
pieces,memoire,disque,carte-m,processeur,alimentation,boitier-pc,refroidisseur,graphique,accesoires-pc
disque
carte-m
processeur
alimentation
boitier-pc
refroidisseur
graphique
accesoires-pc
headphone-gaming
souris-gaming
clavier-gaming
tapis-gaming
chaise-gaming
pose-gaming
console-accesoires
laptop-occas
desktop-occas
smartphones-occas
smart-occas
ecran-occas
batterie
chargeurs-pc
speaker,audio,accesoires-o-v
usb,carte-memoire,adaptateur-wifi
onduleurs,batterie-onduleurs
reseaux,switch,routeur,accessoires-reseaux
"""


def unique_category_slugs() -> tuple[str, ...]:
    values: list[str] = []
    seen: set[str] = set()
    for value in re.split(r"[\s,]+", RAW_CATEGORY_SLUGS.strip()):
        slug = value.strip().lower()
        if slug and slug not in seen:
            seen.add(slug)
            values.append(slug)
    return tuple(values)


CATEGORY_SLUGS = unique_category_slugs()

CATEGORY_NAMES = {
    "accesoires-info": "Accessoires informatiques",
    "accessoires-info": "Accessoires informatiques essentiels",
    "resaux": "Réseaux informatiques",
    "reseaux": "Réseaux et connectivité",
    "camera-accesoires": "Accessoires caméra",
    "camera-accesoires-cam": "Accessoires caméras avancés",
    "camera-security": "Caméras de sécurité",
    "smartphones-ref": "Smartphones reconditionnés",
    "smartphones-accesoires": "Accessoires smartphones",
    "tablettes-accesoires": "Accessoires tablettes",
    "consoles-accesoires": "Accessoires consoles",
    "console-accesoires": "Accessoires de console",
    "video-accesoires-o-v": "Accessoires vidéo",
    "accesoires-o-v": "Accessoires audio-vidéo",
    "montres-h": "Montres homme",
    "montres-f": "Montres femme",
    "montres-p": "Montres premium",
    "montres-promo": "Montres en promotion",
    "jet-encre": "Imprimantes jet d’encre",
    "licence-num-office": "Licences numériques Office",
    "licence-num-windows": "Licences numériques Windows",
    "carte-m": "Cartes mères",
    "boitier-pc": "Boîtiers PC",
    "accesoires-pc": "Accessoires PC",
    "laptop-occas": "Ordinateurs portables d’occasion",
    "desktop-occas": "Ordinateurs de bureau d’occasion",
    "smartphones-occas": "Smartphones d’occasion",
    "smart-occas": "Téléviseurs connectés d’occasion",
    "ecran-occas": "Écrans d’occasion",
    "chargeurs-pc": "Chargeurs PC",
    "carte-memoire": "Cartes mémoire",
    "adaptateur-wifi": "Adaptateurs Wi-Fi",
    "batterie-onduleurs": "Batteries pour onduleurs",
    "accessoires-reseaux": "Accessoires réseaux",
}

PARENT_SLUGS = {
    "laptop": "accesoires-info",
    "desktop": "accesoires-info",
    "ecran": "accesoires-info",
    "accessoires-info": "accesoires-info",
    "camera-accesoires": "camera",
    "camera-accesoires-cam": "camera",
    "camera-security": "camera",
    "speaker": "audio",
    "headphone": "audio",
    "smartphones-ref": "smartphones",
    "smartphones-accesoires": "smartphones",
    "tablettes-accesoires": "tablettes",
    "consoles": "games",
    "consoles-accesoires": "games",
    "console-accesoires": "games",
    "setup-gaming": "games",
    "headphone-gaming": "setup-gaming",
    "souris-gaming": "setup-gaming",
    "clavier-gaming": "setup-gaming",
    "tapis-gaming": "setup-gaming",
    "chaise-gaming": "setup-gaming",
    "pose-gaming": "setup-gaming",
    "jet-encre": "imprimante",
    "scanner": "imprimante",
    "copieur": "imprimante",
    "toner": "toner-encre",
    "encre": "toner-encre",
    "licence-num-office": "office",
    "licence-num-windows": "windows",
    "memoire": "pieces",
    "disque": "pieces",
    "carte-m": "pieces",
    "processeur": "pieces",
    "alimentation": "pieces",
    "boitier-pc": "pieces",
    "refroidisseur": "pieces",
    "graphique": "pieces",
    "accesoires-pc": "pieces",
    "laptop-occas": "laptop",
    "desktop-occas": "desktop",
    "smartphones-occas": "smartphones",
    "ecran-occas": "ecran",
    "chargeurs-pc": "accessoires-info",
    "usb": "accessoires-info",
    "carte-memoire": "accessoires-info",
    "adaptateur-wifi": "accessoires-info",
    "batterie-onduleurs": "onduleurs",
    "switch": "reseaux",
    "routeur": "reseaux",
    "accessoires-reseaux": "reseaux",
}


PRODUCT_PROFILES = {
    "laptop": {
        "title": "NovaBook Air 14",
        "brand": "NovaByte",
        "price": 389_000,
        "colors": ("Noir", "Argent"),
        "specs": (("Écran", "14 pouces Full HD"), ("Mémoire", "16 Go"), ("Stockage", "512 Go SSD")),
        "variants": True,
    },
    "desktop": {
        "title": "AlphaCore Station",
        "brand": "AlphaCore",
        "price": 425_000,
        "colors": ("Noir",),
        "specs": (("Processeur", "Core i5 fictif"), ("Mémoire", "16 Go"), ("Stockage", "1 To SSD")),
        "variants": True,
    },
    "display": {
        "title": "Visionix Crystal View",
        "brand": "Visionix",
        "price": 185_000,
        "colors": ("Noir", "Gris"),
        "specs": (("Définition", "4K UHD"), ("Connectique", "HDMI / USB"), ("Garantie", "12 mois")),
    },
    "printer": {
        "title": "Printora OfficeJet",
        "brand": "Printora",
        "price": 145_000,
        "colors": ("Blanc", "Noir"),
        "specs": (("Format", "A4"), ("Connexion", "Wi-Fi / USB"), ("Usage", "Bureau")),
    },
    "camera": {
        "title": "SecureCam Vision Pro",
        "brand": "SecureCam",
        "price": 98_000,
        "colors": ("Noir", "Blanc"),
        "specs": (("Résolution", "4 MP"), ("Vision", "Jour et nuit"), ("Connexion", "IP / Wi-Fi")),
    },
    "audio": {
        "title": "SoundPeak Pulse",
        "brand": "SoundPeak",
        "price": 42_500,
        "colors": ("Noir", "Rouge"),
        "specs": (("Connexion", "Bluetooth 5"), ("Autonomie", "20 heures"), ("Audio", "Stéréo")),
    },
    "phone": {
        "title": "NovaPhone X",
        "brand": "NovaByte",
        "price": 245_000,
        "colors": ("Noir", "Bleu", "Or"),
        "specs": (("Écran", "6,5 pouces"), ("Mémoire", "8 Go"), ("Stockage", "256 Go")),
        "variants": True,
    },
    "tablet": {
        "title": "NovaTab Studio",
        "brand": "NovaByte",
        "price": 210_000,
        "colors": ("Gris", "Argent"),
        "specs": (("Écran", "11 pouces"), ("Mémoire", "8 Go"), ("Stockage", "128 Go")),
        "variants": True,
    },
    "gaming": {
        "title": "GameForge Arena",
        "brand": "GameForge",
        "price": 175_000,
        "colors": ("Noir", "Rouge"),
        "specs": (("Compatibilité", "PC et console"), ("Connexion", "USB / Sans fil"), ("Édition", "Gaming")),
        "variants": True,
    },
    "watch": {
        "title": "Chronix Smart One",
        "brand": "Chronix",
        "price": 68_000,
        "colors": ("Noir", "Or", "Rose"),
        "specs": (("Écran", "AMOLED"), ("Autonomie", "7 jours"), ("Résistance", "IP68")),
    },
    "software": {
        "title": "SoftKey Licence Numérique",
        "brand": "SoftKey",
        "price": 35_000,
        "colors": ("Numérique",),
        "specs": (("Livraison", "Code numérique"), ("Activation", "1 appareil"), ("Durée", "Licence permanente")),
    },
    "component": {
        "title": "AlphaCore Component",
        "brand": "AlphaCore",
        "price": 92_000,
        "colors": ("Noir",),
        "specs": (("Format", "Standard PC"), ("Compatibilité", "Configuration moderne"), ("Garantie", "6 mois")),
    },
    "network": {
        "title": "NetWave Connect",
        "brand": "NetWave",
        "price": 56_000,
        "colors": ("Noir", "Blanc"),
        "specs": (("Réseau", "Gigabit"), ("Connexion", "Wi-Fi / Ethernet"), ("Gestion", "Interface web")),
    },
    "power": {
        "title": "VoltSafe Power",
        "brand": "VoltSafe",
        "price": 78_000,
        "colors": ("Noir",),
        "specs": (("Protection", "Surtension"), ("Autonomie", "Variable"), ("Usage", "Informatique")),
    },
    "accessory": {
        "title": "Connectix Accessory",
        "brand": "Connectix",
        "price": 18_500,
        "colors": ("Noir", "Blanc"),
        "specs": (("Connexion", "Plug and play"), ("Compatibilité", "Universelle"), ("Garantie", "3 mois")),
    },
}


def category_name(slug: str) -> str:
    if slug in CATEGORY_NAMES:
        return CATEGORY_NAMES[slug]
    return " ".join(part.capitalize() for part in slug.split("-"))


def profile_key_for_slug(slug: str) -> str:
    if "occas" in slug:
        if "laptop" in slug:
            return "laptop"
        if "desktop" in slug:
            return "desktop"
        if "smartphone" in slug:
            return "phone"
        return "display"
    if slug.startswith("laptop"):
        return "laptop"
    if slug.startswith("desktop"):
        return "desktop"
    if slug in {"ecran", "smart-tv", "projecteur", "video-accesoires-o-v"}:
        return "display"
    if slug in {"imprimante", "jet-encre", "scanner", "copieur", "toner", "encre", "toner-encre"}:
        return "printer"
    if slug.startswith("camera"):
        return "camera"
    if slug in {"audio", "speaker", "headphone", "accesoires-o-v"}:
        return "audio"
    if slug.startswith("smartphones"):
        return "phone"
    if slug.startswith("tablettes"):
        return "tablet"
    if "gaming" in slug or slug in {"games", "consoles", "consoles-accesoires", "console-accesoires"}:
        return "gaming"
    if slug.startswith("montres"):
        return "watch"
    if slug in {"office", "windows", "licence-num-office", "licence-num-windows"}:
        return "software"
    if slug in {"pieces", "memoire", "disque", "carte-m", "processeur", "boitier-pc", "refroidisseur", "graphique", "accesoires-pc"}:
        return "component"
    if slug in {"resaux", "reseaux", "switch", "routeur", "accessoires-reseaux", "adaptateur-wifi"}:
        return "network"
    if slug in {"batterie", "onduleurs", "batterie-onduleurs", "alimentation", "chargeurs-pc"}:
        return "power"
    return "accessory"


def load_font(size: int, bold: bool = False):
    candidates = (
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    )
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def draw_product_icon(draw: ImageDraw.ImageDraw, key: str) -> None:
    black, red, yellow, gray, white = "#17181b", "#ed0012", "#edd500", "#c9cbd0", "#ffffff"

    if key == "laptop":
        draw.rounded_rectangle((180, 170, 620, 480), radius=24, fill=black)
        draw.rounded_rectangle((205, 195, 595, 450), radius=12, fill="#e9edf2")
        draw.polygon([(145, 505), (655, 505), (715, 600), (85, 600)], fill="#555961")
        draw.rounded_rectangle((300, 525, 500, 565), radius=9, fill=gray)
    elif key == "desktop":
        draw.rounded_rectangle((115, 200, 500, 480), radius=18, fill=black)
        draw.rounded_rectangle((140, 225, 475, 450), radius=8, fill="#eef1f4")
        draw.rectangle((285, 480, 330, 555), fill="#4c5057")
        draw.rounded_rectangle((220, 550, 395, 575), radius=10, fill="#747981")
        draw.rounded_rectangle((555, 165, 690, 590), radius=22, fill="#27292e")
        draw.ellipse((600, 210, 645, 255), fill=red)
        draw.rectangle((590, 310, 655, 325), fill=yellow)
    elif key == "display":
        draw.rounded_rectangle((120, 170, 680, 500), radius=28, fill=black)
        draw.rounded_rectangle((148, 198, 652, 470), radius=12, fill="#e8edf2")
        draw.polygon([(148, 410), (400, 260), (652, 410), (652, 470), (148, 470)], fill="#dfe3e8")
        draw.rectangle((370, 500, 430, 565), fill="#50545b")
        draw.rounded_rectangle((280, 555, 520, 585), radius=12, fill="#747981")
    elif key == "printer":
        draw.rounded_rectangle((170, 300, 630, 590), radius=32, fill="#e4e6e9", outline=black, width=8)
        draw.rounded_rectangle((235, 150, 565, 390), radius=12, fill=white, outline="#b3b6bc", width=5)
        draw.line((275, 215, 525, 215), fill=red, width=12)
        draw.line((275, 255, 500, 255), fill=gray, width=8)
        draw.rounded_rectangle((235, 430, 565, 540), radius=15, fill=black)
        draw.ellipse((555, 345, 585, 375), fill=yellow)
    elif key == "camera":
        draw.rounded_rectangle((125, 255, 675, 570), radius=46, fill=black)
        draw.rounded_rectangle((215, 205, 380, 280), radius=18, fill="#34373d")
        draw.ellipse((260, 295, 540, 575), fill="#35383f", outline=gray, width=18)
        draw.ellipse((320, 355, 480, 515), fill="#151a24", outline=red, width=14)
        draw.ellipse((365, 400, 435, 470), fill="#7197c6")
        draw.ellipse((575, 300, 615, 340), fill=yellow)
    elif key == "audio":
        draw.arc((155, 150, 645, 585), start=190, end=350, fill=black, width=48)
        draw.rounded_rectangle((120, 355, 275, 600), radius=48, fill=black)
        draw.rounded_rectangle((525, 355, 680, 600), radius=48, fill=black)
        draw.rounded_rectangle((150, 390, 250, 560), radius=32, fill=red)
        draw.rounded_rectangle((550, 390, 650, 560), radius=32, fill=red)
    elif key in {"phone", "tablet"}:
        bounds = (245, 105, 555, 665) if key == "phone" else (125, 110, 675, 650)
        draw.rounded_rectangle(bounds, radius=42, fill=black)
        x1, y1, x2, y2 = bounds
        draw.rounded_rectangle((x1 + 24, y1 + 28, x2 - 24, y2 - 34), radius=24, fill="#e8edf2")
        draw.ellipse((x2 - 80, y1 + 48, x2 - 52, y1 + 76), fill=red)
        draw.polygon([(x1 + 35, y2 - 175), ((x1 + x2) // 2, y1 + 190), (x2 - 35, y2 - 175)], fill="#d9dee4")
        draw.ellipse(((x1 + x2) // 2 - 8, y2 - 24, (x1 + x2) // 2 + 8, y2 - 8), fill=yellow)
    elif key == "gaming":
        draw.rounded_rectangle((120, 260, 680, 585), radius=125, fill=black)
        draw.ellipse((170, 365, 330, 525), fill="#2d3036")
        draw.rectangle((225, 395, 275, 495), fill=white)
        draw.rectangle((200, 420, 300, 470), fill=white)
        draw.ellipse((500, 370, 555, 425), fill=red)
        draw.ellipse((565, 435, 620, 490), fill=yellow)
        draw.rounded_rectangle((340, 340, 460, 385), radius=18, fill="#4b4f57")
    elif key == "watch":
        draw.rounded_rectangle((325, 70, 475, 730), radius=70, fill="#34373d")
        draw.rounded_rectangle((215, 220, 585, 590), radius=88, fill=black)
        draw.rounded_rectangle((250, 255, 550, 555), radius=62, fill="#e8edf2")
        draw.arc((300, 305, 500, 505), start=210, end=510, fill=red, width=20)
        draw.line((400, 405, 400, 330), fill=black, width=12)
        draw.line((400, 405, 465, 440), fill=black, width=12)
    elif key == "software":
        draw.rounded_rectangle((190, 135, 610, 650), radius=35, fill=black)
        draw.rounded_rectangle((235, 180, 565, 605), radius=18, fill="#e9edf2")
        draw.rectangle((275, 250, 385, 360), fill=red)
        draw.rectangle((415, 250, 525, 360), fill=yellow)
        draw.rectangle((275, 390, 385, 500), fill=yellow)
        draw.rectangle((415, 390, 525, 500), fill=red)
    elif key == "component":
        draw.rounded_rectangle((190, 190, 610, 610), radius=40, fill="#30333a", outline=black, width=8)
        draw.rounded_rectangle((280, 280, 520, 520), radius=28, fill=black, outline=red, width=16)
        for offset in range(220, 590, 60):
            draw.line((offset, 145, offset, 190), fill=yellow, width=12)
            draw.line((offset, 610, offset, 655), fill=yellow, width=12)
            draw.line((145, offset, 190, offset), fill=yellow, width=12)
            draw.line((610, offset, 655, offset), fill=yellow, width=12)
    elif key == "network":
        draw.rounded_rectangle((150, 380, 650, 570), radius=35, fill=black)
        draw.line((235, 380, 190, 170), fill="#3b3e45", width=18)
        draw.line((565, 380, 610, 170), fill="#3b3e45", width=18)
        draw.arc((255, 145, 545, 440), start=210, end=330, fill=red, width=18)
        draw.arc((315, 210, 485, 380), start=210, end=330, fill=yellow, width=16)
        for x in (235, 285, 335, 385):
            draw.rounded_rectangle((x, 485, x + 30, 515), radius=5, fill=yellow)
    elif key == "power":
        draw.rounded_rectangle((235, 120, 565, 660), radius=42, fill=black)
        draw.ellipse((325, 190, 475, 340), fill="#292c31", outline=red, width=14)
        draw.rectangle((375, 225, 425, 305), fill=yellow)
        draw.rounded_rectangle((300, 420, 500, 555), radius=20, fill="#292c31")
        draw.line((335, 470, 465, 470), fill=red, width=12)
        draw.line((335, 510, 430, 510), fill=gray, width=10)
    else:
        draw.rounded_rectangle((165, 230, 635, 570), radius=55, fill=black)
        draw.rounded_rectangle((240, 305, 560, 495), radius=35, fill="#e5e8ec")
        draw.ellipse((295, 345, 405, 455), fill=red)
        draw.ellipse((430, 345, 510, 425), fill=yellow)
        draw.line((120, 400, 165, 400), fill=black, width=24)
        draw.line((635, 400, 700, 350), fill=black, width=24)


def generate_demo_images(output_dir: Path) -> dict[str, str]:
    output_dir.mkdir(parents=True, exist_ok=True)
    keys = tuple(PRODUCT_PROFILES)
    relative_paths: dict[str, str] = {}

    for key in keys:
        filename = f"demo-{key}.webp"
        path = output_dir / filename
        relative_paths[key] = f"uploads/products/demo-placeholders/{filename}"
        if path.exists():
            continue

        image = Image.new("RGB", (800, 800), "#f7f7f8")
        draw = ImageDraw.Draw(image)
        draw.rounded_rectangle((34, 34, 766, 766), radius=54, fill="#ffffff", outline="#ececef", width=4)
        draw.ellipse((610, 55, 735, 180), fill="#ed0012")
        draw.ellipse((655, 100, 760, 205), fill="#edd500")
        draw_product_icon(draw, key)

        title = PRODUCT_PROFILES[key]["title"]
        label_font = load_font(25, bold=True)
        demo_font = load_font(16, bold=True)
        draw.rounded_rectangle((70, 675, 730, 735), radius=20, fill="#111214")
        draw.text((95, 691), title[:31], font=label_font, fill="#ffffff")
        demo_box = draw.textbbox((0, 0), "DEMO", font=demo_font)
        demo_width = demo_box[2] - demo_box[0]
        draw.rounded_rectangle((635 - demo_width, 75, 705, 115), radius=12, fill="#111214")
        draw.text((650 - demo_width, 85), "DEMO", font=demo_font, fill="#ffffff")
        image.save(path, format="WEBP", quality=88, method=6)

    return relative_paths


TABLES = (
    ProductCategory.__table__,
    ProductBrand.__table__,
    Product.__table__,
    ProductImage.__table__,
    ProductSpec.__table__,
    Price.__table__,
    Inventory.__table__,
    ProductColor.__table__,
    ProductVariant.__table__,
)


def ensure_tables(target_engine) -> None:
    Base.metadata.create_all(bind=target_engine, tables=list(TABLES))


def ensure_brand(connection, name: str) -> int:
    table = ProductBrand.__table__
    brand_id = connection.execute(select(table.c.id).where(table.c.name == name)).scalar_one_or_none()
    if brand_id is not None:
        return brand_id
    return connection.execute(
        insert(table)
        .values(name=name, description="Marque fictive réservée aux tests du catalogue.")
        .returning(table.c.id)
    ).scalar_one()


def ensure_categories(connection, image_paths: dict[str, str]) -> tuple[dict[str, int], set[str]]:
    table = ProductCategory.__table__
    category_ids: dict[str, int] = {}
    created_slugs: set[str] = set()

    for slug in CATEGORY_SLUGS:
        category_id = connection.execute(select(table.c.id).where(table.c.slug == slug)).scalar_one_or_none()
        if category_id is None:
            name = category_name(slug)
            name_conflict = connection.execute(select(table.c.id).where(table.c.name == name)).scalar_one_or_none()
            if name_conflict is not None:
                name = f"{name} · {slug}"[:100]
            image_key = profile_key_for_slug(slug)
            category_id = connection.execute(
                insert(table)
                .values(
                    name=name,
                    slug=slug,
                    description="Catégorie de démonstration pour valider le filtrage du catalogue.",
                    image_url=image_paths[image_key],
                )
                .returning(table.c.id)
            ).scalar_one()
            created_slugs.add(slug)
        category_ids[slug] = category_id

    for child_slug, parent_slug in PARENT_SLUGS.items():
        if child_slug not in created_slugs or parent_slug not in category_ids:
            continue
        connection.execute(
            update(table)
            .where(table.c.id == category_ids[child_slug])
            .values(parent_id=category_ids[parent_slug])
        )

    return category_ids, created_slugs


def ensure_single_child(connection, table, product_id: int, values: dict, match_column=None) -> None:
    condition = table.c.product_id == product_id
    if match_column is not None:
        condition = condition & (match_column == values[match_column.name])
    existing_id = connection.execute(select(table.c.id).where(condition).limit(1)).scalar_one_or_none()
    if existing_id is None:
        connection.execute(insert(table).values(product_id=product_id, **values))
    else:
        connection.execute(update(table).where(table.c.id == existing_id).values(**values))


def seed_products(connection, category_ids: dict[str, int], image_paths: dict[str, str], with_images: bool) -> tuple[int, int]:
    product_table = Product.__table__
    brand_ids = {profile["brand"]: ensure_brand(connection, profile["brand"]) for profile in PRODUCT_PROFILES.values()}
    created = 0
    updated = 0

    for index, slug in enumerate(CATEGORY_SLUGS, start=1):
        key = profile_key_for_slug(slug)
        profile = PRODUCT_PROFILES[key]
        demo_slug = f"demo-{slug}"
        name = f"{profile['title']} — {category_name(slug)} (Démo)"[:200]
        values = {
            "name": name,
            "slug": demo_slug,
            "description": (
                "Produit entièrement fictif créé pour tester l’affichage, les filtres, "
                f"le panier et la catégorie « {category_name(slug)} ». Ne pas vendre."
            ),
            "category_id": category_ids[slug],
            "brand_id": brand_ids[profile["brand"]],
            "rating": round(3.7 + (index % 12) / 10, 1),
            "is_active": True,
            "is_deleted": False,
        }
        product_id = connection.execute(
            select(product_table.c.id).where(product_table.c.slug == demo_slug)
        ).scalar_one_or_none()
        if product_id is None:
            product_id = connection.execute(
                insert(product_table).values(**values).returning(product_table.c.id)
            ).scalar_one()
            created += 1
        else:
            connection.execute(update(product_table).where(product_table.c.id == product_id).values(**values))
            updated += 1

        price = profile["price"] + (index % 7) * 2_500
        ensure_single_child(
            connection,
            Price.__table__,
            product_id,
            {"price": price, "currency": "XOF", "is_discount": False},
        )

        if not profile.get("variants"):
            ensure_single_child(
                connection,
                Inventory.__table__,
                product_id,
                {"quantity": 5 + (index % 21), "location": "Stock démo Lomé"},
            )

        for color in profile["colors"]:
            ensure_single_child(
                connection,
                ProductColor.__table__,
                product_id,
                {"color": color},
                ProductColor.__table__.c.color,
            )

        for spec_key, spec_value in profile["specs"]:
            ensure_single_child(
                connection,
                ProductSpec.__table__,
                product_id,
                {"key": spec_key, "value": spec_value},
                ProductSpec.__table__.c.key,
            )

        if with_images:
            ensure_single_child(
                connection,
                ProductImage.__table__,
                product_id,
                {
                    "image_url": image_paths[key],
                    "alt_text": f"Illustration fictive — {category_name(slug)}",
                    "is_main": True,
                },
                ProductImage.__table__.c.image_url,
            )

        if profile.get("variants"):
            variant_table = ProductVariant.__table__
            variants = (
                ("8GB", "256GB SSD", "Core i5", price, 8 + index % 5),
                ("16GB", "512GB SSD", "Core i7", price + 65_000, 4 + index % 4),
            )
            for variant_index, (ram, storage, processor, variant_price, quantity) in enumerate(variants, start=1):
                sku = f"DEMO-{slug.upper()}-{variant_index}"[:100]
                variant_values = {
                    "product_id": product_id,
                    "sku": sku,
                    "ram": ram,
                    "storage": storage,
                    "processor": processor,
                    "price": variant_price,
                    "quantity": quantity,
                    "is_active": True,
                }
                variant_id = connection.execute(
                    select(variant_table.c.id).where(variant_table.c.sku == sku)
                ).scalar_one_or_none()
                if variant_id is None:
                    connection.execute(insert(variant_table).values(**variant_values))
                else:
                    connection.execute(
                        update(variant_table).where(variant_table.c.id == variant_id).values(**variant_values)
                    )

    return created, updated


def seed_demo_catalog(target_engine, image_dir: Path, with_images: bool = True) -> dict[str, int]:
    ensure_tables(target_engine)
    image_paths = generate_demo_images(image_dir)
    with target_engine.begin() as connection:
        category_ids, created_categories = ensure_categories(connection, image_paths)
        created_products, updated_products = seed_products(
            connection, category_ids, image_paths, with_images
        )
    return {
        "categories": len(category_ids),
        "categories_created": len(created_categories),
        "products_created": created_products,
        "products_updated": updated_products,
        "images": len(image_paths),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Créer le catalogue fictif de démonstration.")
    parser.add_argument(
        "--database-url",
        help="Base alternative, utile pour un test local. Par défaut, utilise DATABASE_URL.",
    )
    parser.add_argument(
        "--without-images",
        action="store_true",
        help="Crée les produits sans leur associer les illustrations de démonstration.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Affiche le nombre d’éléments prévus sans écrire dans la base.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.dry_run:
        print(f"Catégories uniques prévues : {len(CATEGORY_SLUGS)}")
        print(f"Produits fictifs prévus    : {len(CATEGORY_SLUGS)}")
        print(f"Illustrations prévues      : {len(PRODUCT_PROFILES)}")
        return 0

    target_engine = create_engine(args.database_url, pool_pre_ping=True) if args.database_url else project_engine
    image_dir = PROJECT_ROOT / "uploads" / "products" / "demo-placeholders"

    try:
        result = seed_demo_catalog(
            target_engine,
            image_dir,
            with_images=not args.without_images,
        )
    except Exception as error:
        print(f"❌ Remplissage impossible : {error}")
        return 1

    print("✅ Catalogue fictif prêt.")
    print(f"   Catégories couvertes : {result['categories']}")
    print(f"   Catégories créées    : {result['categories_created']}")
    print(f"   Produits créés       : {result['products_created']}")
    print(f"   Produits mis à jour  : {result['products_updated']}")
    print(f"   Illustrations locales: {result['images']}")
    print("   Préfixe produits     : demo-")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
