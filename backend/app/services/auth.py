import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from jose import jwt

from app.auth.password import get_password_service
from app.core.settings import Settings, get_settings
from app.db.session import get_db_session
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

    def _create_tokens(self, user: User) -> tuple[str, str]:
        """Create access and refresh tokens for a user."""
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
            self._settings.jwt_private_key_path,
            algorithm=self._settings.jwt_algorithm,
        )

        refresh_token = jwt.encode(
            {
                "sub": str(user.id),
                "type": "refresh",
                "iat": int(now.timestamp()),
                "exp": int(refresh_expires.timestamp()),
            },
            self._settings.jwt_private_key_path,
            algorithm=self._settings.jwt_algorithm,
        )

        return access_token, refresh_token

    def _hash_token(self, token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    async def register(self, data: RegisterRequest) -> tuple[str, str, User]:
        """Register a new user."""
        async with get_db_session() as session:
            # Check if username or email already exists
            existing = await session.execute(
                "SELECT 1 FROM users WHERE username = :username OR email = :email",
                {"username": data.username, "email": data.email},
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

            # Create tokens
            access_token, refresh_token = self._create_tokens(user)
            return access_token, refresh_token, user

    async def login(self, data: LoginRequest) -> tuple[str, str, User]:
        """Authenticate user with username/email and password."""
        async with get_db_session() as session:
            # Find user by username or email
            user = await session.execute(
                "SELECT * FROM users WHERE username = :identifier OR email = :identifier",
                {"identifier": data.username_or_email},
            )
            user = user.scalar_one_or_none()

            if user is None or user.password_hash is None:
                raise AppError("invalid_credentials", "Invalid username/email or password.", 401)

            # Verify password
            password_service = get_password_service()
            if not password_service.verify_password(data.password, user.password_hash):
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
        try:
            payload = jwt.decode(
                refresh_token,
                self._settings.jwt_public_key_path,
                algorithms=[self._settings.jwt_algorithm],
            )
        except jwt.ExpiredSignatureError:
            raise AppError("token_expired", "Refresh token has expired.", 401)
        except jwt.JWTError:
            raise AppError("invalid_token", "Invalid refresh token.", 401)

        if payload.get("type") != "refresh":
            raise AppError("invalid_token", "Invalid token type.", 401)

        user_id = UUID(payload["sub"])

        async with get_db_session() as session:
            user = await session.get("User", payload["sub"])
            if user is None or not user.is_active:
                raise AppError("invalid_token", "Invalid refresh token.", 401)

            access_token, refresh_token = self._create_tokens(user)
            return access_token, refresh_token

    async def logout(self, access_token: str) -> None:
        """Logout - currently just a no-op since tokens are stateless."""
        # In a more complete implementation, you'd add token to a blocklist
        pass

    async def forgot_password(self, data: ForgotPasswordRequest) -> str:
        """Request password reset token."""
        async with get_db_session() as session:
            user = await session.execute(
                "SELECT * FROM users WHERE username = :identifier OR email = :identifier",
                {"identifier": data.username_or_email},
            )
            user = user.scalar_one_or_none()

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
                expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            )

            # Store in DB
            # For now, we'll just return the token (in production, send via email)
            return f"Reset token: {token}"

    async def reset_password(self, data: ResetPasswordRequest) -> None:
        """Reset password using token."""
        token_hash = hashlib.sha256(data.token.encode()).hexdigest()

        async with get_db_session() as session:
            token = await session.execute(
                "SELECT * FROM password_reset_tokens WHERE token_hash = :hash AND used_at IS NULL AND expires_at > :now",
                {"hash": token_hash, "now": datetime.now(timezone.utc)},
            )
            token_obj = token.scalar_one_or_none()

            if token_obj is None:
                raise AppError("invalid_token", "Invalid or expired reset token.", 400)

            # Update password
            password_service = get_password_service()
            new_hash = get_password_service().hash_password(data.new_password)

            await session.execute(
                "UPDATE users SET password_hash = :hash WHERE id = :id",
                {"hash": password_service.hash_password(data.new_password), "id": token_obj.user_id},
            )

            # Mark token as used
            token_obj.used_at = datetime.now(timezone.utc)

    async def google_auth(self, data: GoogleAuthRequest) -> tuple[str, str, User, bool]:
        """Authenticate via Google OAuth."""
        # TODO: Implement Google OAuth token exchange
        raise AppError("not_implemented", "Google OAuth not implemented yet.", 501)

    def _to_user_response(self, user: User) -> "UserResponse":
        from app.schemas.auth import UserResponse
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
        from app.schemas.auth import AuthResponse, TokenResponse, UserResponse
        return AuthResponse(
            user=UserResponse(
                id=user.id,
                username=user.username,
                email=user.email,
                full_name=user.full_name,
                avatar_url=user.avatar_url,
                is_active=user.is_active,
                is_verified=user.is_verified,
                created_at=user.created_at,
                updated_at=user.updated_at,
            ),
            tokens=TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
            ),
        )


# Module-level instance
_auth_service: Optional["AuthService"] = None


def get_auth_service() -> "AuthService":
    global _auth_service
    if _auth_service is None:
        _auth_service = AuthService()
    return _auth_service