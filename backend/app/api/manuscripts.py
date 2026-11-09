from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.settings import Settings, get_settings
from app.core.supabase import SupabaseManuscriptService, get_supabase_client
from app.dependencies import get_current_user
from app.domain.errors import AppError
from app.schemas.manuscripts import Manuscript, ManuscriptCreate, ManuscriptUpdate

router = APIRouter(prefix="/api/v1/manuscripts", tags=["manuscripts"])


def _to_manuscript(row: dict) -> Manuscript:
    created = row.get("created_at")
    updated = row.get("updated_at")
    return Manuscript(
        id=UUID(row["id"]),
        user_id=UUID(row["user_id"]),
        document_id=UUID(row["document_id"]) if row.get("document_id") else None,
        title=row.get("title", "Untitled Manuscript"),
        content=row.get("content", ""),
        status=row.get("status", "draft"),
        version=row.get("version", 1),
        created_at=datetime.fromisoformat(created.replace("Z", "+00:00")) if isinstance(created, str) else created,
        updated_at=datetime.fromisoformat(updated.replace("Z", "+00:00")) if isinstance(updated, str) else updated,
    )


def _get_service(settings: Settings = Depends(get_settings)) -> SupabaseManuscriptService:
    client = get_supabase_client(settings)
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    return SupabaseManuscriptService(client)


@router.get("", response_model=list[Manuscript])
async def list_manuscripts(
    user_id: UUID = Depends(get_current_user),
    service: SupabaseManuscriptService = Depends(_get_service),
) -> list[Manuscript]:
    rows = await service.list_manuscripts(user_id)
    return [_to_manuscript(r) for r in rows]


@router.post("", response_model=Manuscript, status_code=status.HTTP_201_CREATED)
async def create_manuscript(
    payload: ManuscriptCreate,
    user_id: UUID = Depends(get_current_user),
    service: SupabaseManuscriptService = Depends(_get_service),
) -> Manuscript:
    row = await service.create_manuscript(user_id, payload.model_dump())
    return _to_manuscript(row)


@router.get("/{manuscript_id}", response_model=Manuscript)
async def get_manuscript(
    manuscript_id: UUID,
    user_id: UUID = Depends(get_current_user),
    service: SupabaseManuscriptService = Depends(_get_service),
) -> Manuscript:
    row = await service.get_manuscript(manuscript_id, user_id)
    if not row:
        raise AppError("not_found", "Manuscript not found.", 404)
    return _to_manuscript(row)


@router.put("/{manuscript_id}", response_model=Manuscript)
async def update_manuscript(
    manuscript_id: UUID,
    payload: ManuscriptUpdate,
    user_id: UUID = Depends(get_current_user),
    service: SupabaseManuscriptService = Depends(_get_service),
) -> Manuscript:
    row = await service.update_manuscript(manuscript_id, user_id, payload.model_dump(exclude_unset=True))
    if not row:
        raise AppError("not_found", "Manuscript not found.", 404)
    return _to_manuscript(row)


@router.delete("/{manuscript_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_manuscript(
    manuscript_id: UUID,
    user_id: UUID = Depends(get_current_user),
    service: SupabaseManuscriptService = Depends(_get_service),
) -> None:
    deleted = await service.delete_manuscript(manuscript_id, user_id)
    if not deleted:
        raise AppError("not_found", "Manuscript not found.", 404)

