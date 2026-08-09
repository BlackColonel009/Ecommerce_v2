"""Crée des variantes WebP légères et relie les produits sans supprimer les originaux."""

from pathlib import Path
import sys

from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy import text


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from database import engine


MAX_SIZE = (1600, 1600)
QUALITY = 80
MIN_BYTES_TO_OPTIMIZE = 250 * 1024
OUTPUT_DIR = PROJECT_ROOT / "uploads" / "products" / "optimized"


def optimize(source: Path, destination: Path) -> bool:
    try:
        with Image.open(source) as opened:
            image = ImageOps.exif_transpose(opened)
            image.thumbnail(MAX_SIZE, Image.Resampling.LANCZOS)
            if image.mode not in {"RGB", "RGBA"}:
                image = image.convert("RGBA" if "transparency" in image.info else "RGB")
            destination.parent.mkdir(parents=True, exist_ok=True)
            image.save(destination, "WEBP", quality=QUALITY, method=6, optimize=True)
        return True
    except (UnidentifiedImageError, OSError, ValueError) as error:
        print(f"Image ignorée ({source.name}) : {error}")
        return False


def main():
    with engine.connect() as connection:
        rows = connection.execute(text("SELECT id, image_url FROM product_images WHERE image_url IS NOT NULL")).mappings().all()

    replacements = {}
    updates = []
    original_bytes = 0
    optimized_bytes = 0

    for row in rows:
        relative = str(row["image_url"]).replace("\\", "/").lstrip("/")
        if not relative.startswith("uploads/products/") or "demo-placeholders/" in relative:
            continue
        source = PROJECT_ROOT / relative
        if not source.exists() or not source.is_file():
            continue

        if relative in replacements:
            updates.append({"id": row["id"], "image_url": replacements[relative]})
            continue

        try:
            with Image.open(source) as probe:
                oversized = max(probe.size) > max(MAX_SIZE)
                already_webp = probe.format == "WEBP"
        except (UnidentifiedImageError, OSError):
            continue
        if source.stat().st_size < MIN_BYTES_TO_OPTIMIZE and not oversized and already_webp:
            continue

        destination = OUTPUT_DIR / f"{source.stem}-web.webp"
        if not destination.exists() and not optimize(source, destination):
            continue
        new_relative = destination.relative_to(PROJECT_ROOT).as_posix()
        replacements[relative] = new_relative
        updates.append({"id": row["id"], "image_url": new_relative})
        original_bytes += source.stat().st_size
        optimized_bytes += destination.stat().st_size

    if updates:
        with engine.begin() as connection:
            connection.execute(
                text("UPDATE product_images SET image_url = :image_url WHERE id = :id"),
                updates,
            )

    saved = max(0, original_bytes - optimized_bytes)
    print(f"{len(updates)} image(s) produit reliée(s) à une variante optimisée.")
    print(f"Gain estimé : {saved / 1024 / 1024:.2f} Mo. Les originaux sont conservés.")


if __name__ == "__main__":
    main()
