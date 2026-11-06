from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


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


class QuestionRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)

    @field_validator("question")
    @classmethod
    def question_not_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("question must not be blank")
        return stripped


class SourceCitation(BaseModel):
    page: int = Field(ge=1)
    excerpt: str = Field(min_length=1)
    chunk_id: str = Field(min_length=1)


class ChatResponse(BaseModel):
    answer: str = Field(min_length=1)
    sources: list[SourceCitation]
    document_id: UUID


NOT_FOUND = "Not found in the paper."
INSUFFICIENT = "The paper does not contain sufficient information."


class PaperSummary(BaseModel):
    """Fields copied from the stored paper. Unsupported fields are the not-found sentence."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(description="Title")
    authors: str = Field(description="Authors")
    abstract: str = Field(description="Abstract")
    problem_statement: str = Field(description="Problem Statement")
    methodology: str = Field(description="Methodology")
    key_results: str = Field(description="Key Results")
    conclusion: str = Field(description="Conclusion")

    @field_validator("*", mode="before")
    @classmethod
    def blank_means_not_found(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or NOT_FOUND
        return value
