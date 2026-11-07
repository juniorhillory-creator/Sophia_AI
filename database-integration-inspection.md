# Sophia AI — Database Integration Inspection Report

**Date**: 2026-11-07  
**Branch**: Current working tree  
**Latest Commit**: Not determined (uncommitted changes present)

---

## 1. Executive Summary

Sophia AI has a **partially implemented authentication system** backed by PostgreSQL/SQLAlchemy and a **fully functional document-processing pipeline** using in-memory storage (`SessionStore`) + ChromaDB + filesystem. The two systems exist side-by-side but are **not integrated**: the document pipeline does not use the database for persistence, user-document associations, or ownership verification.

**Key Finding**: The database schema, models, and auth service are complete and tested for auth flows, but the document endpoints (`/api/v1/documents/*`) bypass the database entirely, relying on an in-memory `SessionStore` that loses all state on backend restart. There is no foreign key from `Document` → `User` enforced at the API layer, no document listing endpoint, and no auth enforcement on document operations.

---

## 2. Current Architecture

### 2.1 Authentication System (PostgreSQL-Backed)

| Component | Location | Status |
|-----------|----------|--------|
| **User Model** | `app/models/user.py` | ✅ Complete — users, OAuth accounts, password reset tokens, email verification tokens |
| **Auth Service** | `app/services/auth.py` | ✅ Complete — register, login, refresh, logout, forgot/reset password, Google OAuth (stub) |
| **Auth Router** | `app/api/auth.py` | ✅ Complete — 7 endpoints under `/api/v1/auth/*` |
| **Password Hashing** | `app/auth/password.py` | ✅ Argon2id with configurable parameters |
| **JWT Tokens** | `app/services/auth.py` | ✅ RS256 asymmetric (access 15min, refresh 7 days) |
| **Database Session** | `app/db/session.py` | ✅ Async SQLAlchemy with connection pooling |
| **Settings** | `app/core/settings.py` | ✅ All DB/auth/Ollama/Chroma/config via env |

### 2.2 Document Pipeline (In-Memory + ChromaDB + Filesystem)

| Component | Location | Status |
|-----------|----------|--------|
| **Document Model (SQLAlchemy)** | `app/models/document.py` | ⚠️ Schema exists, **not used by pipeline** |
| **Upload Endpoint** | `app/api/documents.py:44-51` | ✅ Works but writes to `SessionStore`, not DB |
| **Ingestion Service** | `app/services/ingestion.py` | ✅ Validates, extracts, chunks, embeds, stores in `SessionStore` |
| **PDF Extraction** | `app/infrastructure/pdf.py` | ✅ PyMuPDF, page-level preservation |
| **Chunking** | `app/infrastructure/chunking.py` | ✅ Recursive splitter, page-bounded |
| **Embeddings** | `app/infrastructure/embeddings.py` | ✅ SentenceTransformers (`all-MiniLM-L6-v2`) |
| **Vector Store** | `app/infrastructure/chroma_store.py` | ✅ ChromaDB with `document_id` metadata filter |
| **Summarization** | `app/services/summary.py` | ✅ Map-reduce with structured JSON output |
| **RAG/Chat** | `app/services/rag.py` | ✅ Retrieve → format passages → LLM answer |
| **SessionStore** | `app/services/sessions.py` | ✅ In-memory dict, **loses data on restart** |
| **File Storage** | `app/api/documents.py:144-145` | ✅ `{chroma_path}/../documents/{id}/original.pdf` |

### 2.3 Frontend Auth Integration

| Component | Location | Status |
|-----------|----------|--------|
| **AuthContext** | `src/contexts/AuthContext.tsx` | ✅ React Context, memory-only tokens |
| **Auth API** | `src/api/auth.ts` | ✅ login, register, refresh, logout, google |
| **Protected Routes** | `src/components/ProtectedRoute.tsx` | ✅ Guards `/dashboard`, `/workspace` |
| **Document API** | `src/api/client.ts` | ⚠️ **No Authorization header** on document calls |

---

## 3. Database Models & Relationships

### 3.1 SQLAlchemy Models (Defined but Not Fully Wired)

