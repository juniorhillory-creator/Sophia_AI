# Frontend Inspection Report — Sophia AI

## Executive Summary

This report documents the current state of the Sophia AI frontend application. The application is a React + TypeScript + Vite SPA that serves as an AI-powered research paper assistant. The current routing configuration redirects the root path `/` to `/dashboard`, which is a protected route requiring authentication. This causes users to see the sign-in page immediately upon opening the application, instead of the document upload/summarization interface.

---

## 1. Existing Architecture

### Frontend Stack
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (custom design system with brand colors: `#f26934` primary)
- **Routing**: React Router DOM v7
- **State Management**: React Context API (AuthContext)
- **Testing**: Vitest

### Backend Stack
- **Framework**: FastAPI (Python)
- **Database**: In-memory session store (no persistent DB yet)
- **Vector Store**: ChromaDB
- **LLM**: Ollama (local)
- **Embeddings**: Sentence Transformers (all-MiniLM-L6-v2)
- **PDF Processing**: PyMuPDF

### Project Structure
```
sophia_ai/
├── frontend/
│   ├── src/
│   │   ├── api/           # API client (client.ts, auth.ts, types.ts)
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # React Context providers (AuthContext)
│   │   ├── pages/         # Page components
│   │   ├── App.tsx        # Main app with routing
│   │   ├── main.tsx       # Entry point
│   │   └── index.css      # Tailwind + custom design system
│   └── package.json
└── backend/
    ├── app/
    │   ├── api/           # FastAPI routers
    │   ├── services/      # Business logic
    │   ├── infrastructure/# External adapters (PDF, Chroma, Ollama)
    │   ├── schemas/       # Pydantic models
    │   ├── core/          # Settings, logging, error handlers
    │   └── main.py        # FastAPI app factory
    └── pyproject.toml
```

---

## 2. Current Routing Behavior

### Current Route Configuration (`App.tsx` lines 497-535)

```typescript
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
  <Route path="/reset-password" element={<ResetPasswordPage />} />
  <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
  <Route path="/upload" element={<Navigate to="/dashboard" replace />} />
  <Route
    path="/dashboard"
    element={
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    }
  />
  <Route path="/workspace" element={
    <ProtectedRoute>
      <WorkspacePage />
    </ProtectedRoute>
  } />
  <Route path="/workspace/:documentId" element={
    <ProtectedRoute>
      <WorkspacePage />
    </ProtectedRoute>
  } />
  <Route path="/papers" element={
    <ProtectedRoute>
      <Navigate to="/dashboard" replace />
    </ProtectedRoute>
  } />
  <Route path="/" element={<Navigate to="/dashboard" replace />} />
</Routes>
```

### Why `/` Opens the Sign-In Page

1. **Root redirect**: Line 531 redirects `/` → `/dashboard`
2. **Dashboard is protected**: Line 509-515 wraps `DashboardPage` in `<ProtectedRoute>`
3. **ProtectedRoute behavior** (`ProtectedRoute.tsx` lines 8-20):
   - Checks `isAuthenticated` from `AuthContext`
   - If loading: returns `null` (blank screen)
   - If not authenticated: redirects to `/login` with `state={{ from: location }}`
4. **AuthContext initial state**: `AuthContext.tsx` line 31 initializes state as `{ kind: "unauthenticated" }`
5. **No auto-login**: No token persistence or auto-refresh on mount

**Result**: User visits `/` → redirected to `/dashboard` → `ProtectedRoute` sees unauthenticated → redirects to `/login`

---

## 3. Authentication Flow

### AuthContext (`AuthContext.tsx`)
- **State**: `unauthenticated` | `authenticating` | `authenticated`
- **Storage**: In-memory only (no localStorage/sessionStorage per security rules)
- **Methods**: `login`, `register`, `logout`, `refreshSession`, `clearError`
- **No auto-initialization**: No `useEffect` to check for existing session on mount

### ProtectedRoute (`ProtectedRoute.tsx`)
- Blocks access to routes unless authenticated
- Redirects to `/login` preserving original destination via `state={{ from: location }}`
- Shows nothing (`null`) while loading

