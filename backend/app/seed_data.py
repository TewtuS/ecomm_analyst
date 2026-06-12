"""
Load demo store data from backend/data_200/*.csv into SQLite.

Used by `python seed.py` locally and auto-run on Vercel when the DB has no users.
"""
import csv
import os
import re
from datetime import datetime

from app.database import Base, SessionLocal, engine
from app.models import Comment, CompetitorPrice, EngagementMetric, Product, SalesRecord, User
from app.security import hash_password

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(BACKEND_DIR, "data_200")
IMAGE_DIRS = [
    os.path.join(BACKEND_DIR, "data200", "image"),
    os.path.join(BACKEND_DIR, "data_200", "image"),
]


def name_to_image_url(product_name: str) -> str:
    slug = product_name.lower()
    slug = slug.replace("'", "").replace("'", "").replace("é", "e").replace("ô", "o").replace("ü", "u")
    slug = re.sub(r"[^a-z0-9]+", "_", slug)
    slug = slug.strip("_")
    for image_dir in IMAGE_DIRS:
        filepath = os.path.join(image_dir, f"{slug}.jpg")
        if os.path.isfile(filepath):
            return f"/images/{slug}.jpg"
    return ""


def read_csv(filename: str) -> list[dict]:
    path = os.path.join(DATA_DIR, filename)
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def parse_date(s: str) -> datetime:
    s = s.strip()
    if not s:
        return datetime.utcnow()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return datetime.utcnow()


def parse_bool(s: str) -> bool:
    return s.strip().lower() in ("true", "1", "yes")


def seed_database(*, wipe: bool = True) -> None:
    """Populate SQLite from CSV files. Creates demo@example.com / demo1234."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if wipe:
            db.query(CompetitorPrice).delete()
            db.query(Comment).delete()
            db.query(EngagementMetric).delete()
            db.query(SalesRecord).delete()
            db.query(Product).delete()
            db.query(User).delete()
            db.commit()

        demo = User(
            email="demo@example.com",
            username="demo_store",
            hashed_password=hash_password("demo1234"),
            is_active=True,
        )
        db.add(demo)
        db.commit()
        db.refresh(demo)

        product_rows = read_csv("products.csv")
        product_id_map: dict[int, int] = {}
        products_to_add = []
        for row in product_rows:
            name = row["name"].strip()
            csv_img = row["image_url"].strip() if row["image_url"].strip() else ""
            image_url = csv_img if csv_img else name_to_image_url(name)
            products_to_add.append(
                Product(
                    name=name,
                    category=row["category"].strip(),
                    price=float(row["price"]),
                    stock=int(row["stock"]),
                    image_url=image_url,
                    marketplace=row["marketplace"].strip(),
                )
            )
        db.add_all(products_to_add)
        db.commit()
        for idx, prod in enumerate(products_to_add, start=1):
            db.refresh(prod)
            product_id_map[idx] = prod.id

        for filename, model, builder in (
            ("sales.csv", SalesRecord, lambda row, pid: SalesRecord(
                product_id=pid,
                quantity=int(row["quantity"]),
                revenue=float(row["revenue"]),
                returned=parse_bool(row["returned"]),
                sale_date=parse_date(row["sale_date"]),
                marketplace=row["marketplace"].strip(),
                bundled_with=row["bundled_with"].strip() if row["bundled_with"].strip() else "",
            )),
            ("engagement.csv", EngagementMetric, lambda row, pid: EngagementMetric(
                product_id=pid,
                date=parse_date(row["date"]),
                page_visits=int(row["page_visits"]),
                cart_adds=int(row["cart_adds"]),
                click_through_rate=float(row["click_through_rate"]),
                image_views=int(row["image_views"]),
                marketplace=row["marketplace"].strip(),
            )),
            ("comments.csv", Comment, lambda row, pid: Comment(
                product_id=pid,
                author=row["author"].strip(),
                text=row["text"].strip(),
                rating=int(row["rating"]),
                sentiment=row["sentiment"].strip().lower(),
                marketplace=row["marketplace"].strip(),
                created_at=parse_date(row["created_at"]),
            )),
            ("competitor.csv", CompetitorPrice, lambda row, pid: CompetitorPrice(
                product_id=pid,
                competitor_name=row["competitor_name"].strip(),
                price=float(row["price"]),
                marketplace=row["marketplace"].strip(),
                recorded_at=parse_date(row["recorded_at"]),
            )),
        ):
            rows = read_csv(filename)
            batch = []
            for row in rows:
                db_pid = product_id_map.get(int(row["product_id"]))
                if db_pid is not None:
                    batch.append(builder(row, db_pid))
            db.add_all(batch)
            db.commit()
    finally:
        db.close()


def database_has_users() -> bool:
    db = SessionLocal()
    try:
        return db.query(User).count() > 0
    finally:
        db.close()
