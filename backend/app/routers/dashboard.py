"""
Dashboard summary router – single call that returns all KPIs.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=schemas.DashboardSummary)
def dashboard_summary(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    total_revenue = db.query(func.sum(models.SalesRecord.revenue)).scalar() or 0
    total_orders = db.query(models.SalesRecord).count()
    total_returns = (
        db.query(models.SalesRecord).filter(models.SalesRecord.returned == True).count()
    )
    avg_ctr = db.query(func.avg(models.EngagementMetric.click_through_rate)).scalar() or 0
    total_visits = db.query(func.sum(models.EngagementMetric.page_visits)).scalar() or 0
    total_cart = db.query(func.sum(models.EngagementMetric.cart_adds)).scalar() or 0
    pos = db.query(models.Comment).filter(models.Comment.sentiment == "positive").count()
    neg = db.query(models.Comment).filter(models.Comment.sentiment == "negative").count()
    neu = db.query(models.Comment).filter(models.Comment.sentiment == "neutral").count()

    return schemas.DashboardSummary(
        total_revenue=round(total_revenue, 2),
        total_orders=total_orders,
        total_returns=total_returns,
        avg_ctr=round(avg_ctr, 2),
        total_page_visits=total_visits or 0,
        total_cart_adds=total_cart or 0,
        positive_comments=pos,
        negative_comments=neg,
        neutral_comments=neu,
    )
