"""
Seed script – populates the database with realistic mock data.
Run with:  python seed.py
"""
import random
import sys
from datetime import datetime, timedelta

sys.path.insert(0, ".")  # ensure app package is importable

from app.database import Base, SessionLocal, engine
from app.models import (
    AIInsightLog,
    Comment,
    CompetitorPrice,
    EngagementMetric,
    Product,
    SalesRecord,
    User,
)
from app.security import hash_password

# ──────────────────────────────────────────────
random.seed(42)
Base.metadata.create_all(bind=engine)
db = SessionLocal()

# ── Guard: skip if already seeded ─────────────
if db.query(User).first():
    print("Database already seeded. Skipping.")
    db.close()
    sys.exit(0)

# ── Users ─────────────────────────────────────
demo_user = User(
    email="demo@example.com",
    username="demo_store",
    hashed_password=hash_password("demo1234"),
)
db.add(demo_user)
db.commit()
db.refresh(demo_user)
print(f"  Created user: {demo_user.email} / demo1234")

# ── Products ──────────────────────────────────
MARKETPLACES = ["Taobao", "Pinduoduo", "Amazon", "eBay"]
CATEGORIES = ["Electronics", "Fashion", "Home & Living", "Beauty", "Sports", "Toys"]

product_data = [
    ("Wireless Earbuds Pro", "Electronics", 29.99, 150),
    ("Minimalist Watch", "Fashion", 49.99, 80),
    ("Bamboo Desk Organizer", "Home & Living", 19.99, 200),
    ("Vitamin C Serum", "Beauty", 24.99, 300),
    ("Resistance Band Set", "Sports", 14.99, 250),
    ("LEGO City Police Station", "Toys", 59.99, 60),
    ("Portable Blender", "Home & Living", 34.99, 120),
    ("Silk Pillowcase", "Fashion", 22.99, 175),
    ("Gaming Mouse RGB", "Electronics", 39.99, 90),
    ("Yoga Mat Non-slip", "Sports", 27.99, 140),
    ("Lip Gloss Set x6", "Beauty", 12.99, 400),
    ("Smart LED Strip Lights", "Electronics", 18.99, 220),
]

products = []
# Create 3 products per marketplace for better distribution
for i, (name, cat, price, stock) in enumerate(product_data):
    for mkt_idx, marketplace in enumerate(MARKETPLACES):
        p = Product(
            name=f"{name} ({marketplace})" if mkt_idx > 0 else name,
            category=cat,
            price=price,
            stock=stock,
            marketplace=marketplace,
            image_url=f"https://picsum.photos/seed/{i+10}-{mkt_idx}/400/400",
        )
        db.add(p)
        products.append(p)

db.commit()
for p in products:
    db.refresh(p)
print(f"  Created {len(products)} products across {len(MARKETPLACES)} marketplaces")

# ── Sales Records ─────────────────────────────
sales = []
for day_offset in range(60):
    date = datetime.utcnow() - timedelta(days=day_offset)
    for _ in range(random.randint(3, 12)):
        product = random.choice(products)
        qty = random.randint(1, 5)
        other = random.choice([p for p in products if p.id != product.id])
        returned = random.random() < 0.08  # 8 % return rate
        sale = SalesRecord(
            product_id=product.id,
            quantity=qty,
            revenue=round(product.price * qty * random.uniform(0.9, 1.1), 2),
            returned=returned,
            sale_date=date,
            marketplace=product.marketplace,  # Use product's marketplace
            bundled_with=str(other.id) if random.random() < 0.35 else "",
        )
        sales.append(sale)
        db.add(sale)

db.commit()
print(f"  Created {len(sales)} sales records across marketplaces")

# ── Engagement Metrics ────────────────────────
for day_offset in range(60):
    date = datetime.utcnow() - timedelta(days=day_offset)
    for product in products:
        visits = random.randint(50, 800)
        metric = EngagementMetric(
            product_id=product.id,
            date=date,
            page_visits=visits,
            cart_adds=random.randint(5, int(visits * 0.25)),
            click_through_rate=round(random.uniform(2.5, 18.0), 2),
            image_views=random.randint(visits, visits * 3),
            marketplace=product.marketplace,  # Use product's marketplace
        )
        db.add(metric)

db.commit()
print("  Created engagement metrics")

# ── Comments ──────────────────────────────────
POSITIVE_COMMENTS = [
    "Amazing quality! Fast shipping and exactly as described.",
    "Love this product! Highly recommend to everyone.",
    "Great value for money. Will definitely buy again.",
    "Packaging was perfect and product works great.",
    "Exceeded my expectations. Very happy with this purchase.",
    "Excellent quality. Customer service was very helpful.",
    "Perfect gift! My friend loved it.",
    "Fast delivery, well packaged, quality product.",
]
NEUTRAL_COMMENTS = [
    "Product is okay. Nothing special but does the job.",
    "Arrived on time. Average quality for the price.",
    "Decent product. Instructions could be clearer.",
    "It's fine. Not the best but not terrible either.",
]
NEGATIVE_COMMENTS = [
    "Item arrived damaged. Very disappointed.",
    "Poor quality, broke after one week of use.",
    "Wrong size delivered. Slow customer support.",
    "Color was different from the photos. Misleading.",
    "Took 3 weeks to arrive. Very slow shipping.",
    "Defective product. Had to return it.",
]

for product in products:
    n_positive = random.randint(4, 8)
    n_neutral = random.randint(1, 3)
    n_negative = random.randint(1, 3)

    for text in random.sample(POSITIVE_COMMENTS, min(n_positive, len(POSITIVE_COMMENTS))):
        db.add(Comment(
            product_id=product.id,
            author=f"User{random.randint(1000,9999)}",
            text=text,
            rating=random.choice([4, 5]),
            sentiment="positive",
            marketplace=product.marketplace,  # Use product's marketplace
            created_at=datetime.utcnow() - timedelta(days=random.randint(0, 60)),
        ))

    for text in random.sample(NEUTRAL_COMMENTS, min(n_neutral, len(NEUTRAL_COMMENTS))):
        db.add(Comment(
            product_id=product.id,
            author=f"User{random.randint(1000,9999)}",
            text=text,
            rating=3,
            sentiment="neutral",
            marketplace=product.marketplace,  # Use product's marketplace
            created_at=datetime.utcnow() - timedelta(days=random.randint(0, 60)),
        ))

    for text in random.sample(NEGATIVE_COMMENTS, min(n_negative, len(NEGATIVE_COMMENTS))):
        db.add(Comment(
            product_id=product.id,
            author=f"User{random.randint(1000,9999)}",
            text=text,
            rating=random.choice([1, 2]),
            sentiment="negative",
            marketplace=product.marketplace,  # Use product's marketplace
            created_at=datetime.utcnow() - timedelta(days=random.randint(0, 60)),
        ))

db.commit()
print("  Created comments")

# ── Competitor Prices ─────────────────────────
COMPETITORS = ["TechMart", "ShopXpress", "MegaDeal", "PriceBeater", "ValueZone"]
for product in products:
    for comp in random.sample(COMPETITORS, 3):
        db.add(CompetitorPrice(
            product_id=product.id,
            competitor_name=comp,
            price=round(product.price * random.uniform(0.75, 1.30), 2),
            marketplace=product.marketplace,  # Use product's marketplace
        ))

db.commit()
print("  Created competitor prices")

db.close()
print("\nSeed complete! Login: demo@example.com / demo1234")