```python
# app/models/user.py
class User(Base):
    __tablename__ = "users"
    id: UUID (PK)
    username: str (unique, index)
    email: str (unique, index)
    password_hash: str | None
    full_name: str | None
    avatar_url: str | None
    is_active: bool (default=True)
    is_verified: bool (default=False)
    created_at, updated_at, last_login_at: DateTime
    
    # Relationships
    oauth_accounts: list[OAuthAccount]
    password_reset_tokens: list[PasswordResetToken]
    email_verification_tokens: list[EmailVerificationToken]
    documents: list[Document]  # ← Foreign key exists in Document model

class OAuthAccount(Base):
    __tablename__ = "oauth_accounts"
    user_id: UUID (FK → users.id, CASCADE)
    provider: OAuthProvider (google/github)
    provider_user_id: str

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    user_id: UUID (FK → users.id, CASCADE)
    token_hash: str (SHA256)
    expires_at: DateTime
    used_at: DateTime | None

class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"
    user_id: UUID (FK → users.id, CASCADE)
    token_hash: str (SHA256)
    expires_at: DateTime
    used_at: DateTime | None

# app/models/document.py
class Document(Base):
    __tablename__ = "documents"
    id: UUID (PK)
    user_id: UUID (FK → users.id, CASCADE, index)  # ← Defined but unused
    filename: str
    page_count: int
    chunk_count: int
    created_at: DateTime
    
    user: User  # ← Relationship defined
```

### 3.2 Current Database Usage

| Operation | Uses PostgreSQL? | Notes |
|-----------|------------------|-------|
| User registration | ✅ Yes | `AuthService.register()` → INSERT users |
| User login | ✅ Yes | `AuthService.login()` → SELECT users |
| Token refresh | ✅ Yes | Validates user exists + active |
| Password reset | ✅ Yes | Stores tokens in `password_reset_tokens` |
| Email verification | ✅ Schema only | Tokens modeled, not wired to registration |
| Google OAuth | ❌ Stub | Returns 501 |
| Document upload | ❌ No | Uses `SessionStore` (memory) |
| Document metadata | ❌ No | `Document` model not used |
| Document chunks/pages | ❌ No | In `SessionStore` only |
| Embeddings | ❌ No | ChromaDB only (disk) |
| Document listing | ❌ No | No `GET /documents` endpoint |
| Document ownership | ❌ No | No user_id check on document endpoints |

---

## 4. Document-Processing Workflow (Current)

```
Upload (POST /api/v1/documents)
    │
    ▼
read_pdf_upload() → Validate (size, mime, PDF magic bytes)
    │
    ▼
IngestionService.ingest()
    │
    ├── validate_declared_file()
    ├── extract_pages() → list[PageText]  (PyMuPDF)
    ├── chunk_pages() → list[Chunk]       (page-bounded, 1200/150)
    ├── Create Document (Pydantic schema, NOT SQLAlchemy)
    ├── index_chunks() → ChromaStore.upsert()  (embeddings + metadata)
    └── SessionStore.put(DocumentSession)      (IN-MEMORY)
    │
    ▼
Response: 201 {id, filename, page_count, chunk_count}
```

**Data Persistence After Upload**:
| Data | Storage | Survives Restart? |
|------|---------|-------------------|
| Original PDF | Filesystem (`data/documents/{id}/original.pdf`) | ✅ Yes |
| Embeddings/vectors | ChromaDB (HNSW on disk) | ✅ Yes |
| Extracted pages (PageText) | `SessionStore` (memory) | ❌ **No** |
| Document metadata | `SessionStore` (memory) | ❌ **No** |
| Chunks (text + metadata) | `SessionStore` + ChromaDB | ChromaDB ✅ / Memory ❌ |
| User association | **None** | N/A |

---

## 5. Missing Integration Points

### 5.1 Critical Gaps (Security & Data Integrity)

| # | Gap | Impact | Location |
|---|-----|--------|----------|
| 1 | **No auth enforcement on document endpoints** | Anyone with doc ID can upload, read, summarize, chat, delete | `app/api/documents.py` — no `Depends(get_current_user)` |
| 2 | **No user-document association** | Documents not linked to owners; multi-user isolation broken | `IngestionService.ingest()` doesn't receive user_id |
| 3 | **No document listing API** | Dashboard shows only session documents; empty after refresh | Missing `GET /api/v1/documents` |
| 4 | **In-memory SessionStore loses data on restart** | All document metadata, pages, chunks lost | `app/services/sessions.py` |
| 5 | **Frontend sends no Authorization header** | Even if backend enforced auth, tokens not sent | `src/api/client.ts` — no Bearer token |
| 6 | **DELETE endpoint not implemented** | Cannot remove documents | `app/api/documents.py` — missing handler |

