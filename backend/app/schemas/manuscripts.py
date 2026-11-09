from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ManuscriptBase(BaseModel):
    title: str = Field(default="Untitled Manuscript", max_length=255)
    content: str = Field(default="")
    status: str = Field(default="draft")
    document_id: UUID | None = None


class ManuscriptCreate(ManuscriptBase):
    pass


class ManuscriptUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    status: str | None = None
    document_id: UUID | None = None


class Manuscript(ManuscriptBase):
    id: UUID
    user_id: UUID
    version: int = 1
    created_at: datetime
    updated_at: datetime