### API Auth (`api/auth.ts`)
- Endpoints: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/google`, `/refresh`, `/logout`
- All POST requests to `/api/v1/auth/*`
- Returns `AuthResponse` with user + tokens

### Login/Register Pages
- `LoginPage.tsx`: Username/email + password, Google OAuth, forgot password link
- `RegisterPage.tsx`: Username, email, password, confirm password, password requirements
- Both integrate with `AuthContext` via `useAuth()`

---

## 4. Upload and Summarization Flow

### Frontend Upload (`api/client.ts` + `UploadScreen` in `App.tsx`)
- **Validation**: `rejectUpload()` checks file type (PDF), size (< 20MB), non-empty
- **Upload**: `uploadDocument()` uses `XMLHttpRequest` for progress tracking
- **Endpoint**: `POST /api/v1/documents` (multipart/form-data)
- **Response**: `Document` object with `id`, `filename`, `page_count`, `chunk_count`, `created_at`

### Backend Upload (`documents.py` line 42-49)
- `POST /api/v1/documents` → `upload_document`
- Validates PDF: size, extension, content-type, PyMuPDF readability
- Returns `201` with `Document` metadata
- **Processing**: Synchronous in current implementation (indexing + summary happen inline)

### Summarization
- **Endpoint**: `POST /api/v1/documents/{id}/summary`
- **Frontend**: `createSummary()` in `client.ts`
- **Backend**: `summarize()` service using Ollama (map-reduce)
- **Status**: Document has `status` field (`processing` | `ready` | `failed`)

### Chat/RAG
- **Endpoint**: `POST /api/v1/documents/{id}/questions`
- **Frontend**: `askQuestion()` with SSE streaming
- **Backend**: Retrieval from Chroma → Ollama streaming answer

### Workspace Page (`WorkspacePage` in `App.tsx`)
- Three-pane layout: PDF viewer (left), Summary/Chat tabs (right)
- `PdfViewer` loads PDF from `GET /api/v1/documents/{id}/file`
- `SummaryPanel` fetches summary via `createSummary()`
- `ChatPanel` streams answers via `askQuestion()`

---

## 5. Existing Reusable Components

| Component | Purpose | Location |
|-----------|---------|----------|
| `ProtectedRoute` | Route guard for authenticated pages | `components/ProtectedRoute.tsx` |
| `Sidebar` | Collapsible navigation sidebar | `components/Sidebar.tsx` |
| `DashboardHeader` | Top nav with branding, user menu | `components/DashboardHeader.tsx` |
| `UploadScreen` | Drag-drop PDF upload with progress | `App.tsx` (lines 204-441) |
| `DocumentCard` | Document list item with actions | `components/DocumentCard.tsx` |
| `EmptyState` / `LoadingSkeleton` | Empty/loading states | `components/EmptyState.tsx` |
| `PdfViewer` | PDF.js viewer with page navigation | `components/PdfViewer.tsx` |
| `SummaryPanel` | Structured summary display | `components/SummaryPanel.tsx` |
| `ChatPanel` | Streaming chat with citations | `components/ChatPanel.tsx` |
| `PasswordInput` | Password field with show/hide | `components/PasswordInput.tsx` |
| `GoogleButton` | Google OAuth button | `components/GoogleButton.tsx` |
| `AuthLayout` | Centered card for auth pages | `components/AuthLayout.tsx` |
| `TabButton` | Accessible tab navigation | `App.tsx` (lines 171-202) |

---

## 6. Completed Work

- ✅ Frontend shell with React + TypeScript + Vite + Tailwind
- ✅ Authentication context, login/register/forgot/reset pages
- ✅ Google OAuth integration (frontend only)
- ✅ PDF upload with drag-drop, validation, progress
- ✅ Document dashboard with sidebar, header, document cards
- ✅ Workspace page: PDF viewer, summary panel, chat panel
- ✅ PDF.js viewer with page navigation
- ✅ Structured summary display with citations
- ✅ Streaming chat with citation page jumps
- ✅ API client with typed requests/responses
- ✅ In-memory session store (backend)
- ✅ PDF extraction, chunking, embedding pipeline
- ✅ ChromaDB vector store integration
- ✅ Ollama LLM integration for summary and chat
- ✅ Map-reduce summary with structured output
- ✅ RAG with retrieval-owned citations
- ✅ Unit tests for frontend (Vitest) and backend (Pytest)
- ✅ Design system with brand colors, animations, accessibility

---

## 7. Incomplete Work

| Feature | Status | Notes |
|---------|--------|-------|
| **Public landing page** | Missing | Root `/` redirects to protected dashboard |
| **Public upload without auth** | Not implemented | Upload requires authenticated dashboard |
| **Token persistence** | Not implemented | Auth tokens stored in memory only |
| **Auto-session restore** | Not implemented | No refresh on mount |
| **Google OAuth backend** | Frontend only | `/auth/google` endpoint not implemented |
| **Document listing API** | Not implemented | Dashboard uses local state only |
| **File serving endpoint** | Missing | `GET /documents/{id}/file` not implemented |
| **Background processing** | Synchronous only | No async job queue / status polling |
| **Summary caching** | Not implemented | Regenerates on every request |
| **Error recovery UI** | Basic | Failed docs show error but no retry flow |
| **Settings page** | Placeholder | `/settings` not implemented |
| **Persistent database** | Not started | In-memory `SessionStore` only |

---

## 8. Potential Risks

| Risk | Impact | Likelihood |
|------|--------|------------|
| **Auth required for upload** | Users cannot try app without account | High (current behavior) |
| **No session persistence** | Users lose session on refresh | High (by design per security rules) |
| **Synchronous processing** | Large PDFs timeout browser request | Medium |
| **In-memory session store** | Data lost on backend restart | High |
| **No file serving** | PDF viewer cannot load documents | High (404 on file endpoint) |
| **Google OAuth incomplete** | OAuth buttons don't work | Medium |
| **SSE buffering** | Nginx may buffer SSE without config | Medium |

---

## 9. Recommended Minimal Changes

### 1. Create Public Landing Page (`/`)
- New component: `pages/LandingPage.tsx`
- Reuse `UploadScreen` logic but make it public
- Hero section with branding, description, upload area
- "Sign In" / "Create Account" in header navigation
- On successful upload → navigate to `/workspace/:id` with document state

### 2. Fix Root Route
```typescript
// Change from:
<Route path="/" element={<Navigate to="/dashboard" replace />} />
// To:
<Route path="/" element={<LandingPage />} />
```

### 3. Update Header for Public Pages
- Modify `DashboardHeader` or create `PublicHeader`
- Show "Sign In" / "Create Account" buttons when unauthenticated
- Link to `/login` and `/register`

### 4. Make Workspace Accessible Without Auth (for public uploads)
- Remove `ProtectedRoute` from `/workspace/:documentId`
- Allow direct navigation to workspace after public upload
- Keep `/dashboard` and `/papers` protected

### 5. Preserve Auth for Protected Features
- `/dashboard` - requires auth (save documents, history)
- `/papers` - requires auth
- `/settings` - requires auth (when implemented)

### 6. Route Configuration
```
/                 → LandingPage (public upload)
/login            → LoginPage
/register         → RegisterPage
/forgot-password  → ForgotPasswordPage
/reset-password   → ResetPasswordPage
/dashboard        → DashboardPage (protected)
/workspace        → WorkspacePage (protected? or public?)
/workspace/:id    → WorkspacePage (public for public uploads)
/papers           → Protected (redirect to dashboard)
/settings         → Protected (future)
```

---

## 10. Implementation Priority

| Priority | Task | Effort |
|----------|------|--------|
| 1 | Create `LandingPage.tsx` with public upload | Medium |
| 2 | Update `App.tsx` routing | Low |
| 3 | Update header for public navigation | Low |
| 4 | Make `/workspace/:id` accessible without auth | Low |
| 5 | Test public upload → workspace flow | Low |
| 6 | Verify existing auth features still work | Medium |

---

*Report generated: 2026-11-07*
*Branch: `Default-landing-page`*
*Commit: `95677d0` (Merge pull request #3)*