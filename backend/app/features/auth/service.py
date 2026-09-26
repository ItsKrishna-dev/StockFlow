"""
app/features/auth/service.py

Business logic for the auth feature slice:
- Password hashing & verification
- Token creation & rotation
- User registration
- OTP generation & password reset
"""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.features.auth.schemas import (
    LoginRequest,
    RefreshRequest,
    RequestOTPRequest,
    ResetPasswordRequest,
    SignupRequest,
    TokenResponse,
    UserOut,
)
from app.models.models import OTPToken, RefreshToken, User


def hash_token(token: str) -> str:
    """Fast, deterministic SHA-256 hash for database token lookup."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def authenticate_and_issue_tokens(
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

    user.last_login_at = datetime.now(timezone.utc)

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    db_refresh = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(refresh_token),
        expires_at=expires_at,
    )
    db.add(db_refresh)
    await db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


async def register_new_user(payload: SignupRequest, db: AsyncSession) -> UserOut:
    existing = await db.execute(select(User).where(User.email == payload.email.strip().lower()))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

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


async def refresh_tokens(payload: RefreshRequest, db: AsyncSession) -> TokenResponse:
    token_data = decode_token(payload.refresh_token)
    if token_data.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type: expected a refresh token.",
        )

    user_id = token_data.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload.")

    hashed = hash_token(payload.refresh_token)
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

    db_token.revoked_at = now

    new_access = create_access_token(db_token.user_id)
    new_refresh = create_refresh_token(db_token.user_id)

    new_db_refresh = RefreshToken(
        user_id=db_token.user_id,
        token_hash=hash_token(new_refresh),
        expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(new_db_refresh)
    await db.commit()

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        token_type="bearer",
    )


async def logout_session(user_id: UUID, refresh_token: str | None, db: AsyncSession) -> dict:
    now = datetime.now(timezone.utc)
    if refresh_token:
        hashed = hash_token(refresh_token)
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.token_hash == hashed, RefreshToken.user_id == user_id)
            .values(revoked_at=now)
        )
    else:
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=now)
        )
    await db.commit()
    return {"message": "Successfully logged out and session revoked."}


async def generate_reset_otp(email: str, db: AsyncSession) -> dict:
    result = await db.execute(select(User).where(User.email == email.strip().lower()))
    user = result.scalar_one_or_none()

    generic_msg = {"message": "If this email is registered, a 6-digit OTP has been issued."}
    if user is None or not user.is_active:
        return generic_msg

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

    # Deliver real-time email
    from app.core.email import send_otp_email
    await send_otp_email(user.email, otp_code, user.full_name)

    return generic_msg


async def verify_otp_and_reset_password(payload: ResetPasswordRequest, db: AsyncSession) -> dict:
    result = await db.execute(select(User).where(User.email == str(payload.email).lower()))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request or expired OTP.",
        )

    now = datetime.now(timezone.utc)
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

    otp_entry.used_at = now
    user.password_hash = hash_password(payload.new_password)

    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=now)
    )

    await db.commit()
    return {"message": "Password updated successfully. Please log in with your new credentials."}