### 5.2 Schema Mismatches

| Pydantic Schema (`app/schemas/models.py`) | SQLAlchemy Model (`app/models/document.py`) | Gap |
|-------------------------------------------|---------------------------------------------|-----|
| `Document` — id, filename, page_count, chunk_count, created_at | `Document` — id, user_id, filename, page_count, chunk_count, created_at | Pydantic missing `user_id` |
| `PaperSummary` — 7 structured fields | Not persisted | No summary storage |
| No `status`, `stage`, `error_code` fields | Not in either | Architecture plan requires these for async processing |

### 5.3 Architecture Plan Deviations

Per `Sophia AI architecture plan.md.md`, the intended design includes:
- **Async background processing**: Upload returns `202`, background task does extract/chunk/embed/summarize
- **Status tracking**: `processing` → `extracting`/`indexing`/`summarizing` → `ready`/`failed`
- **File persistence**: `data/documents/{id}/document.json`, `chunks.json`, `summary.json`
- **Startup recovery**: Mark `processing` as `failed` on restart
- **Retrieval-owned citations**: Already implemented correctly in `RagService`

**Current implementation**: Synchronous upload (blocks until ChromaDB upsert), no status tracking, no file persistence beyond PDF + ChromaDB.

---

## 6. Risks & Conflicts

### 6.1 Security Risks

| Risk | Severity | Description |
|------|----------|-------------|
| **Unauthorized document access** | 🔴 Critical | Any user (or unauthenticated request) can access any document by ID |
| **No ownership verification** | 🔴 Critical | User A can delete/modify User B's documents |
| **Token not sent to document endpoints** | 🟠 High | Frontend `client.ts` lacks auth header; backend can't verify identity |
| **In-memory sessions** | 🟠 High | Backend restart = all users lose documents; no audit trail |
| **Google OAuth stub** | 🟡 Medium | Returns 501; frontend button exists but does nothing |

### 6.2 Data Integrity Risks

| Risk | Severity | Description |
|------|----------|-------------|
| **Lost document metadata on restart** | 🔴 Critical | `SessionStore` is in-memory; page text, chunk text, document info lost |
| **No document listing** | 🟠 High | Users cannot see their papers after page refresh |
| **Orphaned files** | 🟡 Medium | PDFs + ChromaDB vectors persist but no DB record to manage them |
| **No summary caching** | 🟡 Medium | Summary regenerated on every request (slow, inconsistent) |

### 6.3 Technical Conflicts

| Conflict | Description | Resolution Needed |
|----------|-------------|-------------------|
| **Two Document definitions** | Pydantic `Document` (API) vs SQLAlchemy `Document` (DB) | Align schemas; add `user_id`, `status`, `stage` to Pydantic |
| **Sync vs async ingestion** | Current: synchronous in request; Plan: background job | Add job queue or FastAPI `BackgroundTasks` with status updates |
| **SessionStore vs Database** | In-memory sessions conflict with DB persistence | Replace `SessionStore` with DB queries + ChromaDB for vectors |
| **Frontend auth state** | Tokens in React Context only (memory) | Add secure httpOnly cookie or localStorage with refresh logic |

---

## 7. Recommended Implementation Sequence

### Phase 1: Database Integration Foundation (Prerequisite for All)
1. **Create database tables** — Run `alembic` migration or `Base.metadata.create_all()` on startup
2. **Add database connection to app lifecycle** — Initialize `Database` in `create_app()`, connect/disconnect on startup/shutdown
3. **Verify auth endpoints work with real PostgreSQL** — Test register/login/refresh against running DB

### Phase 2: Document Ownership & Auth Enforcement
1. **Add `get_current_user` dependency** — Extract user_id from JWT in Authorization header
2. **Protect all `/api/v1/documents/*` endpoints** — Add `Depends(get_current_user)`
3. **Update `IngestionService` to accept `user_id`** — Pass from endpoint via dependency
4. **Persist `Document` to PostgreSQL on upload** — Create SQLAlchemy `Document` row with `user_id`
5. **Update `SessionStore` to load from DB** — Or replace with DB queries for metadata

