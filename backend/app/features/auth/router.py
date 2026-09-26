"""
app/features/auth/router.py

FastAPI router for the authentication feature slice.
"""
from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.features.auth import service
from app.features.auth.schemas import (
    LoginRequest,
    RefreshRequest,
    RequestOTPRequest,
    ResetPasswordRequest,
    SignupRequest,
    TokenResponse,
    UserOut,
)
from app.models.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(payload: SignupRequest, db: AsyncSession = Depends(get_db)) -> UserOut:
    return await service.register_new_user(payload, db)


@router.post("/token", response_model=TokenResponse, summary="OAuth2 Token (Swagger UI)")
async def login_oauth2(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Standard OAuth2 password flow endpoint for Swagger UI Authorize modal."""
    return await service.authenticate_and_issue_tokens(form_data.username, form_data.password, db)


@router.post("/login", response_model=TokenResponse, summary="User Login (JSON)")
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """JSON login endpoint for React frontend, mobile, and API clients."""
    return await service.authenticate_and_issue_tokens(str(payload.email), payload.password, db)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    return await service.refresh_tokens(payload, db)


@router.post("/logout")
async def logout(
    payload: RefreshRequest | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    refresh_tok = payload.refresh_token if payload else None
    return await service.logout_session(current_user.id, refresh_tok, db)


@router.post("/forgot-password")
async def forgot_password(payload: RequestOTPRequest, db: AsyncSession = Depends(get_db)) -> dict:
    return await service.generate_reset_otp(str(payload.email), db)


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)) -> dict:
    return await service.verify_otp_and_reset_password(payload, db)


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)
