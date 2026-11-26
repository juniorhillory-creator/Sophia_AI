# Sophia AI — Frontend Rebuild

Welcome to the brand-new, production-grade frontend for **Sophia AI**, an AI-powered academic research paper assistant.

Built from scratch using **React 19**, **Vite**, **TypeScript**, and **Material UI (MUI v6)** with a modern academic AI aesthetic.

---

## 🌟 Key Features

1. **Academic Design System**:
   - Modern Material UI design system with Inter & JetBrains Mono typography.
   - Comprehensive Dark & Light mode with localStorage persistence.
   - Tailored specifically for reading and analyzing scientific papers.

2. **Document Upload & Processing**:
   - Drag-and-drop PDF upload with 20MB client-side validation.
   - Real-time upload progress tracking.
   - Dynamic processing status badges (`extracting`, `indexing`, `summarizing`, `ready`, `failed`).

3. **Research Library**:
   - Search across uploaded papers by filename.
   - Filter by status (`All`, `Ready`, `Processing`).
   - Sort by newest, oldest, or alphabetical order.
   - Direct deletion and navigation into dedicated research workspaces.

4. **Multi-Panel Research Workspace**:
   - **Original PDF Viewer**: Embedded high-fidelity PDF viewer with page jump, zoom, and download actions.
   - **5-Section Structured AI Summary**:
     1. Title, Authors & Abstract
     2. Problem Statement
     3. Methodology & Technical Approach
     4. Key Results & Findings
     5. Conclusion & Future Directions
     - Single-click section copy, full-summary copy, and Markdown export.
   - **Conversational RAG Chatbot with Streaming SSE**:
     - Connected directly to `/api/v1/documents/{document_id}/questions/stream`.
     - Real-time token streaming with cancel/stop generation support.
     - Clickable page citation pills (`p. 3`, `p. 7`) that jump straight to the cited page in the PDF viewer.
     - 5 suggested prompts to kickstart academic inquiry.

5. **Authentication & Security**:
   - JWT-based authentication with automatic Bearer token injection and refresh interceptor.
   - Protected routes with loading and redirect guards.
   - Sign-in and sign-up with password confirmation and client validation.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ or 20+
- npm or pnpm

### 2. Environment Variables
Create a `.env.local` file inside `frontend/` (or copy `.env.example`):

```bash
cp .env.example .env.local
```

Configured variables:
```ini
# FastAPI Backend Base URL
VITE_API_BASE_URL=http://127.0.0.1:8000

# Optional Supabase Reference (database infrastructure managed by backend)
VITE_SUPABASE_URL=https://jvunlisimaeqjffmoszn.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=
```

For production deployment (e.g. Vercel, Netlify):
```ini
VITE_API_BASE_URL=https://sophia-ai.onrender.com
```

### 3. Development Server
Run the Vite development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Production Build
Compile TypeScript and bundle for production:
```bash
npm run build
```
Preview the production build locally:
```bash
npm run preview
```

---

## 🏗️ Architecture & Directory Structure

```
frontend/
├── index.html                   # HTML entry point with Google Fonts (Inter)
├── package.json                 # Dependencies and scripts
├── vite.config.ts               # Vite configuration
├── vercel.json                  # SPA routing fallback for Vercel
├── .env.example                 # Template for environment variables
└── src/
    ├── api/                     # Backend API clients
    │   ├── axiosInstance.ts     # Axios instance with Bearer interceptor & refresh queue
    │   ├── authApi.ts           # Login, register, me, refresh endpoints
    │   ├── documentApi.ts       # Upload, list, get, delete, pdf file blob fetch
    │   ├── summaryApi.ts        # Structured summary generation & retrieval
    │   └── chatApi.ts           # Native Fetch ReadableStream SSE client
    ├── components/
    │   ├── common/              # StatusBadge, ErrorAlert, LoadingSkeleton
    │   ├── layout/              # Sidebar, Topbar, AppLayout
    │   ├── upload/              # UploadCard (drag-and-drop, progress)
    │   ├── documents/           # DocumentCard, DocumentList (search/sort/filter)
    │   ├── summary/             # SummaryPanel (5-section accordion, copy, export)
    │   ├── chat/                # CitationPill, ChatMessage, ChatPanel
    │   └── workspace/           # PdfViewer with page navigation
    ├── context/
    │   └── AuthContext.tsx      # Auth state provider and token management
    ├── theme/
    │   ├── theme.ts             # MUI light & dark theme palette and typography
    │   └── ThemeContext.tsx     # Theme provider with localStorage persistence
    ├── pages/
    │   ├── DashboardPage.tsx    # Welcome hero, statistics, uploader, recent papers
    │   ├── MyResearchPage.tsx   # Library management with upload modal
    │   ├── ResearchWorkspacePage.tsx # Side-by-side PDF and AI workspace
    │   ├── LoginPage.tsx        # Sign-in page
    │   ├── RegisterPage.tsx     # Sign-up page
    │   └── SettingsPage.tsx     # Theme, API health status, profile
    ├── routes/
    │   └── AppRouter.tsx        # Protected and public route definitions
    ├── types/
    │   └── index.ts             # TypeScript definitions aligned with FastAPI schemas
    ├── App.tsx                  # Root QueryClient, Theme, Auth, and Router provider
    └── main.tsx                 # React DOM root entry
```

---

## 🔒 Security Principles

- **No Exposed Secrets**: All sensitive API keys (`GEMINI_API_KEY`, Supabase service keys) remain exclusively on the backend.
- **Token Protection**: JWT access and refresh tokens are stored in `localStorage` and sent via standard `Authorization: Bearer` headers.
- **Ownership Verification**: All document operations (`GET /documents`, `GET /documents/{id}`, `DELETE /documents/{id}`) enforce user ownership through the backend FastAPI dependencies.
