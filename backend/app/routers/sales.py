"""
Sales analytics router – CRUD + aggregated analytics endpoints.
"""
from collections import Counter
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/sales", tags=["sales"])


# ── CRUD ──────────────────────────────────────
@router.get("/", response_model=List[schemas.SalesRecordOut])
def list_sales(
    marketplace: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(models.SalesRecord)
    if marketplace and marketplace != "all":
        q = q.filter(models.SalesRecord.marketplace == marketplace)
    return q.order_by(models.SalesRecord.sale_date.desc()).offset(skip).limit(limit).all()


@router.post("/", response_model=schemas.SalesRecordOut, status_code=201)
def create_sale(
    payload: schemas.SalesRecordCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    record = models.SalesRecord(**payload.model_dump())
    if record.sale_date is None:
        record.sale_date = datetime.utcnow()
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ── Analytics ─────────────────────────────────
@router.get("/analytics/top-products")
def top_products(
    marketplace: Optional[str] = Query(None),
    limit: int = 5,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Products ranked by total revenue."""
    q = (
        db.query(
            models.Product.id,
            models.Product.name,
            func.sum(models.SalesRecord.revenue).label("total_revenue"),
            func.sum(models.SalesRecord.quantity).label("total_units"),
        )
        .join(models.SalesRecord, models.SalesRecord.product_id == models.Product.id)
    )
    if marketplace and marketplace != "all":
        q = q.filter(models.SalesRecord.marketplace == marketplace)
    rows = (
        q.group_by(models.Product.id)
        .order_by(func.sum(models.SalesRecord.revenue).desc())
        .limit(limit)
        .all()
    )
    return [
        {"id": r.id, "name": r.name, "total_revenue": round(r.total_revenue, 2), "total_units": r.total_units}
        for r in rows
    ]


@router.get("/analytics/most-returned")
def most_returned(
    marketplace: Optional[str] = Query(None),
    limit: int = 5,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Products with most returns."""
    q = (
        db.query(
            models.Product.id,
            models.Product.name,
            func.count(models.SalesRecord.id).label("return_count"),
        )
        .join(models.SalesRecord, models.SalesRecord.product_id == models.Product.id)
        .filter(models.SalesRecord.returned == True)
    )
    if marketplace and marketplace != "all":
        q = q.filter(models.SalesRecord.marketplace == marketplace)
    rows = (
        q.group_by(models.Product.id)
        .order_by(func.count(models.SalesRecord.id).desc())
        .limit(limit)
        .all()
    )
    return [{"id": r.id, "name": r.name, "return_count": r.return_count} for r in rows]


@router.get("/analytics/trends")
def sales_trends(
    marketplace: Optional[str] = Query(None),
    days: int = 30,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Daily revenue for last N days."""
    since = datetime.utcnow() - timedelta(days=days)
    q = (
        db.query(
            func.date(models.SalesRecord.sale_date).label("day"),
            func.sum(models.SalesRecord.revenue).label("revenue"),
            func.count(models.SalesRecord.id).label("orders"),
        )
        .filter(models.SalesRecord.sale_date >= since)
    )
    if marketplace and marketplace != "all":
        q = q.filter(models.SalesRecord.marketplace == marketplace)
    rows = (
        q.group_by(func.date(models.SalesRecord.sale_date))
        .order_by(func.date(models.SalesRecord.sale_date))
        .all()
    )
    return [{"day": str(r.day), "revenue": round(r.revenue, 2), "orders": r.orders} for r in rows]


@router.get("/analytics/bundled-items")
def bundled_items(
    marketplace: Optional[str] = Query(None),
    limit: int = 5,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Most frequently bundled product pairs."""
    q = db.query(models.SalesRecord).filter(models.SalesRecord.bundled_with != "")
    if marketplace and marketplace != "all":
        q = q.filter(models.SalesRecord.marketplace == marketplace)
    records = q.all()
    pair_counter: Counter = Counter()
    for r in records:
        for bid in r.bundled_with.split(","):
            bid = bid.strip()
            if bid:
                pair = tuple(sorted([str(r.product_id), bid]))
                pair_counter[pair] += 1

    # Resolve product names
    result = []
    for (a, b), count in pair_counter.most_common(limit):
        pa = db.get(models.Product, int(a))
        pb = db.get(models.Product, int(b))
        result.append({
            "product_a": pa.name if pa else a,
            "product_b": pb.name if pb else b,
            "count": count,
        })
    return result


@router.get("/analytics/competitor-pricing")
def competitor_pricing(
    marketplace: Optional[str] = Query(None),
    product_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Competitor prices vs our price per product."""
    q = db.query(models.CompetitorPrice).join(models.Product)
    if marketplace and marketplace != "all":
        q = q.filter(models.CompetitorPrice.marketplace == marketplace)
    if product_id:
        q = q.filter(models.CompetitorPrice.product_id == product_id)
    rows = q.all()
    result = []
    for r in rows:
        result.append({
            "product_id": r.product_id,
            "product_name": r.product.name,
            "our_price": r.product.price,
            "competitor": r.competitor_name,
            "competitor_price": r.price,
            "diff": round(r.product.price - r.price, 2),
        })
    return result
