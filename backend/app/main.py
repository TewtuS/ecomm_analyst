"""
FastAPI application entry point.
Run with:  uvicorn app.main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import auth, comments, dashboard, engagement, insights, products, sales

# Create all tables on startup (fine for SQLite/dev; use Alembic for production)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="E-Commerce Analytics API",
    description="Analytics platform for marketplace sellers (Shopee, Taobao, Temu, etc.)",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(products.router)
app.include_router(sales.router)
app.include_router(engagement.router)
app.include_router(comments.router)
app.include_router(insights.router)


@app.get("/", tags=["health"])
def root():
    return {"status": "ok", "message": "E-Commerce Analytics API is running"}
