# Sophia AI — Frontend Rebuild Execution Guide

> **Purpose**: Pre-digested project context for any model executing the frontend
> rebuild. Contains exact file paths, API contracts, current bugs, code patterns,
> and step-by-step implementation instructions. Read this FIRST before touching
> any code. Do NOT re-scan the codebase unless this guide says to.

---

## Table of Contents

1. [Critical Rules](#1-critical-rules)
2. [Execution Discipline](#2-execution-discipline)
3. [Project Structure](#3-project-structure)
4. [Design System & Tokens](#4-design-system--tokens)
5. [Backend API Contract (Source of Truth)](#5-backend-api-contract-source-of-truth)
6. [Frontend Architecture (Current State)](#6-frontend-architecture-current-state)
7. [Known Bugs & Root Causes](#7-known-bugs--root-causes)
8. [Phase 1: API Client & Auth Fix](#8-phase-1-api-client--auth-fix)
9. [Phase 2: Unified Navigation & Layout](#9-phase-2-unified-navigation--layout)
10. [Phase 3: Auth Pages Rebuild](#10-phase-3-auth-pages-rebuild)
11. [Phase 4: Dashboard & My Papers](#11-phase-4-dashboard--my-papers)
12. [Phase 5: Research Workspace](#12-phase-5-research-workspace)
13. [Phase 6: AI Writer](#13-phase-6-ai-writer)
14. [Phase 7: Verification & Build](#14-phase-7-verification--build)
15. [Code Patterns & Conventions](#15-code-patterns--conventions)
16. [Common Pitfalls](#16-common-pitfalls)

---

## 1. Critical Rules

These are non-negotiable. Violating any of them will break the project.

1. **Backend is the source of truth.** Do NOT modify backend files unless you
   discover a proven backend defect during end-to-end testing AND get approval.
2. **No mock data, ever.** The current `DashboardPage.tsx` seeds fake documents
   on API failure. This MUST be removed. Show real empty/error states instead.
3. **No new features.** Rebuild what exists. Do not invent new endpoints, pages,
   or functionality.
4. **No new dependencies** unless absolutely necessary. The project already has:
   React 19, React Router 7, Tailwind CSS 4, Supabase JS, pdfjs-dist,
   framer-motion, clsx, tailwind-merge, @tabler/icons-react, @base-ui/react.
5. **Preserve user data.** Never reset, delete, or overwrite existing documents,
   manuscripts, or conversations in Supabase.
6. **No git operations.** Do not run `git commit`, `git push`, or `git add`.
   Leave all version control to the user.
7. **Run `npm run build` after every phase** to catch TypeScript errors early.
   The build command is `tsc --noEmit && vite build`.
8. **PowerShell syntax**: Use `;` not `&&` to chain commands. Working directory:
   `c:\Users\menak\Open source\Sophia_AI\sophia_ai\frontend`

---

## 2. Execution Discipline

### Token efficiency rules

- **Do NOT re-read files listed in this guide** unless you need to see lines not
  documented here.
- **Do NOT produce lengthy planning documents** before each phase. This guide IS
  the plan.
- **Do NOT scan the entire repository** looking for files. Every relevant file
  path is listed below.
- **One phase at a time.** Complete it, build, report, move on.
- **Smallest diff wins.** Edit existing files. Only create new files when there is
  no existing file to edit.
- **When editing, use exact target strings.** Read the file first if you are
  unsure of the exact text. Mismatched edit targets waste a tool call.

### Time budget (270 min total)

| Phase | Task | Budget |
|-------|------|--------|
| 1 | API client 401-refresh + remove mocks | 35 min |
| 2 | Unified AppLayout + NavRail across all pages | 35 min |
| 3 | Auth pages (Login, Register, Google callback) | 30 min |
| 4 | Dashboard + My Papers (real data, stats, search) | 45 min |
| 5 | Research Workspace (upload, PDF, summary, RAG) | 50 min |
| 6 | AI Writer (manuscripts, reference drawer) | 45 min |
| 7 | End-to-end verification + production build | 30 min |

### Verification after each phase

```
cd "c:\Users\menak\Open source\Sophia_AI\sophia_ai\frontend"; npm run build
```

If the build fails, fix the errors before moving to the next phase.

---

## 3. Project Structure

### Workspace root
```
c:\Users\menak\Open source\Sophia_AI\sophia_ai\
├── backend/           # Python FastAPI backend — DO NOT MODIFY
│   ├── app/
│   │   ├── api/       # Route handlers: auth.py, documents.py, manuscripts.py, health.py
│   │   ├── core/      # settings.py, supabase.py, handlers.py
│   │   ├── dependencies.py  # JWT verification, get_current_user
│   │   ├── services/  # auth.py, ingestion.py, rag.py, summary.py, llm.py, uploads.py
│   │   ├── models/    # SQLAlchemy: user.py, document.py
│   │   ├── schemas/   # Pydantic: auth.py, models.py, manuscripts.py
│   │   └── infrastructure/  # gemini.py, ollama.py, pdf.py, chroma_store.py, embeddings.py
│   └── keys/          # JWT RSA key pair (private.pem, public.pem)
│
└── frontend/          # React + Vite + TypeScript — THIS IS WHAT WE REBUILD
    ├── src/
    │   ├── api/
    │   │   ├── client.ts    # Central API client (fetch wrappers, auth headers, upload)
    │   │   ├── auth.ts      # Auth API calls (login, register, google, refresh, logout)
    │   │   └── types.ts     # TypeScript interfaces matching backend Pydantic schemas
    │   ├── components/
    │   │   ├── Navigation/
    │   │   │   ├── AppLayout.tsx   # Shared layout wrapper (NavRail + content area)
    │   │   │   └── NavRail.tsx     # Sidebar navigation component
    │   │   ├── Writer/
    │   │   │   ├── EditorCanvas.tsx
    │   │   │   ├── EditorToolbar.tsx
    │   │   │   └── ReferenceDrawer.tsx
    │   │   ├── AuthLayout.tsx      # Centered auth page wrapper
    │   │   ├── ChatPanel.tsx       # RAG chat with SSE streaming
    │   │   ├── DashboardHeader.tsx  # (UNUSED after NavRail migration — can delete)
    │   │   ├── DocumentCard.tsx    # Card component for document display
    │   │   ├── EmptyState.tsx      # Empty state placeholder
    │   │   ├── GoogleButton.tsx    # Google OAuth button
    │   │   ├── PasswordInput.tsx   # Password field with toggle visibility
    │   │   ├── PdfViewer.tsx       # PDF rendering with pdfjs-dist
    │   │   ├── ProtectedRoute.tsx  # Auth guard component
    │   │   ├── Sidebar.tsx         # OLD sidebar — used by DashboardPage (REPLACE)
    │   │   ├── SkeletonLoader.tsx  # Loading skeleton
    │   │   ├── SophiaLogo.tsx      # Logo component
    │   │   └── SummaryPanel.tsx    # Structured summary display
    │   ├── contexts/
    │   │   └── AuthContext.tsx     # Auth state management (login, register, logout, refresh)
    │   ├── lib/
    │   │   └── supabase.ts        # Supabase client initialization
    │   ├── pages/
    │   │   ├── DashboardPage.tsx   # My Research Papers (ALSO used by PapersPage)
    │   │   ├── PapersPage.tsx      # Thin wrapper: renders <DashboardPage />
    │   │   ├── WorkspacePage.tsx   # PDF upload + viewer + summary + chat
    │   │   ├── WriterPage.tsx      # Manuscript editor + reference drawer
    │   │   ├── LoginPage.tsx
    │   │   ├── RegisterPage.tsx
    │   │   ├── ForgotPasswordPage.tsx
    │   │   ├── ResetPasswordPage.tsx
    │   │   ├── GoogleCallbackPage.tsx
    │   │   └── LandingPage.tsx     # (Not currently routed — unused)
    │   ├── App.tsx                # Router configuration
    │   ├── main.tsx               # Entry point
    │   ├── index.css              # Tailwind config + design tokens
    │   └── vite-env.d.ts
    ├── public/
    │   └── logo-icon.png
    ├── .env                       # VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_API_BASE_URL
    ├── package.json
    ├── tsconfig.json
    └── vite.config.ts
```

### Key environment variables (frontend/.env)

```
VITE_SUPABASE_URL=https://jvunlisimaeqjffmoszn.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJ...
VITE_API_BASE_URL=http://localhost:8000
```

The backend is deployed on Railway. For local dev, it runs at `http://localhost:8000`.
The deployed frontend is on Vercel.

---

## 4. Design System & Tokens

All tokens are in `frontend/src/index.css`. DO NOT create a new design system file.

### Brand colors (use these Tailwind classes)
| Token | Hex | Usage |
|-------|-----|-------|
| `brand` | `#f26934` | Primary buttons, active states, links, focus rings |
| `brand-dark` | `#c44e22` | Hover on primary buttons |
| `brand-light` | `#fff4ed` | Light backgrounds, active nav pill bg |
| `brand-muted` | `#fed7c8` | Subtle accents |

### Stone palette (neutral grays — use `stone-*` NOT `gray-*`)
| Class | Usage |
|-------|-------|
| `stone-50` | Page background |
| `stone-100` | Hover backgrounds |
| `stone-200` | Borders, dividers |
| `stone-400` | Placeholder text, muted icons |
| `stone-500` | Secondary text, subtitles |
| `stone-600` | Body text |
| `stone-700` | Nav text |
| `stone-900` | Headings, primary text |

### Semantic colors
| Token | Usage |
|-------|-------|
| `success` / `success-light` | Ready status, 100% citation badge |
| `error` / `error-light` | Error alerts, destructive actions |
| `warning` / `warning-light` | Processing status |

### Typography
| Element | Classes |
|---------|---------|
| Page title | `text-2xl sm:text-3xl font-bold tracking-tight text-stone-900` |
| Subtitle | `text-sm text-stone-500` |
| Section heading | `text-sm font-semibold text-stone-900` |
| Stat label | `text-xs font-semibold text-stone-400 uppercase tracking-wider` |
| Stat value | `text-3xl font-bold text-stone-900 tracking-tight` |
| Body text | `text-sm text-stone-600` |
| Button text | `text-sm font-medium` |

### Shadows
Use existing utility classes: `shadow-card`, `shadow-card-hover`, `shadow-elevated`, `shadow-xs`.

### Animations
Available: `animate-fade-in`, `animate-slide-up`, `animate-pulse-soft`.

### Font
`"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif` (set in `--font-sans`).

---

## 5. Backend API Contract (Source of Truth)

Base URL construction in `client.ts`:
```typescript
const rawBase = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/+$/, "");
export const API_BASE = rawBase.endsWith("/api/v1")
  ? rawBase.slice(0, -"/api/v1".length)
  : rawBase;
// All calls use: `${API_BASE}/api/v1/...`
```

### Auth endpoints (`/api/v1/auth/...`)

| Method | Path | Request Body | Response | Status Codes |
|--------|------|-------------|----------|-------------|
| POST | `/register` | `{ username, email, password, confirm_password }` | `AuthResponse { user: User, tokens: { access_token, refresh_token, token_type } }` | 201, 409 (conflict), 400 |
| POST | `/login` | `{ username_or_email, password }` | `AuthResponse` | 200, 401 |
| POST | `/google` | `{ code, redirect_uri }` | `AuthResponse` | 200, 501 (not configured) |
| POST | `/refresh` | `{ refresh_token }` | `TokenResponse { access_token, refresh_token, token_type }` | 200, 401 |
| POST | `/logout` | `{ access_token? }` (optional body) | 204 No Content | 204 |
| GET | `/me` | (Auth header) | `UserResponse` (same as User) | 200, 401, 404 |
| POST | `/forgot-password` | `{ username_or_email }` | `{ message }` | 200 |
| POST | `/reset-password` | `{ token, new_password, confirm_password }` | `{ message }` | 200, 400 |

### Document endpoints (`/api/v1/documents/...`)

| Method | Path | Request | Response | Notes |
|--------|------|---------|----------|-------|
| POST | `/` | `multipart/form-data: file` | `Document` | Max 20MB PDF. Returns complete document with `status: "ready"` |
| GET | `/` | `?limit=50&offset=0` | `Document[]` | User-scoped (JWT → user_id) |
| GET | `/{id}` | — | `Document` | Ownership-verified |
| DELETE | `/{id}` | — | 204 | Deletes from Supabase + ChromaDB + filesystem |
| GET | `/{id}/file` | — | Binary PDF (`application/pdf`) | From Supabase Storage or filesystem |
| GET | `/{id}/chunks` | — | `ChunkList { document_id, chunks }` | |
| POST | `/{id}/summary` | — | `PaperSummary` | Generates via LLM if not cached. Can be slow (30s+) |
| GET | `/{id}/summary` | — | `PaperSummary` | Returns cached. 409 if not yet generated |
| POST | `/{id}/questions` | `{ question }` | `ChatResponse { answer, sources, document_id }` | RAG with citations |
| GET | `/{id}/questions/stream` | `?question=...` | SSE text/event-stream | Tokens streamed, then `[CITATIONS]{json}` |

### Manuscript endpoints (`/api/v1/manuscripts/...`)

| Method | Path | Request Body | Response |
|--------|------|-------------|----------|
| GET | `/` | — | `Manuscript[]` |
| POST | `/` | `{ title?, content?, status?, document_id? }` | `Manuscript` (201) |
| GET | `/{id}` | — | `Manuscript` |
| PUT | `/{id}` | `{ title?, content?, status?, document_id? }` | `Manuscript` |
| DELETE | `/{id}` | — | 204 |

### TypeScript interfaces (in `api/types.ts`)

```typescript
interface Document {
  id: string; filename: string; page_count: number;
  chunk_count: number; created_at: string;
}

interface PaperSummary {
  title: string; authors: string; abstract: string;
  problem_statement: string; methodology: string;
  key_results: string; conclusion: string;
}

interface SourceCitation { page: number; excerpt: string; chunk_id: string; }
interface ChatResponse { answer: string; sources: SourceCitation[]; document_id: string; }

interface Manuscript {
  id: string; user_id: string; document_id?: string | null;
  title: string; content: string; status: "draft" | "in_review" | "published";
  version: number; created_at: string; updated_at: string;
}

interface User {
  id: string; username: string; email: string;
  full_name?: string | null; avatar_url?: string | null;
  is_active: boolean; is_verified: boolean;
  created_at: string; updated_at: string; last_login_at?: string | null;
}

interface AuthResponse { user: User; tokens: AuthTokens; }
interface AuthTokens { access_token: string; refresh_token: string; token_type: string; }
```

### Auth header format
```
Authorization: Bearer <access_token>
```

Access tokens expire in **15 minutes**. Refresh tokens expire in **7 days**.

---

## 6. Frontend Architecture (Current State)

### Routing (`App.tsx`)

```
/                         → Redirect to /dashboard
/login                    → LoginPage
/register                 → RegisterPage
/forgot-password          → ForgotPasswordPage
/reset-password           → ResetPasswordPage
/auth/google/callback     → GoogleCallbackPage
/upload                   → Redirect to /workspace
/dashboard                → ProtectedRoute → DashboardPage
/papers                   → ProtectedRoute → PapersPage (renders DashboardPage)
/workspace                → ProtectedRoute → WorkspacePage
/workspace/:documentId    → ProtectedRoute → WorkspacePage
/writer                   → ProtectedRoute → WriterPage
/writer/:documentId       → ProtectedRoute → WriterPage
*                         → Redirect to /dashboard
```

### Auth flow

1. User submits credentials → `LoginPage` calls `AuthContext.login()`.
2. `AuthContext.login()` calls `api/auth.ts → login()` which POSTs to backend.
3. Backend returns `{ user, tokens: { access_token, refresh_token } }`.
4. `AuthContext.setSession()` stores tokens in `sessionStorage("sophia_auth")`
   and sets `authToken` in `client.ts` via `setAuthToken()`.
5. All subsequent API calls in `client.ts` attach `Authorization: Bearer <token>`.
6. On page reload, `AuthContext` reads `sessionStorage` and restores state.
7. **BUG**: No automatic token refresh on 401. See section 7.

### Navigation inconsistency (current)

- `DashboardPage` uses the OLD `<Sidebar>` component directly.
- `WorkspacePage` uses `<AppLayout>` (which wraps `<NavRail>`).
- `WriterPage` uses `<AppLayout>`.
- `PapersPage` renders `<DashboardPage>` which uses the old `<Sidebar>`.

This must be unified: ALL authenticated pages use `<AppLayout>` + `<NavRail>`.

---

## 7. Known Bugs & Root Causes

### Bug 1: "Something went wrong" on login

**Root cause**: The `errorMessage()` function in `client.ts` returns the generic
string `"Something went wrong."` for any error that isn't an `ApiError` or
`TypeError`. When the backend returns a valid error response with
`{ code, message }`, the `postJson` function in `auth.ts` correctly creates an
`ApiError`. But if the backend is unreachable (CORS, network), it throws a raw
`TypeError` which shows "Could not reach the server." If there's any other
exception type, it falls to the catch-all "Something went wrong."

**Fix**: In `LoginPage`, show the ACTUAL `error` from `AuthContext` rather than
just a generic message. The `AuthContext` already calls `errorMessage(reason)` and
stores it in `error` state. The login page already displays `{error}` in line 84.
The real fix is to ensure the backend is reachable and CORS is configured. The
frontend error handling is actually correct — the issue is likely a network/CORS
problem with the deployed backend or an expired Supabase session.

### Bug 2: Mock data hides real errors

**Location**: `DashboardPage.tsx` lines 38-76.

**Root cause**: When `fetchDocuments()` fails (401 or network error), the catch
block seeds fake hardcoded documents instead of showing the error. This makes the
UI appear functional when it isn't.

**Fix**: Remove the fake document seeding. Replace with:
```typescript
// In the catch block:
setDocuments([]);
// Optionally set an error state to display
```

### Bug 3: No automatic token refresh

**Location**: `api/client.ts` — the `authHeaders()` function and all `fetch()`
calls.

**Root cause**: Access tokens expire after 15 minutes. When a request returns
401, the frontend does nothing — the user sees a broken page. The `AuthContext`
has a `refreshSession()` method but it's never called automatically.

**Fix**: Add a `fetchWithAuth()` wrapper in `client.ts` that:
1. Makes the request with the current `authToken`.
2. If response is 401, attempts `refreshTokens(refreshToken)`.
3. If refresh succeeds, updates `authToken` + `sessionStorage`, retries the
   original request once.
4. If refresh fails, clears session and redirects to `/login`.

### Bug 4: DashboardPage uses old Sidebar instead of AppLayout

**Location**: `DashboardPage.tsx` line 11, 161-165.

**Fix**: Replace `<Sidebar>` import and usage with `<AppLayout>`. Remove the
`collapsed` state management from DashboardPage (AppLayout handles it).

---

## 8. Phase 1: API Client & Auth Fix

### Goal
Make all API calls resilient to token expiration. Remove all mock data.

### Files to modify

1. **`frontend/src/api/client.ts`**
   - Add a stored `refreshToken` alongside `authToken`.
   - Add `setRefreshToken(token)` / `getRefreshToken()`.
   - Add `fetchWithAuth(url, options)` that auto-refreshes on 401.
   - Update all fetch-based functions to use `fetchWithAuth`.
   - The XHR-based `uploadDocument` needs manual 401 handling (check
     `xhr.status === 401` in `onload`).

2. **`frontend/src/contexts/AuthContext.tsx`**
   - In `setSession()`, also call `setRefreshToken(tokens.refresh_token)`.
   - In `doLogout()`, also call `setRefreshToken(null)`.
   - In the initial `useState` restore from `sessionStorage`, also restore the
     refresh token via `setRefreshToken`.
   - Export the refresh token in context so `client.ts` can access it, OR have
     `client.ts` manage it independently via its own module-level variable (simpler).

3. **`frontend/src/pages/DashboardPage.tsx`**
   - Remove lines 38-76 (the fake document seeding in both the success-empty and
     catch blocks).
   - Replace with `setDocuments([])` and optionally set a `fetchError` state.

### Implementation pattern for `fetchWithAuth`

```typescript
// In client.ts — add near the top, after authToken declarations:

let refreshTokenValue: string | null = null;

export function setRefreshToken(token: string | null): void {
  refreshTokenValue = token;
}

export function getRefreshToken(): string | null {
  return refreshTokenValue;
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (!refreshTokenValue) return false;
  if (isRefreshing && refreshPromise) return refreshPromise;
  
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshTokenValue }),
      });
      if (!response.ok) return false;
      const data = await response.json();
      authToken = data.access_token;
      refreshTokenValue = data.refresh_token;
      // Update sessionStorage
      try {
        const stored = sessionStorage.getItem("sophia_auth");
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.accessToken = data.access_token;
          parsed.refreshToken = data.refresh_token;
          sessionStorage.setItem("sophia_auth", JSON.stringify(parsed));
        }
      } catch {}
      return true;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(options.headers);
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);
  
  let response = await fetch(url, { ...options, headers });
  
  if (response.status === 401 && refreshTokenValue) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const retryHeaders = new Headers(options.headers);
      retryHeaders.set("Authorization", `Bearer ${authToken}`);
      response = await fetch(url, { ...options, headers: retryHeaders });
    }
  }
  
  return response;
}
```

Then replace all `fetch(url, { headers: authHeaders(...) })` calls with
`fetchWithAuth(url, { headers: { "Content-Type": "application/json" } })` etc.

### What NOT to change
- `api/auth.ts` — auth calls (login, register, etc.) don't need auth headers.
  They use their own `postJson` helper. Leave as-is.
- `api/types.ts` — No changes needed.
- Backend files — Do not touch.

---

## 9. Phase 2: Unified Navigation & Layout

### Goal
Every authenticated page uses `<AppLayout>` + `<NavRail>`. One sidebar everywhere.

### Files to modify

1. **`DashboardPage.tsx`** — Remove `import { Sidebar }` and replace with
   `AppLayout` wrapper. Remove the `collapsed` / `setCollapsed` state. Remove
   the `ml-16` / `ml-64` margin logic (AppLayout handles layout).

2. **`PapersPage.tsx`** — Currently renders `<DashboardPage />`. After
   DashboardPage uses AppLayout, PapersPage should just re-export or alias it.
   Alternatively, make DashboardPage accept an `activePath` prop so both routes
   highlight correctly.

3. **`WorkspacePage.tsx`** — Already uses `<AppLayout>`. Verify it works.

4. **`WriterPage.tsx`** — Already uses `<AppLayout>`. Verify it works.

### NavRail active state logic

The current `NavRail.tsx` (line 114) uses:
```typescript
const isActive = location.pathname === item.href ||
                 location.pathname.startsWith(`${item.href}/`);
```

This is correct. The navigation items are:
- `/dashboard` — "Dashboard"
- `/papers` — "My Papers"
- `/workspace` — "Research Workspace"
- `/writer` — "AI Writer"

### DashboardPage refactor pattern

Before (current):
```tsx
<div className="flex min-h-screen ...">
  <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} activePath="/papers" />
  <main className={`flex-1 ... ${collapsed ? "ml-16" : "ml-64"}`}>
    ...content...
  </main>
</div>
```

After:
```tsx
<AppLayout>
  <main className="flex-1 overflow-y-auto">
    <div className="max-w-7xl mx-auto px-6 py-8 sm:px-10 lg:px-12">
      ...content (same inner content, remove Sidebar + margin logic)...
    </div>
  </main>
</AppLayout>
```

### Files to DELETE (optional cleanup)
- `components/Sidebar.tsx` — Replaced by NavRail. Only delete after confirming
  nothing else imports it.
- `components/DashboardHeader.tsx` — Unused after NavRail migration.
- `components/ui/sidebar.tsx` — Unused wensity sidebar component.
- `components/ui/demo.tsx` — Unused demo component.

Check imports before deleting:
```powershell
Get-ChildItem -Recurse frontend/src -Include *.ts,*.tsx | Select-String "Sidebar"
Get-ChildItem -Recurse frontend/src -Include *.ts,*.tsx | Select-String "DashboardHeader"
```

---

## 10. Phase 3: Auth Pages Rebuild

### Goal
Login, Register, and Google Callback pages look polished and connect to the real
backend with proper error messages.

### Files to modify

1. **`LoginPage.tsx`** — Currently functional. Improvements:
   - Show specific error messages from the backend (already displays `{error}`).
   - Disable form fields while submitting (partially done).
   - The Google button currently navigates to `/auth/google` which doesn't exist
     as a route. Google OAuth needs to redirect to the backend or use Supabase
     OAuth. Verify the actual flow.

2. **`RegisterPage.tsx`** — Read it and verify it calls `AuthContext.register()`.
   Ensure password confirmation validation is client-side.

3. **`GoogleCallbackPage.tsx`** — Currently functional. It reads `code` from
   URL params, calls `googleAuth({ code, redirect_uri })`, and uses `setSession`.

### Google OAuth flow (current implementation)

The `GoogleButton` in `LoginPage` calls `navigate("/auth/google")` — but there's
NO route for `/auth/google` in `App.tsx`. The OAuth initiation should redirect
the browser to Google's authorization URL.

**Check if Supabase handles this**: The `supabase.ts` client is configured with
`detectSessionInUrl: true`. The backend endpoint `POST /api/v1/auth/google`
expects `{ code, redirect_uri }` and uses admin API or Supabase sign-in.

If Google OAuth is not fully configured (backend returns 501), just make the
button show a "Google sign-in is not yet configured" toast instead of navigating
to a broken route. Do NOT implement a new OAuth flow.

### AuthLayout component
Already exists at `components/AuthLayout.tsx`. It provides centered card layout
for auth pages. Reuse as-is.

---

## 11. Phase 4: Dashboard & My Papers

### Goal
Document library with real data, real statistics, search, upload, delete.

### Current state
`DashboardPage.tsx` is a 432-line monolith that serves as both Dashboard and
Papers page. It has:
- Document list fetching (with mock fallback — REMOVE)
- Upload via hidden file input
- Delete with confirmation
- Search filter
- Statistics cards (total papers, total pages, grounded citations)
- Document table with actions (Workspace link, AI Writer link, Delete)

### Required changes

1. Remove mock data seeding (lines 38-76 catch block).
2. Wrap in `<AppLayout>` instead of old `<Sidebar>`.
3. Add proper loading skeleton during `fetchDocuments()`.
4. Add error state with retry button if fetch fails.
5. Show empty state when there are no documents.
6. Ensure "Workspace" action button navigates to `/workspace/{id}`.
7. Ensure "AI Writer" action button navigates to `/writer/{id}`.
8. Upload button triggers file input → calls `uploadDocument()` → on success,
   navigates to `/workspace/{id}`.

### PapersPage consideration
Currently `PapersPage.tsx` just re-renders `<DashboardPage />`. Both `/dashboard`
and `/papers` show the same page. This is the intended behavior per the current
routing. Keep it unless the user requests separation.

---

## 12. Phase 5: Research Workspace

### Goal
Upload PDF → View PDF → Generate/View Summary → Ask questions with RAG streaming.

### Current state
`WorkspacePage.tsx` (364 lines) has four phases: idle, loading, upload, ready.

- **Idle**: Shows drag-and-drop upload zone.
- **Loading**: Shows spinner when fetching document by ID from URL.
- **Upload**: Shows progress bar during upload.
- **Ready**: Three-column layout — PDF viewer | Summary/Chat tabs.

### Key interactions to preserve

1. **Upload**: Drag-and-drop or file picker → `uploadDocument(file, onProgress)`
   → navigate to `/workspace/{id}`.
2. **URL-based loading**: `/workspace/:documentId` fetches document metadata and
   PDF file via `fetchDocument()` + `fetchDocumentFile()`.
3. **Summary tab**: `<SummaryPanel>` calls `createSummary(documentId)` (POST) to
   generate, displays sections.
4. **Chat tab**: `<ChatPanel>` uses `askQuestionStream()` for SSE streaming.
   Supports suggested questions, message history, citation links.
5. **PDF navigation**: Citation clicks call `onOpenPage(pageNumber)` to jump in
   `<PdfViewer>`.

### Files involved
- `WorkspacePage.tsx` — Main page (already uses `<AppLayout>`)
- `components/PdfViewer.tsx` — PDF rendering
- `components/SummaryPanel.tsx` — Summary display + generation trigger
- `components/ChatPanel.tsx` — RAG chat with streaming

### Changes needed
- Verify all API calls use `fetchWithAuth` (from Phase 1).
- Ensure error states display actual messages.
- WorkspacePage already uses `<AppLayout>` — verify it still works after Phase 2.

---

## 13. Phase 6: AI Writer

### Goal
Manuscript editor connected to real cloud persistence.

### Current state
`WriterPage.tsx` (225 lines) has:
- Document selector (loads user's papers via `fetchDocuments()`).
- Manuscript loading from cloud (`fetchManuscripts()`) with localStorage fallback.
- Auto-save with 1500ms debounce → `updateManuscript()` or `createManuscript()`.
- Reference drawer with Summary tab + Ask Paper (RAG) tab.
- Editor with toolbar (bold, italic, heading, list, etc.).
- Word/character count, copy, markdown export.

### Key integrations to preserve

1. **Load manuscripts**: On mount, fetches all user manuscripts. Matches by
   `document_id` or falls back to most recent.
2. **Auto-save**: Debounced save writes to localStorage first (instant), then
   PUTs to `api/v1/manuscripts/{id}`. Shows sync status badge.
3. **Reference drawer**: Contains `<SummaryPanel>` and `<ChatPanel>` for the
   selected document.
4. **Create new manuscript**: If no existing manuscript, POSTs to create one.

### Files involved
- `WriterPage.tsx` — Main page (already uses `<AppLayout>`)
- `components/Writer/EditorCanvas.tsx` — Textarea/contenteditable editor
- `components/Writer/EditorToolbar.tsx` — Formatting buttons
- `components/Writer/ReferenceDrawer.tsx` — Side panel with paper reference

### Changes needed
- Verify all API calls use `fetchWithAuth` (from Phase 1).
- Ensure manuscripts persist correctly after page refresh.
- WriterPage already uses `<AppLayout>` — verify it works.

---

## 14. Phase 7: Verification & Build

### Checklist

```
[ ] npm run build — no TypeScript errors
[ ] All routes load without console errors
[ ] Login with valid credentials → redirects to /dashboard
[ ] Refresh browser → session persists
[ ] Navigate: Dashboard → Papers → Workspace → Writer → back works
[ ] NavRail active state highlights correctly on each page
[ ] Sidebar collapse/expand works
[ ] Upload PDF → shows progress → navigates to workspace
[ ] Document appears in papers list after upload
[ ] Summary generates or loads from cache
[ ] RAG chat returns answers with citations
[ ] Citation click jumps to PDF page
[ ] Writer auto-saves to cloud
[ ] Writer loads existing manuscript on refresh
[ ] Logout clears session → redirect to /login
[ ] Protected routes redirect unauthenticated users to /login
[ ] No mock/fake data anywhere
[ ] No unused imports
```

### Build command
```powershell
cd "c:\Users\menak\Open source\Sophia_AI\sophia_ai\frontend"; npm run build
```

### If build fails
1. Read the error output — it shows file:line:column.
2. Fix the TypeScript error.
3. Re-run build.
4. Do NOT skip build verification.

---

## 15. Code Patterns & Conventions

### Import ordering (follow existing convention)
```typescript
// 1. React/hooks
import { useState, useEffect } from "react";
// 2. React Router
import { useNavigate, useParams } from "react-router-dom";
// 3. API/client
import { fetchDocuments, errorMessage } from "../api/client";
// 4. Types
import type { Document } from "../api/types";
// 5. Context
import { useAuth } from "../contexts/AuthContext";
// 6. Components
import { AppLayout } from "../components/Navigation/AppLayout";
```

### Component pattern
```typescript
interface MyComponentProps {
  // explicit props interface
}

export function MyComponent({ prop1, prop2 }: MyComponentProps) {
  // Named export, function declaration (not arrow)
  // State first, effects second, handlers third, return last
}
```

### Error handling pattern
```typescript
try {
  const data = await someApiCall();
  // handle success
} catch (err) {
  setError(errorMessage(err)); // Use the centralized errorMessage()
}
```

### Tailwind class ordering convention
Layout → Sizing → Spacing → Typography → Colors → Effects → Interaction
```
"flex items-center gap-2 w-full p-4 text-sm font-medium text-stone-700 bg-white rounded-lg shadow-card hover:bg-stone-50 transition-colors"
```

### File naming
- Components: `PascalCase.tsx`
- Utilities/services: `camelCase.ts`
- Pages: `PascalCasePage.tsx`

---

## 16. Common Pitfalls

### 1. PowerShell command syntax
**WRONG**: `cd frontend && npm run build`
**RIGHT**: `cd "c:\Users\menak\Open source\Sophia_AI\sophia_ai\frontend"; npm run build`

### 2. edit_file target mismatch
Always read the file first if unsure about exact whitespace. The `Target` must
match the file byte-for-byte including leading spaces and line endings.

### 3. Tailwind v4 syntax
This project uses Tailwind CSS v4 with `@import "tailwindcss"` syntax (not the
old `@tailwind base; @tailwind components; @tailwind utilities;`). Theme tokens
use `@theme { }` blocks, not `tailwind.config.js`.

### 4. React Router v7
Uses `react-router-dom` v7. Components use `useNavigate()`, `useParams()`,
`useLocation()`, `<Routes>`, `<Route>`, `<Navigate>`.

### 5. No `useEffect` dependencies missing
React 19 strict mode will warn about missing deps. Always include all variables
referenced in useEffect in the dependency array (or use `useCallback`).

### 6. Don't break AppLayout's flex
`AppLayout` uses `flex h-dvh w-screen overflow-hidden`. Child pages should use
`flex-1 overflow-y-auto` for their main content area to enable scrolling within
the layout.

### 7. Supabase client in frontend
The frontend's `lib/supabase.ts` creates a Supabase client with the anon key.
It's used for `persistSession`, `autoRefreshToken`, and `detectSessionInUrl`.
However, the actual auth calls go through the backend API, NOT directly through
Supabase's client auth. The Supabase client is primarily available for future
direct Supabase operations. Do not change this architecture.

### 8. sessionStorage key
Auth state is stored under the key `"sophia_auth"` in `sessionStorage`. The
stored object shape is:
```json
{ "user": User, "accessToken": "...", "refreshToken": "..." }
```
Do not change this key name or shape — it would log out all existing users.

### 9. The `/papers` and `/dashboard` routes
Both currently render `DashboardPage`. The NavRail has separate items for
"Dashboard" (`/dashboard`) and "My Papers" (`/papers`). After the rebuild:
- `/dashboard` should show a welcome dashboard view (or the same papers view).
- `/papers` shows the papers library.
Keep both routes working. If you want them to show different content later, the
user will request that separately.

### 10. XHR upload in client.ts
The `uploadDocument()` function uses `XMLHttpRequest` (not `fetch`) because
`fetch` doesn't support upload progress events. When adding auth refresh, you
cannot easily retry an XHR upload. Instead, check if the token is stale BEFORE
starting the upload by proactively refreshing if the token is near expiry.
Alternatively, if the XHR returns 401, show an error asking the user to retry
(the file is still in their browser's file picker).

---

## Summary: Execution Order

1. **Read this guide completely** before writing any code.
2. **Phase 1**: Fix `client.ts` (add `fetchWithAuth` with auto-refresh), fix
   `AuthContext.tsx` (store refresh token), fix `DashboardPage.tsx` (remove mocks).
   Run build.
3. **Phase 2**: Migrate `DashboardPage` from old `Sidebar` to `AppLayout`.
   Verify all 4 authenticated pages use `AppLayout`. Run build.
4. **Phase 3**: Polish auth pages. Verify Google OAuth behavior. Run build.
5. **Phase 4**: Wire DashboardPage to real data with loading/empty/error states.
   Run build.
6. **Phase 5**: Verify WorkspacePage integrations (upload, summary, RAG). Run build.
7. **Phase 6**: Verify WriterPage integrations (manuscripts, auto-save). Run build.
8. **Phase 7**: Full end-to-end checklist. Final build. Report.

**After completing all phases**, provide a concise report listing:
- Pages rebuilt/modified
- Backend integrations verified
- Errors discovered and fixed
- Remaining blockers
- Files changed
- Build result