### Phase 3: Document Listing & Persistence
1. **Implement `GET /api/v1/documents`** — List user's documents with pagination, status
2. **Implement `DELETE /api/v1/documents/{id}`** — Verify ownership, remove PDF, ChromaDB vectors, DB row
3. **Add `status`, `stage`, `error_code`, `error_message`, `updated_at`** to both Pydantic and SQLAlchemy models
4. **Persist chunks/pages to filesystem** — `data/documents/{id}/chunks.json`, `pages.json` (or DB)

### Phase 4: Async Background Processing (Per Architecture Plan)
1. **Change upload to return `202 Accepted`** — Start background task
2. **Background task updates status** — `extracting` → `indexing` → `summarizing` → `ready`/`failed`
3. **Add startup recovery** — On app start, mark `processing` documents as `failed` with retry hint
4. **Polling endpoint** — `GET /documents/{id}` returns current status/stage

### Phase 5: Summary Persistence & Frontend Integration
1. **Cache summary to DB/filesystem** — `POST /summary` stores result; `GET /summary` returns cached
2. **Add `summary` relationship to SQLAlchemy Document** — Or separate summary table
3. **Update frontend `client.ts`** — Add Authorization header to all document calls
4. **Update frontend `DashboardPage`** — Fetch document list from `GET /documents` on mount

### Phase 6: Remaining Auth Features
1. **Implement Google OAuth** — Exchange code for token, create/link user
2. **Implement email sending** — For password reset, email verification
3. **Add token persistence** — httpOnly cookie or secure localStorage with refresh flow
4. **Add rate limiting** — SlowAPI + Redis for auth and upload endpoints

---

## 8. Files Requiring Changes (Summary)

### Backend — Core Integration
| File | Changes Needed |
|------|----------------|
| `app/main.py` | Initialize `Database`, connect on startup, add `get_current_user` dependency |
| `app/api/documents.py` | Add auth dependency, use DB for document CRUD, implement listing/delete |
| `app/services/ingestion.py` | Accept `user_id`, create SQLAlchemy `Document`, persist to DB |
| `app/services/sessions.py` | Replace with DB-backed session loader or remove |
| `app/models/document.py` | Add `status`, `stage`, `error_code`, `error_message`, `updated_at` |
| `app/schemas/models.py` | Align `Document` with DB model (add `user_id`, status fields) |
| `app/dependencies.py` | Add `get_current_user`, `get_db` dependencies |

### Backend — Auth Completion
| File | Changes Needed |
|------|----------------|
| `app/services/auth.py` | Implement Google OAuth, email sending |
| `app/api/auth.py` | Wire email verification flow |

### Frontend — Auth Integration
| File | Changes Needed |
|------|----------------|
| `src/api/client.ts` | Add Authorization header from `AuthContext` to all document calls |
| `src/contexts/AuthContext.tsx` | Add token persistence (localStorage/cookie), auto-refresh |
| `src/pages/DashboardPage.tsx` | Fetch document list on mount via `GET /documents` |
| `src/components/ProtectedRoute.tsx` | Handle token refresh on route change |

---

## 9. Testing Strategy

| Test Type | Current Coverage | Needed |
|-----------|------------------|--------|
| Unit tests (validation, chunking, PDF) | ✅ 48 passing | Extend for new status fields |
| API tests (documents) | ✅ 8 tests | Add auth enforcement tests, listing, delete |
| Auth tests | ❌ None | Register, login, refresh, reset, ownership |
| Integration tests | ❌ None | Full upload → list → summary → chat flow |
| Frontend tests | ✅ Vitest setup | Auth context, API client with auth header |

---

## 10. Conclusion

The Sophia AI project has a **solid foundation** with well-structured code, proper separation of concerns, and comprehensive test coverage for the document pipeline. The **authentication system is database-ready** but the **document pipeline bypasses the database entirely**, creating security and persistence gaps.

**Priority**: Complete Phase 1-2 (database initialization + auth enforcement on document endpoints) before any feature work. This unblocks multi-user support, data persistence, and security compliance per `AGENTS.md` rules.

**Estimated Effort**: 
- Phase 1-2: ~2-3 days (DB init, auth middleware, document ownership)
- Phase 3-4: ~3-4 days (listing, async processing, status tracking)
- Phase 5-6: ~2-3 days (summary caching, frontend integration, OAuth)

**Total**: ~7-10 days for full integration per architecture plan.

---

*Report generated by inspection. No files were modified during this analysis.*