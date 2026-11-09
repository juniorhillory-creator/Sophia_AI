# Sophia AI — Application-to-Database Mapping Specification

This document details the exact mapping between frontend components, FastAPI backend endpoints, and Supabase database/storage resources.

---

## 1. Feature-by-Feature Mapping Table

| Feature | Frontend Component | Backend Endpoint / Service | Database Tables | Storage Bucket | Required Operations | Fields Used |
|---|---|---|---|---|---|---|
| **User Sign Up** | `RegisterPage.tsx` | `POST /api/v1/auth/register` $\rightarrow$ `AuthService.register()` | `auth.users`, `profiles` | — | `INSERT` (via admin/auth) | `id`, `email`, `username`, `password`, `full_name`, `avatar_url` |
| **User Login** | `LoginPage.tsx` | `POST /api/v1/auth/login` $\rightarrow$ `AuthService.login()` | `auth.users`, `profiles` | — | `SELECT` | `email`, `password`, `username` |
| **Session Refresh** | `AuthContext.tsx` | `POST /api/v1/auth/refresh` | `auth.users` | — | `SELECT` | `refresh_token` |
| **PDF Upload** | `WorkspacePage.tsx`, `App.tsx` | `POST /api/v1/documents` $\rightarrow$ `IngestionService.ingest()` | `documents` | `research-papers` | `INSERT` (DB & Storage) | `id`, `user_id`, `filename`, `original_filename`, `storage_path`, `file_size`, `mime_type`, `page_count`, `chunk_count`, `status` |
| **List Papers** | `DashboardPage.tsx`, `PapersPage.tsx` | `GET /api/v1/documents` | `documents` | — | `SELECT` | `id`, `filename`, `page_count`, `chunk_count`, `status`, `created_at` |
| **Document Details** | `WorkspacePage.tsx` | `GET /api/v1/documents/{id}` | `documents` | — | `SELECT` | `id`, `filename`, `page_count`, `chunk_count`, `status`, `created_at` |
| **PDF Viewer File** | `PdfViewer.tsx` | `GET /api/v1/documents/{id}/file` | `documents` | `research-papers` | `SELECT` (Storage download) | `id`, `user_id`, `storage_path` |
| **Generate Summary** | `SummaryTab.tsx` | `POST /api/v1/documents/{id}/summary` | `summaries`, `documents` | — | `INSERT` / `UPSERT` | `document_id`, `user_id`, `title`, `authors`, `abstract`, `problem_statement`, `methodology`, `key_results`, `conclusion`, `raw_summary` |
| **Get Summary** | `SummaryTab.tsx` | `GET /api/v1/documents/{id}/summary` | `summaries` | — | `SELECT` | `title`, `authors`, `abstract`, `problem_statement`, `methodology`, `key_results`, `conclusion`, `raw_summary` |
| **Document Deletion**| `PapersPage.tsx`, `DashboardPage.tsx` | `DELETE /api/v1/documents/{id}` | `documents`, `summaries`, `conversations`, `messages`, `manuscripts` | `research-papers` | `DELETE` (Cascade in DB, Storage remove) | `id`, `user_id`, `storage_path` |
| **Research Chat / RAG**| `ChatTab.tsx` | `POST /api/v1/documents/{id}/questions` | `conversations`, `messages` | — | `SELECT`, `INSERT` | `conversation_id`, `user_id`, `role`, `content`, `citations` (page, snippet) |
| **Streaming Chat** | `ChatTab.tsx` | `GET /api/v1/documents/{id}/questions/stream` | `conversations`, `messages` | — | `SELECT`, `INSERT` | `conversation_id`, `user_id`, `role`, `content`, `citations` |
| **AI Writer Autosave**| `WriterPage.tsx` | Supabase JS client / Local fallback | `manuscripts` | — | `UPSERT` / `INSERT` / `UPDATE` | `id`, `user_id`, `document_id`, `title`, `content`, `word_count`, `character_count`, `last_saved_at` |
| **AI Writer Reference**| `ReferenceDrawer.tsx` | `GET /api/v1/documents` + `GET /api/v1/documents/{id}/summary` | `documents`, `summaries` | — | `SELECT` | `id`, `filename`, `title`, `abstract`, `key_results` |

---

## 2. Detailed Data Flow Specifications

### 2.1 PDF Ingestion & Storage
1. **Frontend:** User drags and drops a research PDF onto `WorkspacePage.tsx`.
2. **Backend:** FastAPI `POST /api/v1/documents` handles multipart stream.
3. **Storage:** Uploads binary to `research-papers/{user_id}/{document_id}/original.pdf`.
4. **Database Record:** Inserts document metadata row into `public.documents` with `status = 'ready'`.
5. **Local Vector Store:** Chunks and embeddings are registered in ChromaDB under collection collection key `document_id`.

### 2.2 Structured Research Summary Generation
1. **Frontend:** `SummaryTab.tsx` requests `POST /api/v1/documents/{id}/summary`.
2. **Cache Check:** Backend checks `public.summaries` for existing `document_id`. If found, returns cached summary immediately.
3. **Inference:** If missing, invokes Ollama (`llama3.2:1b`) with 7-part JSON schema (`title`, `authors`, `abstract`, `problem_statement`, `methodology`, `key_results`, `conclusion`).
4. **Persistence:** Upserts the generated summary into `public.summaries` under `(document_id, user_id)`.

### 2.3 Research Assistant Q&A with Citations
1. **Frontend:** User asks a query in `ChatTab.tsx`.
2. **Retrieval:** Backend searches ChromaDB vector store for top-$k$ relevant chunks ($k=4$, cosine similarity $\ge 0.3$).
3. **Generation:** Ollama synthesizes answer grounded *strictly* in retrieved text.
4. **Citations:** Real chunk metadata (`page_number`, `chunk_id`, `excerpt`) are bundled into response.
5. **Message Persistence:** Can be persisted in `public.conversations` and `public.messages` with `citations` JSONB.

### 2.4 AI Writer Manuscript Persistence
1. **Frontend:** User types research paper synthesis in `WriterPage.tsx`.
2. **Local Buffer:** Debounced `localStorage` saves keystrokes instantly to avoid typing lag.
3. **Database Sync:** Persists to `public.manuscripts` table with `user_id`, optional active `document_id` reference, title, content, computed word/character counts, and `last_saved_at`.

