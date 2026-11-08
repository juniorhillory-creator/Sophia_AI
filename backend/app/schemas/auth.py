from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8)
    confirm_password: str = Field(min_length=8)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in value):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in value):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in value):
            raise ValueError("Password must contain at least one number")
        return value

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, value: str, info) -> str:
<<<<<<< HEAD
        if "password" in info.data and info.data["password"] != value:
=======
        if info.data.get("password") != value:
>>>>>>> 0fca1bbaffa87e45686a97d043d28b7a2e96ae81
            raise ValueError("Passwords do not match")
        return value


class LoginRequest(BaseModel):
    username_or_email: str = Field(min_length=1)
    password: str = Field(min_length=1)


class ForgotPasswordRequest(BaseModel):
    username_or_email: str = Field(min_length=1)


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=1)
    new_password: str = Field(min_length=8)
    confirm_password: str = Field(min_length=8)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in value):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in value):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in value):
            raise ValueError("Password must contain at least one number")
        return value

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, value: str, info) -> str:
        if info.data.get("new_password") != value:
            raise ValueError("Passwords do not match")
        return value


class GoogleAuthRequest(BaseModel):
    code: str = Field(min_length=1)
    redirect_uri: str = Field(min_length=1)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class LogoutRequest(BaseModel):
    access_token: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    username: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime


class AuthResponse(BaseModel):
    user: "UserResponse"
    tokens: "TokenResponse"


class PasswordResetTokenResponse(BaseModel):
    message: str


class GoogleAuthResponse(BaseModel):
    user: "UserResponse"
    tokens: "TokenResponse"
    is_new_user: bool


UserResponse.model_rebuild()
AuthResponse.model_rebuild()
TokenResponse.model_rebuild()
GoogleAuthResponse.model_rebuild()
