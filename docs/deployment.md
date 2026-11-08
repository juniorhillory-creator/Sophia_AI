# Sophia AI — Deployment Guide

## 1. Prerequisites

- Python 3.11+
- Node.js 20+
- Supabase Project (Cloud or Local CLI)
- Ollama running locally or via remote URL (`ollama run llama3.2`)

---

## 2. Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com) (or via local CLI: `npx supabase init && npx supabase start`).
2. Run the SQL migrations in order in the Supabase SQL Editor:
   - `backend/supabase/migrations/001_initial_supabase_schema.sql`
   - `backend/supabase/migrations/002_rls_and_storage.sql`
3. Retrieve your project URL, Anon Key, and Service Role Key from **Project Settings > API**.

---

## 3. Environment Configuration

### Backend (`backend/.env`)
```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-anon-publishable-key
SUPABASE_SECRET_KEY=your-service-role-secret-key

OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2
EMBEDDING_MODEL=all-MiniLM-L6-v2
CHROMA_PATH=data/chroma
CORS_ORIGINS=["http://localhost:5173","http://localhost:5174"]
```

### Frontend (`frontend/.env`)
```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-publishable-key
VITE_API_BASE_URL=http://localhost:8000
```

---

## 4. Running the Application

### Backend
```bash
cd backend
python -m venv .venv
# On Windows: .venv\Scripts\activate
# On Unix: source .venv/bin/activate
pip install -r pyproject.toml
uvicorn app.main:create_app --factory --port 8000 --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173`.

