from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from app.domain.errors import AppError
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    GoogleAuthRequest,
    LoginRequest,
    PasswordResetTokenResponse,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
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
            tokens={"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"},
        )
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
            tokens={"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"},
        )
    except Exception as e:
        if hasattr(e, "status_code"):
            raise
        raise HTTPException(status_code=401, detail="Invalid credentials")


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: dict, service=Depends(get_service)):
    """Refresh access token using refresh token."""
    refresh_token = data.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="refresh_token required")

    try:
        access_token, refresh_token = await service.refresh_tokens(refresh_token)
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
        )
    except Exception as e:
        if hasattr(e, "status_code"):
            raise
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(data: dict, service=Depends(get_service)):
    """Logout - invalidate tokens (currently no-op for stateless JWT)."""
    access_token = data.get("access_token")
    if access_token:
        await service.logout(access_token)
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/forgot-password", response_model=PasswordResetTokenResponse)
async def forgot_password(data: ForgotPasswordRequest, service=Depends(get_service)):
    """Request password reset token."""
    try:
        message = await service.forgot_password(data)
        return PasswordResetTokenResponse(message=message)
    except Exception:
        # Always return success to prevent user enumeration
        return PasswordResetTokenResponse(message="If the account exists, a password reset link has been sent.")


@router.post("/reset-password", response_model=PasswordResetTokenResponse)
async def reset_password(data: ResetPasswordRequest, service=Depends(get_service)):
    """Reset password using token."""
    try:
        await service.reset_password(data)
        return PasswordResetTokenResponse(message="Password has been reset successfully.")
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
            tokens={"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"},
        )
    except Exception as e:
        if hasattr(e, "status_code"):
            raise
        raise HTTPException(status_code=501, detail="Google OAuth not implemented")


# Import schemas needed for response models
from app.schemas.auth import PasswordResetTokenResponse