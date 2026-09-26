"""
app/features/copilot/schemas.py

Request and response contracts for the AI Inventory Copilot.
"""
from typing import Any
from pydantic import BaseModel


class CopilotAskIn(BaseModel):
    question: str


class CopilotAskOut(BaseModel):
    intent: str
    data: Any
    answer: str
