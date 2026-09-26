"""
tests/test_copilot.py

Verify AI Inventory Copilot:
- 503 response when GROQ_API_KEY is not configured
- Intent routing for multiple intents with mocked Groq client
- Product not found path bypassing second LLM call
- Verified product movement explanation path
"""
from unittest.mock import MagicMock, patch
import uuid
import pytest
import httpx


def make_mock_groq_client(classification_intent: str, explanation_text: str = "Mocked explanation"):
    client = MagicMock()

    class MockMessage:
        def __init__(self, content):
            self.content = content

    class MockChoice:
        def __init__(self, content):
            self.message = MockMessage(content)

    class MockCompletion:
        def __init__(self, content):
            self.choices = [MockChoice(content)]

    # First call: classification, Second call: explanation
    client.chat.completions.create.side_effect = [
        MockCompletion(classification_intent),
        MockCompletion(explanation_text),
    ]
    return client


@pytest.mark.asyncio
async def test_copilot_503_when_no_api_key(staff_client: httpx.AsyncClient):
    with patch("app.features.copilot.service.settings.GROQ_API_KEY", None):
        res = await staff_client.post("/api/v1/copilot/ask", json={"question": "What is low on stock?"})
        assert res.status_code == 503
        assert "AI copilot is not configured" in res.json()["detail"]


@pytest.mark.asyncio
async def test_copilot_intent_routing_low_stock(staff_client: httpx.AsyncClient):
    mock_client = make_mock_groq_client("low_stock_products", "Here are the current low stock products.")
    with patch("app.features.copilot.service.get_groq_client", return_value=mock_client), \
         patch("app.features.copilot.service.settings.GROQ_API_KEY", "dummy_key"):
        res = await staff_client.post("/api/v1/copilot/ask", json={"question": "What items are low on stock?"})
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["intent"] == "low_stock_products"
        assert isinstance(data["data"], list)
        assert data["answer"] == "Here are the current low stock products."
        assert mock_client.chat.completions.create.call_count == 2


@pytest.mark.asyncio
async def test_copilot_intent_routing_pending_operations(staff_client: httpx.AsyncClient):
    mock_client = make_mock_groq_client("pending_operations", "There are pending operations waiting for review.")
    with patch("app.features.copilot.service.get_groq_client", return_value=mock_client), \
         patch("app.features.copilot.service.settings.GROQ_API_KEY", "dummy_key"):
        res = await staff_client.post("/api/v1/copilot/ask", json={"question": "Are there any pending operations?"})
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["intent"] == "pending_operations"
        assert "pending_receipts" in data["data"]
        assert data["answer"] == "There are pending operations waiting for review."
        assert mock_client.chat.completions.create.call_count == 2


@pytest.mark.asyncio
async def test_copilot_intent_routing_risk_summary(staff_client: httpx.AsyncClient):
    mock_client = make_mock_groq_client("inventory_risk_summary", "Inventory risk overview shows normal operations.")
    with patch("app.features.copilot.service.get_groq_client", return_value=mock_client), \
         patch("app.features.copilot.service.settings.GROQ_API_KEY", "dummy_key"):
        res = await staff_client.post("/api/v1/copilot/ask", json={"question": "What are the latest inventory risks?"})
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["intent"] == "inventory_risk_summary"
        assert isinstance(data["data"], list)
        assert data["answer"] == "Inventory risk overview shows normal operations."
        assert mock_client.chat.completions.create.call_count == 2


@pytest.mark.asyncio
async def test_copilot_product_not_found_bypasses_second_llm_call(staff_client: httpx.AsyncClient):
    mock_client = make_mock_groq_client("product_stock_summary")
    with patch("app.features.copilot.service.get_groq_client", return_value=mock_client), \
         patch("app.features.copilot.service.settings.GROQ_API_KEY", "dummy_key"):
        res = await staff_client.post(
            "/api/v1/copilot/ask",
            json={"question": "How much NonExistentPart99999 is in stock?"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["intent"] == "product_stock_summary"
        assert data["data"] == {"error": "product_not_found"}
        assert "Product not found" in data["answer"]
        # Only 1 call made for classification; 2nd call was bypassed!
        assert mock_client.chat.completions.create.call_count == 1


@pytest.mark.asyncio
async def test_copilot_product_movement_explanation_flow(
    manager_client: httpx.AsyncClient,
    staff_client: httpx.AsyncClient,
    seed_data: dict,
):
    unique = uuid.uuid4().hex[:6].upper()
    sku = f"COPILOT-{unique}"
    uom_id = str(seed_data["uom_pcs"].id)

    # Create product
    await manager_client.post(
        "/api/v1/products",
        json={"sku": sku, "name": f"Copilot Rods {sku}", "uom_id": uom_id},
    )

    mock_client = make_mock_groq_client(
        "product_movement_explanation",
        f"Copilot Rods {sku} movements were tracked successfully.",
    )
    with patch("app.features.copilot.service.get_groq_client", return_value=mock_client), \
         patch("app.features.copilot.service.settings.GROQ_API_KEY", "dummy_key"):
        res = await staff_client.post(
            "/api/v1/copilot/ask",
            json={"question": f"Why did Copilot Rods {sku} change?"},
        )
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["intent"] == "product_movement_explanation"
        assert data["data"]["sku"] == sku
        assert mock_client.chat.completions.create.call_count == 2
