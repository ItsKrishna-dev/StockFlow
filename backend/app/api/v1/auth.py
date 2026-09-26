"""
app/api/v1/auth.py

Backwards-compatible wrapper re-exporting the auth feature router.
"""
from app.features.auth.router import (  # noqa: F401
    forgot_password,
    get_me,
    login,
    login_oauth2,
    logout,
    refresh_token,
    register,
    reset_password,
    router,
)

__all__ = ["router"]
