"""
AI Insights router – uses OpenAI to answer analytics questions.
Falls back to mock responses if no API key is configured.
"""
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/insights", tags=["insights"])


def _build_context(segments: List[str], db: Session) -> str:
    """Gather relevant data summaries to pass as context to the LLM."""
    lines = []

    if "sales" in segments:
        total_rev = db.query(models.SalesRecord).with_entities(
            __import__("sqlalchemy").func.sum(models.SalesRecord.revenue)
        ).scalar() or 0
        total_orders = db.query(models.SalesRecord).count()
        returns = db.query(models.SalesRecord).filter(models.SalesRecord.returned == True).count()
        lines.append(
            f"[Sales] Total revenue: ${total_rev:,.2f} | Orders: {total_orders} | Returns: {returns}"
        )

    if "engagement" in segments:
        total_visits = db.query(models.EngagementMetric).with_entities(
            __import__("sqlalchemy").func.sum(models.EngagementMetric.page_visits)
        ).scalar() or 0
        total_cart = db.query(models.EngagementMetric).with_entities(
            __import__("sqlalchemy").func.sum(models.EngagementMetric.cart_adds)
        ).scalar() or 0
        lines.append(
            f"[Engagement] Total page visits: {total_visits} | Cart adds: {total_cart}"
        )

    if "comments" in segments:
        pos = db.query(models.Comment).filter(models.Comment.sentiment == "positive").count()
        neg = db.query(models.Comment).filter(models.Comment.sentiment == "negative").count()
        neu = db.query(models.Comment).filter(models.Comment.sentiment == "neutral").count()
        lines.append(f"[Comments] Positive: {pos} | Neutral: {neu} | Negative: {neg}")

    return "\n".join(lines) if lines else "No data available."


def _mock_response(segments: List[str], question: str) -> str:
    """Rule-based fallback when no OpenAI key is provided."""
    seg_label = " + ".join(s.capitalize() for s in segments)
    return (
        f"[Mock AI – {seg_label}]\n\n"
        f"Based on the available data across {seg_label}, here are some quick insights:\n\n"
        "• Your top-selling products are driving the majority of revenue. "
        "Consider bundling them with slower-moving items to increase average order value.\n"
        "• Customer engagement peaks mid-week. Running promotions on Tuesday–Thursday "
        "could maximize click-through rates.\n"
        "• Sentiment analysis shows predominantly positive feedback around product quality. "
        "Address the recurring complaints about delivery speed to further boost ratings.\n\n"
        f"Question asked: \"{question}\"\n"
        "This is a mock response. Add your OpenAI API key to .env for real AI-powered answers."
    )


@router.post("/ask", response_model=schemas.InsightResponse)
async def ask_insight(
    payload: schemas.InsightRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    context = _build_context(payload.segments, db)
    system_prompt = (
        "You are an expert e-commerce analytics assistant. "
        "You help store owners on marketplaces like Shopee, Taobao, Temu, and Facebook Marketplace "
        "understand their performance data. Be concise, actionable, and friendly."
    )
    user_message = (
        f"Store data context:\n{context}\n\n"
        f"Question: {payload.question}"
    )

    if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.startswith("sk-"):
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        completion = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            max_tokens=600,
        )
        answer = completion.choices[0].message.content or ""
    else:
        answer = _mock_response(payload.segments, payload.question)

    # Log this interaction
    log = models.AIInsightLog(
        user_id=current_user.id,
        segments=",".join(payload.segments),
        prompt=payload.question,
        response=answer,
    )
    db.add(log)
    db.commit()

    return schemas.InsightResponse(
        segments=payload.segments,
        question=payload.question,
        answer=answer,
        created_at=datetime.utcnow(),
    )


@router.get("/history")
def insight_history(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    logs = (
        db.query(models.AIInsightLog)
        .filter(models.AIInsightLog.user_id == current_user.id)
        .order_by(models.AIInsightLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": l.id,
            "segments": l.segments.split(","),
            "question": l.prompt,
            "answer": l.response,
            "created_at": l.created_at,
        }
        for l in logs
    ]
