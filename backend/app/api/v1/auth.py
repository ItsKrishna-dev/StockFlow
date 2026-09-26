"""
app/api/v1/auth.py

Authentication and user lifecycle endpoints:
- Registration / Signup (both /register and /signup aliases)
- OAuth2 token endpoint for Swagger UI (/token)
- JSON Login for React frontend (/login)
- Refresh token rotation (/refresh)
- Logout with session revocation (/logout)
- Forgot-password OTP generation (/forgot-password)
- OTP-based password reset (/reset-password)
- Current user profile (/me)
"""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.models.models import OTPToken, RefreshToken, User
from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    RequestOTPRequest,
    ResetPasswordRequest,
    SignupRequest,
    TokenResponse,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _hash_token(token: str) -> str:
    """Fast, deterministic SHA-256 hash for database token lookup."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def _authenticate_and_issue_tokens(
    email: str,
    password: str,
    db: AsyncSession,
) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == email.strip().lower()))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated.",
        )

    # Update last login timestamp
    user.last_login_at = datetime.now(timezone.utc)

    # Issue tokens
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    # Store hashed refresh token in database for session tracking & revocation
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    db_refresh = RefreshToken(
        user_id=user.id,
        token_hash=_hash_token(refresh_token),
        expires_at=expires_at,
    )
    db.add(db_refresh)
    await db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: SignupRequest,
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    # Check if email is already taken
    existing = await db.execute(select(User).where(User.email == payload.email.strip().lower()))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    # Validate role against allowed roles
    allowed_roles = {"admin", "inventory_manager", "warehouse_staff"}
    role = payload.role if payload.role in allowed_roles else "warehouse_staff"

    new_user = User(
        email=str(payload.email).strip().lower(),
        password_hash=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        role=role,
        phone=payload.phone,
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return UserOut.model_validate(new_user)


@router.post("/token", response_model=TokenResponse, summary="OAuth2 Token (Swagger UI)")
async def login_oauth2(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Standard OAuth2 password flow endpoint used by Swagger UI's Authorize dialog."""
    return await _authenticate_and_issue_tokens(form_data.username, form_data.password, db)


@router.post("/login", response_model=TokenResponse, summary="User Login (JSON)")
async def login_user(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """JSON login endpoint for React frontend and API clients."""
    return await _authenticate_and_issue_tokens(str(payload.email), payload.password, db)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    payload: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    token_data = decode_token(payload.refresh_token)
    if token_data.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type: expected a refresh token.",
        )

    user_id = token_data.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload.")

    # Find the refresh token in DB
    hashed = _hash_token(payload.refresh_token)
    stmt = select(RefreshToken).where(
        RefreshToken.token_hash == hashed,
        RefreshToken.revoked_at.is_(None),
    )
    res = await db.execute(stmt)
    db_token = res.scalar_one_or_none()

    now = datetime.now(timezone.utc)
    if db_token is None or db_token.expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired or has been revoked.",
        )

    # Revoke old refresh token (token rotation)
    db_token.revoked_at = now

    # Issue new token pair
    new_access = create_access_token(db_token.user_id)
    new_refresh = create_refresh_token(db_token.user_id)

    new_db_refresh = RefreshToken(
        user_id=db_token.user_id,
        token_hash=_hash_token(new_refresh),
        expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(new_db_refresh)
    await db.commit()

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        token_type="bearer",
    )


@router.post("/logout")
async def logout_user(
    payload: RefreshRequest | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    now = datetime.now(timezone.utc)

    if payload and payload.refresh_token:
        # Revoke specific refresh token
        hashed = _hash_token(payload.refresh_token)
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.token_hash == hashed, RefreshToken.user_id == current_user.id)
            .values(revoked_at=now)
        )
    else:
        # Revoke all active refresh tokens for the user
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == current_user.id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=now)
        )

    await db.commit()
    return {"message": "Successfully logged out and session revoked."}


@router.post("/forgot-password")
async def request_password_reset_otp(
    payload: RequestOTPRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(User).where(User.email == str(payload.email).lower()))
    user = result.scalar_one_or_none()

    # Generic response to avoid email enumeration
    generic_msg = {"message": "If this email is registered, a 6-digit OTP has been issued."}

    if user is None or not user.is_active:
        return generic_msg

    # Generate secure 6-digit OTP
    otp_code = str(secrets.randbelow(900000) + 100000)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=15)

    otp_entry = OTPToken(
        user_id=user.id,
        otp_code=otp_code,
        purpose="password_reset",
        expires_at=expires_at,
    )
    db.add(otp_entry)
    await db.commit()

    # In development, log the OTP for easy local testing
    if settings.ENVIRONMENT == "development":
        print(f"\n[DEV OTP] Password reset OTP for {user.email}: {otp_code} (Valid for 15 mins)\n")

    return generic_msg


@router.post("/reset-password")
async def reset_password_with_otp(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(User).where(User.email == str(payload.email).lower()))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request or expired OTP.",
        )

    now = datetime.now(timezone.utc)
    # Check valid, unexpired OTP for this user
    otp_stmt = (
        select(OTPToken)
        .where(
            OTPToken.user_id == user.id,
            OTPToken.otp_code == payload.otp_code.strip(),
            OTPToken.purpose == "password_reset",
            OTPToken.used_at.is_(None),
            OTPToken.expires_at > now,
        )
        .order_by(OTPToken.created_at.desc())
    )
    otp_res = await db.execute(otp_stmt)
    otp_entry = otp_res.scalars().first()

    if otp_entry is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code.",
        )

    # Mark OTP as used
    otp_entry.used_at = now

    # Update password
    user.password_hash = hash_password(payload.new_password)

    # Invalidate all active refresh tokens so existing sessions must re-authenticate
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=now)
    )

    await db.commit()
    return {"message": "Password updated successfully. Please log in with your new credentials."}


@router.get("/me", response_model=UserOut)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
) -> UserOut:
    return UserOut.model_validate(current_user)
