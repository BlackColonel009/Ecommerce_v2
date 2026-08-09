import os
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError


UPLOAD_DIR = Path("uploads/products")
MAX_IMAGE_BYTES = 15 * 1024 * 1024
MAX_IMAGE_SIZE = (1600, 1600)
WEBP_QUALITY = 82
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def save_upload_file(upload_file: UploadFile) -> str:
    """Enregistre une image produit redimensionnée et compressée en WebP."""
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
            image.save(destination, "WEBP", quality=WEBP_QUALITY, method=6, optimize=True)
    except (UnidentifiedImageError, OSError, ValueError) as error:
        raise HTTPException(status_code=400, detail="Le fichier envoyé n’est pas une image valide") from error

    return destination.as_posix()
