import os
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError


UPLOAD_DIR = Path("uploads/products")
FAVICON_WATERMARK_PATH = Path(__file__).resolve().parents[1] / "templates/ecommerce/app/static/img/favicon.png"
MAX_IMAGE_BYTES = 15 * 1024 * 1024
MAX_IMAGE_SIZE = (1600, 1600)
WEBP_QUALITY = 82
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def add_nt_watermark(image: Image.Image) -> Image.Image:
    """Ajoute le favicon NT en bas à droite d'une image produit publique."""
    if not FAVICON_WATERMARK_PATH.is_file():
        return image

    # Le filigrane doit rester discret mais lisible dans Google Images.
    base = image.convert("RGBA")
    watermark_side = max(42, min(130, int(min(base.size) * 0.12)))
    margin = max(10, int(min(base.size) * 0.025))

    try:
        with Image.open(FAVICON_WATERMARK_PATH) as logo_source:
            logo = logo_source.convert("RGBA")
            logo.thumbnail((watermark_side, watermark_side), Image.Resampling.LANCZOS)

            # Une légère transparence conserve le produit au premier plan.
            alpha = logo.getchannel("A").point(lambda value: int(value * 0.82))
            logo.putalpha(alpha)

            position = (
                max(margin, base.width - logo.width - margin),
                max(margin, base.height - logo.height - margin),
            )
            base.alpha_composite(logo, dest=position)
    except (UnidentifiedImageError, OSError, ValueError):
        # Un upload ne doit pas échouer si le fichier de logo est momentanément absent ou invalide.
        return image

    return base


def save_upload_file(upload_file: UploadFile, *, watermark: bool = False) -> str:
    """Enregistre une image redimensionnée et compressée en WebP.

    ``watermark=True`` est réservé aux images de produits visibles publiquement.
    """
    if not upload_file or not upload_file.filename:
        raise HTTPException(status_code=400, detail="Aucun fichier image reçu")

    extension = Path(upload_file.filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Format d’image non accepté")

    content = upload_file.file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Le fichier image est vide")
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="L’image dépasse la limite de 15 Mo")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    destination = UPLOAD_DIR / f"{uuid.uuid4().hex}.webp"

    try:
        from io import BytesIO

        with Image.open(BytesIO(content)) as source:
            image = ImageOps.exif_transpose(source)
            image.thumbnail(MAX_IMAGE_SIZE, Image.Resampling.LANCZOS)
            if image.mode not in {"RGB", "RGBA"}:
                image = image.convert("RGBA" if "transparency" in image.info else "RGB")
            if watermark:
                image = add_nt_watermark(image)
            image.save(destination, "WEBP", quality=WEBP_QUALITY, method=6, optimize=True)
    except (UnidentifiedImageError, OSError, ValueError) as error:
        raise HTTPException(status_code=400, detail="Le fichier envoyé n’est pas une image valide") from error

    return destination.as_posix()
