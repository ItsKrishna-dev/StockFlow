"""
app/features/auth/schemas.py

Pydantic request/response contracts for the auth feature slice.
"""
import uuid
from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    login_id: str = Field(min_length=6, max_length=12, description="Unique login ID between 6 and 12 characters")
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = None
    role: str = Field(default="warehouse_staff")
    phone: str | None = None


class LoginRequest(BaseModel):
    login_id: str | None = None
    email: str | None = None
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class RequestOTPRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp_code: str
    new_password: str = Field(min_length=8, max_length=128)


class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    login_id: str | None = None
    full_name: str
    role: str
    is_active: bool

    model_config = {"from_attributes": True}
