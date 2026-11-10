# Sophia AI — Research Paper Assistant

Sophia AI is a privacy-first, AI-powered research workspace. It enables researchers to upload PDF papers, generate structured academic summaries, ask grounded questions via Retrieval-Augmented Generation (RAG) with exact page citations, and draft research manuscripts using a SciSpace-inspired AI Writer.

---

## Architecture

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, `@supabase/supabase-js`, Tabler Icons.
- **Backend**: FastAPI, Pydantic, Uvicorn, `supabase-py`.
- **Infrastructure**: Supabase (Auth with Google OAuth, PostgreSQL with Row Level Security, Storage).
- **AI Engine**:
  - PDF Extraction: PyMuPDF (`fitz`)
  - Vector Embeddings: SentenceTransformers (`all-MiniLM-L6-v2`)
  - Vector Store: ChromaDB
  - Primary LLM: Google Gemini API (`gemini-3.8-flash` / `gemini-1.5-flash`)
  - Local Fallback LLM: Ollama (`llama3.2`)

---

## Prerequisites

Before starting, ensure you have:

- **Node.js**: v18.0.0 or higher (`node -v`)
- **Python**: v3.11 or higher (`python --version`)
- **Supabase Project**: Free tier at [supabase.com](https://supabase.com)
- **Google Gemini API Key**: Free tier from [Google AI Studio](https://aistudio.google.com/)
- **Ollama** *(Optional, for offline/local LLM)*: Installed from [ollama.com](https://ollama.com)

---

## Getting Started

### 1. Database & Storage Setup (Supabase)

1. Open your project on [Supabase](https://supabase.com/dashboard) &rarr; **SQL Editor**.
2. Run the migration scripts in order:
   - `supabase/migrations/001_initial_supabase_schema.sql` (Tables & schemas)
   - `supabase/migrations/002_rls_and_storage.sql` (Storage bucket & RLS policies)
   - `supabase/migrations/003_hardening_and_triggers.sql` (Triggers & hardening)
3. Configure Google OAuth *(Optional)*:
   - Go to **Authentication** &rarr; **Providers** &rarr; **Google** (Toggle ON and enter Client ID & Secret).
   - Go to **Authentication** &rarr; **URL Configuration**:
     - **Site URL**: `http://localhost:5173` (or your production frontend URL).
     - **Redirect URLs**: Add `http://localhost:5173/**` and `https://<your-vercel-domain>.vercel.app/**`.

---

### 2. Environment Configuration

#### Backend (`backend/.env`):
Create `backend/.env` (or copy from `backend/.env.example`):

```env
# Supabase
SUPABASE_URL=https://<your-project-id>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<your-supabase-anon-key>
SUPABASE_SECRET_KEY=<your-supabase-service-role-key>

# Gemini AI (Primary)
GEMINI_API_KEY=<your-gemini-api-key>
GEMINI_MODEL=gemini-3.8-flash
LLM_TIMEOUT_SECONDS=120

# Ollama AI (Local Fallback)
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:1b
OLLAMA_TIMEOUT_SECONDS=120
EMBEDDING_MODEL=all-MiniLM-L6-v2
CHROMA_PATH=data/chroma

# App Settings
CORS_ORIGINS=["http://localhost:5173","http://localhost:5174","https://<your-vercel-domain>.vercel.app"]
LOG_LEVEL=INFO
MAX_UPLOAD_BYTES=20971520
```

#### Frontend (`frontend/.env`):
Create `frontend/.env`:

```env
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-supabase-anon-key>
VITE_API_BASE_URL=http://localhost:10000
```
*(In production, set `VITE_API_BASE_URL` to your live backend URL, e.g. `https://sophia-ai.onrender.com`).*

---

### 3. Run the Backend Locally

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv

# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -e .

# Run FastAPI backend (port 10000)
uvicorn app.main:create_app --factory --host 0.0.0.0 --port 10000 --reload
```

Backend will be live at `http://localhost:10000` with interactive API docs at `http://localhost:10000/docs`.

---

### 4. Run the Frontend Locally

In a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Running with Docker

You can run the backend with Docker:

```bash
cd backend
docker build -t sophia-backend .
docker run -p 10000:10000 --env-file .env sophia-backend
```

Or run the full stack with Docker Compose:

```bash
docker compose up --build
```

---

## Production Deployment

### Backend (Render)
1. Create a **Web Service** connected to your repository on [Render](https://render.com).
2. Configure:
   - **Environment**: Docker
   - **Docker Context**: `./backend`
   - **Dockerfile Path**: `./backend/Dockerfile`
   - **Health Check Path**: `/api/v1/health`
3. Add Environment Variables: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `GEMINI_API_KEY`, `CORS_ORIGINS`.

### Frontend (Vercel)
1. Import repository on [Vercel](https://vercel.com).
2. Set **Root Directory**: `frontend`.
3. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_API_BASE_URL` (e.g. `https://sophia-ai.onrender.com`)
4. Deploy!

---

## Testing & Quality Checks

```bash
# Run backend tests
pytest backend/tests

# Run frontend unit tests
npm --prefix frontend test

# Run frontend type-check & production build
npm --prefix frontend run build
```

---

## Documentation

- [Backend Architecture](docs/backend-architecture.md)
- [Database Schema & ERD](docs/supabase-schema.md)
- [Row Level Security Policies](docs/supabase-rls-policies.md)
- [Deployment Guide](docs/deployment.md)
- [Troubleshooting](docs/troubleshooting.md)
