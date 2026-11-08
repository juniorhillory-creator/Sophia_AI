from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.core.settings import Settings, get_settings
from app.db.base import Base


class Database:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._engine: AsyncEngine | None = None
        self._session_factory: async_sessionmaker[AsyncSession] | None = None

    def connect(self) -> None:
        if self._engine is not None:
            return
        self._engine = create_async_engine(
            self._settings.database_url,
            echo=self._settings.database_echo,
            pool_pre_ping=True,
        )
        self._session_factory = async_sessionmaker(
            self._engine, class_=AsyncSession, expire_on_commit=False
        )

    async def disconnect(self) -> None:
        if self._engine is not None:
            await self._engine.dispose()
            self._engine = None
            self._session_factory = None

    @asynccontextmanager
    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        if self._session_factory is None:
            raise RuntimeError("Database not connected. Call connect() first.")
        async with self._session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    async def create_tables(self) -> None:
        if self._engine is None:
            raise RuntimeError("Database not connected. Call connect() first.")
        async with self._engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def drop_tables(self) -> None:
        if self._engine is None:
            raise RuntimeError("Database not connected. Call connect() first.")
        async with self._engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


_db_instance: Database | None = None


def get_database() -> Database:
    global _db_instance
    if _db_instance is None:
        _db_instance = Database()
    return _db_instance


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    db = get_database()
    async with db.session() as session:
        yield session