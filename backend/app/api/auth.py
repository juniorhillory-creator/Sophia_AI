from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from app.db.session import get_database
from app.dependencies import get_current_user
from app.domain.errors import AppError
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    GoogleAuthRequest,
    LoginRequest,
    LogoutRequest,
    PasswordResetTokenResponse,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth import get_auth_service

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def get_service():
    return get_auth_service()


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, service=Depends(get_service)):
    """Register a new user."""
    try:
        access_token, refresh_token, user = await service.register(data)
        return AuthResponse(
            user=user,
            tokens=TokenResponse(access_token=access_token, refresh_token=refresh_token, token_type="bearer"),
        )
    except AppError:
        raise
    except Exception as e:
        if hasattr(e, "status_code"):
            raise
        raise HTTPException(status_code=500, detail="Registration failed")


@router.post("/login", response_model=AuthResponse)
async def login(data: LoginRequest, service=Depends(get_service)):
    """Authenticate user and return tokens."""
    try:
        access_token, refresh_token, user = await service.login(data)
        return AuthResponse(
            user=user,
            tokens=TokenResponse(access_token=access_token, refresh_token=refresh_token, token_type="bearer"),
        )
    except AppError:
        raise
    except Exception as e:
        if hasattr(e, "status_code"):
            raise
        raise HTTPException(status_code=401, detail="Invalid credentials")


@router.get("/me", response_model=UserResponse)
async def get_me(user_id: UUID = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    db = get_database()
    if not db.is_connected:
        raise HTTPException(status_code=503, detail="Database not connected")
    async with db.session() as session:
        user = await session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, service=Depends(get_service)):
    """Refresh access token using refresh token."""
    try:
        access_token, refresh_token = await service.refresh_tokens(data.refresh_token)
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
        )
    except AppError:
        raise
    except Exception as e:
        if hasattr(e, "status_code"):
            raise
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(data: LogoutRequest = LogoutRequest(), service=Depends(get_service)):
    """Logout - invalidate tokens (currently no-op for stateless JWT)."""
    if data.access_token:
        await service.logout(data.access_token)
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content=None)


@router.post("/forgot-password", response_model=PasswordResetTokenResponse)
async def forgot_password(data: ForgotPasswordRequest, service=Depends(get_service)):
    """Request password reset token."""
    try:
        message = await service.forgot_password(data)
        return PasswordResetTokenResponse(message=message)
    except Exception:
        return PasswordResetTokenResponse(message="If the account exists, a password reset link has been sent.")


@router.post("/reset-password", response_model=PasswordResetTokenResponse)
async def reset_password(data: ResetPasswordRequest, service=Depends(get_service)):
    """Reset password using token."""
    try:
        await service.reset_password(data)
        return PasswordResetTokenResponse(message="Password has been reset successfully.")
    except AppError:
        raise
    except Exception as e:
        if hasattr(e, "status_code"):
            raise
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")


@router.post("/google", response_model=AuthResponse)
async def google_auth(data: GoogleAuthRequest, service=Depends(get_service)):
    """Authenticate via Google OAuth."""
    try:
        access_token, refresh_token, user, is_new = await service.google_auth(data)
        return AuthResponse(
            user=user,
            tokens=TokenResponse(access_token=access_token, refresh_token=refresh_token, token_type="bearer"),
        )
    except AppError:
        raise
    except Exception as e:
        if hasattr(e, "status_code"):
            raise
        raise HTTPException(status_code=501, detail="Google OAuth not implemented")
