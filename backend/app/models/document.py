from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class DocumentStatus(str, PyEnum):
    processing = "processing"
    ready = "ready"
    failed = "failed"


class ProcessingStage(str, PyEnum):
    extracting = "extracting"
    indexing = "indexing"
    summarizing = "summarizing"


class Document(Base):
    __tablename__ = "documents"
    __table_args__ = (Index("ix_documents_user_id", "user_id"),)

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    page_count: Mapped[int] = mapped_column(nullable=False)
    chunk_count: Mapped[int] = mapped_column(nullable=False)
    status: Mapped[DocumentStatus] = mapped_column(
        default=DocumentStatus.processing, nullable=False
    )
    stage: Mapped[ProcessingStage | None] = mapped_column(nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    error_message: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="documents")