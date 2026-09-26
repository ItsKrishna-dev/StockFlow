"""
app/features/integrity/schemas.py

Pydantic contracts for stock integrity check summaries and issues.
"""
from typing import Literal
from pydantic import BaseModel, ConfigDict


class IntegrityIssue(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    severity: Literal["high", "medium", "low"]
    check: str
    message: str
    document_number: str | None = None


class IntegritySummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    status: Literal["healthy", "warning", "critical"]
    integrity_score: float
    checks_run: int
    issues_found: int
    issues: list[IntegrityIssue]
