"""
app/schemas/auth.py

Re-exports from app.features.auth.schemas for backwards compatibility.
"""
from app.features.auth.schemas import (
    LoginRequest,
    RefreshRequest,
    RequestOTPRequest,
    ResetPasswordRequest,
    SignupRequest,
    TokenResponse,
    UserOut,
)

__all__ = [
    "SignupRequest",
    "LoginRequest",
    "TokenResponse",
    "RefreshRequest",
    "RequestOTPRequest",
    "ResetPasswordRequest",
    "UserOut",
]
