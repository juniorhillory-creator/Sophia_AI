<<<<<<< HEAD

# Sophia AI — Research Paper Assistant


Sophia AI is a privacy-first, AI-powered research workspace. It enables researchers to upload PDF papers, generate structured academic summaries, ask grounded questions via Retrieval-Augmented Generation (RAG) with exact page citations, and draft research manuscripts using a SciSpace-inspired AI Writer.


## Architecture

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, `@supabase/supabase-js`.
- **Backend**: FastAPI, Pydantic, `supabase-py`.
- **Infrastructure**: Supabase (Auth, managed PostgreSQL with Row Level Security, Storage).
- **AI Document Engine**:
  - PDF Extraction: PyMuPDF (`fitz`)
  - Vector Embeddings: SentenceTransformers (`all-MiniLM-L6-v2`)
  - Vector Store: ChromaDB
  - LLM Inference: Local Ollama (`llama3.2`)

---

## Getting Started

### 1. Database & Storage Setup (Supabase)
Run the SQL migrations in order in your Supabase SQL Editor:
1. `backend/supabase/migrations/001_initial_supabase_schema.sql`
2. `backend/supabase/migrations/002_rls_and_storage.sql`

### 2. Configure Environment

Copy `.env.example` in both `backend` and `frontend`:
- `backend/.env`: Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`.
- `frontend/.env`: Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

### 3. Run Backend
```bash
cd backend
python -m venv .venv
# Activate venv and install dependencies:
pip install -r pyproject.toml
uvicorn app.main:create_app --factory --port 8000 --reload
````


### 4. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Testing

- **Backend Tests**: `pytest backend/tests` (48 unit and API tests)
- **Frontend Tests**: `npm --prefix frontend test` (5 client unit tests)
- **Frontend Build**: `npm --prefix frontend run build` (`tsc --noEmit && vite build`)

---

## Documentation

- [Supabase Migration Audit](docs/supabase-migration-audit.md)
- [Database Schema & ERD](docs/supabase-schema.md)
- [Row Level Security Policies](docs/supabase-rls-policies.md)
- [Backend Architecture](docs/backend-architecture.md)
- [Frontend Integration Guide](docs/frontend-integration.md)
- [Deployment Guide](docs/deployment.md)
- [Troubleshooting](docs/troubleshooting.md)
=======
# Sophia_AI

## Paper summary

`POST /api/v1/documents/{document_id}/summary` reads the stored paper and returns `PaperSummary`. The default model is local Ollama (`OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT_SECONDS`). No paid API is called.

```json
{
  "title": "string",
  "authors": "string",
  "abstract": "string",
  "problem_statement": "string",
  "methodology": "string",
  "key_results": "string",
  "conclusion": "string"
}
```

A field the paper does not support is exactly `Not found in the paper.`

| Status | Code | When |
| --- | --- | --- |
| 404 | `not_found` | Unknown document |
| 502 | `malformed_model_response` | Unreadable model payload, or JSON that still fails the schema after one repair |
| 503 | `model_unavailable` | Ollama cannot be reached, or the model request fails |
| 504 | `model_timeout` | The model call exceeds `OLLAMA_TIMEOUT_SECONDS` |
>>>>>>> 0fca1bbaffa87e45686a97d043d28b7a2e96ae81
