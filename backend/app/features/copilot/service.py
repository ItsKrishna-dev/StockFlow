"""
app/features/copilot/service.py

AI Inventory Copilot service.
Constrained LLM assistant for natural language inventory querying:
- The LLM never writes to the database.
- The LLM has no database access or SQL execution capability.
- All numbers originate strictly from verified service layer computations.
"""
import json
import re
from typing import Any

from fastapi import HTTPException, status
from groq import Groq
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.features.copilot.intents import INTENTS
from app.features.copilot.schemas import CopilotAskOut
from app.features.dashboard.service import get_kpis, get_low_stock_items
from app.features.ledger.service import get_product_ledger_summary
from app.features.products.service import get_product_stock_summary
from app.features.recommendations.service import get_reorder_recommendations
from app.features.risk.service import run_risk_checks
from app.models.models import Product


def get_groq_client() -> Groq:
    """Retrieve configured Groq SDK client or raise 503 if not configured."""
    if not settings.GROQ_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI copilot is not configured — set GROQ_API_KEY",
        )
    return Groq(api_key=settings.GROQ_API_KEY)


def serialize_data(obj: Any) -> Any:
    """Safely serialize Pydantic models, Decimals, UUIDs, and datetimes to JSON-compatible primitives."""
    if hasattr(obj, "model_dump"):
        obj = obj.model_dump()
    elif isinstance(obj, list):
        obj = [item.model_dump() if hasattr(item, "model_dump") else item for item in obj]
    return json.loads(json.dumps(obj, default=str))


async def classify_intent(client: Groq, question: str) -> str:
    """Classify user question into one of the fixed INTENTS using Groq."""
    prompt = (
        "You are an inventory assistant intent classifier. Classify the user question into exactly one of these intents:\n"
        "- low_stock_products: questions about products that are low in stock, need replenishment, or under minimum threshold\n"
        "- stockout_risk: questions about reorder recommendations, estimated stockout days, lead time, safety stock\n"
        "- product_stock_summary: questions asking for current stock, balance, or quantity across locations of a specific product\n"
        "- product_movement_explanation: questions about why a product decreased/increased or timeline of movements/transactions\n"
        "- inventory_risk_summary: questions about risk center, audit findings, cancellations, large adjustments\n"
        "- pending_operations: questions about pending receipts, deliveries, or scheduled transfers\n"
        "- dashboard_summary: questions asking for overall dashboard KPIs, high-level summary of inventory health\n"
        "Respond with ONLY the exact intent name. If none match, respond with 'unknown'."
    )
    completion = client.chat.completions.create(
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": question},
        ],
        model=settings.GROQ_MODEL,
        temperature=0.0,
    )
    raw = completion.choices[0].message.content.strip().lower()
    for intent in INTENTS:
        if intent in raw:
            return intent
    return "unknown"


async def resolve_product_from_question(db: AsyncSession, question: str) -> Product | None:
    """Case-insensitive lookup against Product.name and Product.sku to identify referenced product."""
    result = await db.execute(select(Product).where(Product.is_active.is_(True)))
    products = result.scalars().all()
    q_lower = question.lower()
    matched: list[Product] = []
    for p in products:
        if p.sku.lower() in q_lower or p.name.lower() in q_lower:
            matched.append(p)
    if matched:
        # Sort by descending length so most specific name matches first
        matched.sort(key=lambda p: max(len(p.name), len(p.sku)), reverse=True)
        return matched[0]
    return None


async def generate_explanation(client: Groq, question: str, data_json: str) -> str:
    """Synthesize structured JSON into a concise natural language explanation."""
    system_prompt = (
        "You are an AI Inventory Copilot assistant. You explain inventory data clearly and concisely.\n"
        "Produce ONE short paragraph explaining the result in plain language.\n"
        "CRITICAL CONSTRAINTS:\n"
        "- All numbers, document numbers, and quantities in your answer MUST originate from the structured JSON data.\n"
        "- Do NOT invent, assume, or hallucinate any numbers not present in the JSON.\n"
        "- Explicitly cite relevant product names, SKUs, document numbers, or quantities present in the data."
    )
    completion = client.chat.completions.create(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"User Question: {question}\nStructured Data:\n{data_json}"},
        ],
        model=settings.GROQ_MODEL,
        temperature=0.2,
    )
    return completion.choices[0].message.content.strip()


async def ask_copilot(db: AsyncSession, question: str) -> CopilotAskOut:
    """Orchestrates intent classification, service data fetching, and explanation generation."""
    client = get_groq_client()

    # Step 1: Classify intent
    intent = await classify_intent(client, question)

    # Step 2: Handle product-specific intents
    product_intents = ("product_stock_summary", "product_movement_explanation")
    product = await resolve_product_from_question(db, question)

    if intent in product_intents and product is None:
        return CopilotAskOut(
            intent=intent,
            data={"error": "product_not_found"},
            answer="Product not found. Please specify a valid product SKU or product name in your question.",
        )

    # Step 3: Call corresponding existing service function
    if intent == "low_stock_products":
        raw_data = await get_low_stock_items(db)
    elif intent == "stockout_risk":
        prod_id = product.id if product else None
        raw_data = await get_reorder_recommendations(db, product_id=prod_id)
    elif intent == "product_stock_summary":
        raw_data = await get_product_stock_summary(product.id, db)
    elif intent == "product_movement_explanation":
        raw_data = await get_product_ledger_summary(db, product_id=product.id)
    elif intent == "inventory_risk_summary":
        raw_data = await run_risk_checks(db)
    elif intent == "pending_operations":
        kpis = await get_kpis(db)
        raw_data = {
            "pending_receipts": kpis.pending_receipts,
            "pending_deliveries": kpis.pending_deliveries,
            "scheduled_transfers": kpis.scheduled_transfers,
        }
    elif intent == "dashboard_summary":
        raw_data = await get_kpis(db)
    else:
        return CopilotAskOut(
            intent="unknown",
            data={},
            answer=(
                "I'm sorry, I couldn't understand your question. You can ask about low stock products, "
                "stockout risks, product stock levels, movement history, inventory risks, or pending operations."
            ),
        )

    structured_data = serialize_data(raw_data)
    data_str = json.dumps(structured_data, indent=2)

    # Step 4: Generate plain-language explanation
    explanation = await generate_explanation(client, question, data_str)

    return CopilotAskOut(
        intent=intent,
        data=structured_data,
        answer=explanation,
    )
