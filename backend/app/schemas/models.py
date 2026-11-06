from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class ErrorBody(BaseModel):
    code: str
    message: str


class HealthResponse(BaseModel):
    status: Literal["ok"]


class Document(BaseModel):
    id: UUID
    filename: str = Field(min_length=1, max_length=255)
    page_count: int = Field(ge=1)
    chunk_count: int = Field(ge=1)
    created_at: datetime


class Chunk(BaseModel):
    chunk_id: str = Field(min_length=1)
    document_id: UUID
    page_number: int = Field(ge=1)
    index_on_page: int = Field(ge=0)
    text: str = Field(min_length=1)


class ChunkList(BaseModel):
    document_id: UUID
    chunks: list[Chunk]
