import hashlib
from pathlib import Path
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from jose import jwt
from sqlalchemy import or_, select, text

from app.auth.password import get_password_service
from app.core.settings import Settings, get_settings
from app.db.session import get_database, get_db_session
from app.domain.errors import AppError
from app.models.user import (
    EmailVerificationToken,
    OAuthAccount,
    OAuthProvider,
    PasswordResetToken,
    User,
)
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    GoogleAuthRequest,
    GoogleAuthResponse,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
)


class AuthService:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._password_service = get_password_service()

    def _get_keys(self) -> tuple[str, str]:
        if not hasattr(self, "_private_key"):
            priv_path = Path(self._settings.jwt_private_key_path)
            if not priv_path.exists():
                candidate = Path(__file__).resolve().parent.parent.parent / self._settings.jwt_private_key_path
                if candidate.exists():
                    priv_path = candidate
            with open(priv_path, "r", encoding="utf-8") as f:
                self._private_key = f.read()

            pub_path = Path(self._settings.jwt_public_key_path)
            if not pub_path.exists():
                candidate = Path(__file__).resolve().parent.parent.parent / self._settings.jwt_public_key_path
                if candidate.exists():
                    pub_path = candidate
            with open(pub_path, "r", encoding="utf-8") as f:
                self._public_key = f.read()
        return self._private_key, self._public_key

    def _create_tokens(self, user: User) -> tuple[str, str]:
        """Create access and refresh tokens for a user."""
        private_key, _ = self._get_keys()
        now = datetime.now(timezone.utc)
        access_expires = now + timedelta(minutes=self._settings.access_token_expire_minutes)
        refresh_expires = now + timedelta(days=self._settings.refresh_token_expire_days)

        access_token = jwt.encode(
            {
                "sub": str(user.id),
                "type": "access",
                "iat": int(now.timestamp()),
                "exp": int(access_expires.timestamp()),
            },
            private_key,
            algorithm=self._settings.jwt_algorithm,
        )

        refresh_token = jwt.encode(
            {
                "sub": str(user.id),
                "type": "refresh",
                "iat": int(now.timestamp()),
                "exp": int(refresh_expires.timestamp()),
            },
            private_key,
            algorithm=self._settings.jwt_algorithm,
        )

        return access_token, refresh_token

    def _hash_token(self, token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    async def register(self, data: RegisterRequest) -> tuple[str, str, User]:
        """Register a new user."""
        db = get_database()
        async with db.session() as session:
            # Check if username or email already exists
            existing = await session.execute(
                select(User).where(or_(User.username == data.username, User.email == data.email))
            )
            if existing.scalar_one_or_none():
                raise AppError("conflict", "Username or email already registered.", 409)

            # Create user
            password_hash = self._password_service.hash_password(data.password)
            user = User(
                username=data.username,
                email=data.email,
                password_hash=password_hash,
            )

            session.add(user)
            await session.flush()
            await session.refresh(user)

            # Create tokens
            access_token, refresh_token = self._create_tokens(user)
            return access_token, refresh_token, user

    async def login(self, data: LoginRequest) -> tuple[str, str, User]:
        """Authenticate user with username/email and password."""
        db = get_database()
        async with db.session() as session:
            result = await session.execute(
                select(User).where(or_(User.username == data.username_or_email, User.email == data.username_or_email))
            )
            user = result.scalar_one_or_none()

            if user is None or user.password_hash is None:
                raise AppError("invalid_credentials", "Invalid username/email or password.", 401)

            # Verify password
            if not self._password_service.verify_password(data.password, user.password_hash):
                raise AppError("invalid_credentials", "Invalid username/email or password.", 401)

            if not user.is_active:
                raise AppError("account_disabled", "Account is disabled.", 403)

            # Update last login
            user.last_login_at = datetime.now(timezone.utc)

            # Create tokens
            access_token, refresh_token = self._create_tokens(user)
            return access_token, refresh_token, user

    async def refresh_tokens(self, refresh_token: str) -> tuple[str, str]:
        """Refresh access token using refresh token."""
        _, public_key = self._get_keys()
        try:
            payload = jwt.decode(
                refresh_token,
                public_key,
                algorithms=[self._settings.jwt_algorithm],
            )
        except jwt.ExpiredSignatureError:
            raise AppError("token_expired", "Refresh token has expired.", 401)
        except jwt.JWTError:
            raise AppError("invalid_token", "Invalid refresh token.", 401)

        if payload.get("type") != "refresh":
            raise AppError("invalid_token", "Invalid token type.", 401)

        user_id = UUID(payload["sub"])

        db = get_database()
        async with db.session() as session:
            user = await session.get(User, user_id)
            if user is None or not user.is_active:
                raise AppError("invalid_token", "Invalid refresh token.", 401)

            access_token, new_refresh_token = self._create_tokens(user)
            return access_token, new_refresh_token

    async def logout(self, access_token: str) -> None:
        """Logout - stateless JWT token."""
        pass

    async def forgot_password(self, data: ForgotPasswordRequest) -> str:
        """Request password reset token."""
        db = get_database()
        async with db.session() as session:
            result = await session.execute(
                select(User).where(or_(User.username == data.username_or_email, User.email == data.username_or_email))
            )
            user = result.scalar_one_or_none()

            # Always return success message to prevent user enumeration
            if user is None:
                return "If the account exists, a password reset link has been sent."

            # Generate reset token
            token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

            reset_token = PasswordResetToken(
                user_id=user.id,
                token_hash=token_hash,
                expires_at=expires_at,
            )
            session.add(reset_token)

            return f"Reset token: {token}"

    async def reset_password(self, data: ResetPasswordRequest) -> None:
        """Reset password using token."""
        token_hash = hashlib.sha256(data.token.encode()).hexdigest()

        db = get_database()
        async with db.session() as session:
            result = await session.execute(
                select(PasswordResetToken).where(
                    PasswordResetToken.token_hash == token_hash,
                    PasswordResetToken.used_at.is_(None),
                    PasswordResetToken.expires_at > datetime.now(timezone.utc),
                )
            )
            token_obj = result.scalar_one_or_none()

            if token_obj is None:
                raise AppError("invalid_token", "Invalid or expired reset token.", 400)

            user = await session.get(User, token_obj.user_id)
            if user is None:
                raise AppError("invalid_token", "User not found.", 400)

            user.password_hash = self._password_service.hash_password(data.new_password)
            token_obj.used_at = datetime.now(timezone.utc)

    async def google_auth(self, data: GoogleAuthRequest) -> tuple[str, str, User, bool]:
        """Authenticate via Google OAuth."""
        raise AppError("not_implemented", "Google OAuth not configured.", 501)

    def _to_user_response(self, user: User) -> "UserResponse":
        return UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )

    def _to_auth_response(self, user: User, access_token: str, refresh_token: str, is_new_user: bool = False) -> "AuthResponse":
        return AuthResponse(
            user=self._to_user_response(user),
            tokens=TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                token_type="bearer",
            ),
        )


_auth_service: Optional["AuthService"] = None


def get_auth_service() -> "AuthService":
    global _auth_service
    if _auth_service is None:
        _auth_service = AuthService()
    return _auth_service
