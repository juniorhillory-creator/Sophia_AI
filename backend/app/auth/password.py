import argon2
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.core.settings import Settings, get_settings


class PasswordService:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._hasher = PasswordHasher(
            time_cost=self._settings.argon2_time_cost,
            memory_cost=self._settings.argon2_memory_cost,
            parallelism=self._settings.argon2_parallelism,
            hash_len=32,
            salt_len=16,
            type=argon2.Type.ID,
        )

    def hash_password(self, password: str) -> str:
        """Hash a password using Argon2id."""
        return self._hasher.hash(password)

    def verify_password(self, password: str, password_hash: str) -> bool:
        """Verify a password against its hash."""
        try:
            self._hasher.verify(password_hash, password)
            return True
        except VerifyMismatchError:
            return False
        except Exception:
            return False

    def needs_rehash(self, password_hash: str) -> bool:
        """Check if a password hash needs to be rehashed with current parameters."""
        return self._hasher.check_needs_rehash(password_hash)


_password_service: PasswordService | None = None


def get_password_service() -> PasswordService:
    global _password_service
    if _password_service is None:
        _password_service = PasswordService()
    return _password_service