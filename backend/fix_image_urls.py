"""
fix_image_urls.py — Updates image_url for all products in the DB
without touching any other data.

Run from the backend/ directory:
    python fix_image_urls.py
"""
import os
import re
import sys

sys.path.insert(0, ".")

from app.database import SessionLocal
from app.models import Product

DATA_DIR = os.path.join(os.path.dirname(__file__), "data_200")
IMAGE_DIR = os.path.join(DATA_DIR, "image")


def name_to_image_url(product_name: str) -> str:
    slug = product_name.lower()
    slug = slug.replace("'", "").replace("\u2019", "").replace("\u00e9", "e").replace("\u00f4", "o").replace("\u00fc", "u")
    slug = re.sub(r"[^a-z0-9]+", "_", slug)
    slug = slug.strip("_")
    filepath = os.path.join(IMAGE_DIR, f"{slug}.jpg")
    if os.path.isfile(filepath):
        return f"/images/{slug}.jpg"
    return ""


def main():
    db = SessionLocal()
    try:
        products = db.query(Product).all()
        updated = 0
        missing = []

        for p in products:
            url = name_to_image_url(p.name)
            if url:
                p.image_url = url
                updated += 1
            else:
                missing.append(p.name)

        db.commit()
        print(f"Updated {updated} products.")
        if missing:
            print(f"\nNo image file found for {len(missing)} products:")
            for name in missing:
                print(f"  - {name}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
