# Frontend Entry Page Roadmap — Sophia AI (Corrected Minimal)

## Root Cause

The root route `/` currently redirects to `/dashboard` (line 531 in `App.tsx`), which is wrapped in `<ProtectedRoute>`. The `ProtectedRoute` component checks `AuthContext.isAuthenticated`, which initializes as `unauthenticated`. Since there is no session persistence or auto-restore, users are immediately redirected to `/login`.

---

## Proposed Routing Changes

### Current Routes
| Route | Component | Protection |
|-------|-----------|------------|
| `/` | `Navigate → /dashboard` | → Protected |
| `/login` | `LoginPage` | Public |
| `/register` | `RegisterPage` | Public |
| `/forgot-password` | `ForgotPasswordPage` | Public |
| `/reset-password` | `ResetPasswordPage` | Public |
| `/dashboard` | `DashboardPage` | Protected |
| `/workspace` | `WorkspacePage` | Protected |
| `/workspace/:id` | `WorkspacePage` | Protected |
| `/papers` | `Navigate → /dashboard` | Protected |

### Proposed Routes
| Route | Component | Protection | Notes |
|-------|-----------|------------|-------|
| `/` | `LandingPage` | **Public** | New landing/upload page |
| `/login` | `LoginPage` | Public | Unchanged |
| `/register` | `RegisterPage` | Public | Unchanged |
| `/forgot-password` | `ForgotPasswordPage` | Public | Unchanged |
| `/reset-password` | `ResetPasswordPage` | Public | Unchanged |
| `/auth/google/callback` | `GoogleCallbackPage` | Public | Unchanged |
| `/upload` | `Navigate → /` | Public | Redirect to landing |
| `/dashboard` | `DashboardPage` | **Protected** | Unchanged |
| `/workspace` | `WorkspacePage` | **Protected** | Authenticated users |
| `/workspace/:documentId` | `WorkspacePage` | **Public** | For public upload results |
| `/papers` | `Navigate → /dashboard` | Protected | Unchanged |

---

## Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `frontend/src/pages/LandingPage.tsx` | **Create** | New public landing page with upload |
| `frontend/src/App.tsx` | **Modify** | Update routes, import `LandingPage`, make `/workspace/:documentId` public |
| `backend/app/api/documents.py` | **Modify** | Add `GET /api/v1/documents/{id}/file` endpoint |

---

## Files to Preserve (Do Not Modify)

| File | Reason |
|------|--------|
| `frontend/src/components/ProtectedRoute.tsx` | Core auth guard, unchanged |
| `frontend/src/contexts/AuthContext.tsx` | Auth state management, unchanged |
| `frontend/src/api/client.ts` | API client, unchanged |
| `frontend/src/api/auth.ts` | Auth API, unchanged |
| `frontend/src/pages/LoginPage.tsx` | Existing auth page |
| `frontend/src/pages/RegisterPage.tsx` | Existing auth page |
| `frontend/src/pages/ForgotPasswordPage.tsx` | Existing auth page |
| `frontend/src/pages/ResetPasswordPage.tsx` | Existing auth page |
| `frontend/src/pages/GoogleCallbackPage.tsx` | Existing auth page |
| `frontend/src/pages/DashboardPage.tsx` | Protected dashboard, unchanged |
| `frontend/src/components/DashboardHeader.tsx` | Already shows Sign In/Create Account for unauthenticated |
| `frontend/src/components/UploadScreen` (in App.tsx) | Reused logic for LandingPage |
| `backend/` (other files) | No other backend changes required |

---

## Authentication Impact

### Current Behavior
- All document operations require authentication
- Dashboard, workspace, papers are protected
- Tokens stored in memory only (no persistence)

### After Changes
| Page | Auth Required | Behavior |
|------|---------------|----------|
| `/` (Landing) | **No** | Public upload, process, summarize |
| `/workspace/:id` (from public upload) | **No** | View results, chat with paper |
| `/dashboard` | **Yes** | Save documents, history, settings |
| `/papers` | **Yes** | User's document list |
| `/workspace` (no ID) | **Yes** | Authenticated workspace |

### Public Upload Flow
1. User visits `/` → sees `LandingPage`
2. Uploads PDF → backend processes (no auth required on backend)
3. On success → navigate to `/workspace/:documentId` with document state
4. User can view summary, chat, PDF without signing in
5. To save → click "Sign In" / "Create Account" → redirected to `/dashboard`

### Backend Auth Requirements
**No backend auth changes required.** The current backend endpoints do not enforce authentication:
- `POST /api/v1/documents` - accepts upload without auth
- `GET /api/v1/documents/{id}` - returns document by ID
- `POST /api/v1/documents/{id}/summary` - generates summary
- `POST /api/v1/documents/{id}/questions` - answers questions
- `GET /api/v1/documents/{id}/file` - **NEW: serves PDF** (added in this roadmap)

**Note**: Current in-memory session store doesn't associate documents with users. Public uploads won't appear in dashboard later.

---

## Backend Impact

### Required Backend Endpoint (NEW)
- ✅ `POST /api/v1/documents` - Upload document
- ✅ `GET /api/v1/documents/{id}` - Get document metadata
- ✅ `POST /api/v1/documents/{id}/summary` - Generate summary
- ✅ `POST /api/v1/documents/{id}/questions` - Ask questions (SSE)
- 🔴 **ADD**: `GET /api/v1/documents/{id}/file` - **Serve PDF for viewer** (NEW)

### No Backend Changes Required For
- Public upload (already works without auth)
- Summary generation
- Chat/RAG queries
- Document metadata retrieval

---

## Implementation Order

### Phase 1: Backend File Serving Endpoint (Prerequisite)
1. Add `GET /api/v1/documents/{id}/file` in `backend/app/api/documents.py`
   - Read PDF from `data/documents/{id}/original.pdf`
   - Return `FileResponse` with `media_type="application/pdf"`

### Phase 2: Landing Page Component
2. Create `frontend/src/pages/LandingPage.tsx`
   - Hero section: branding, "Turn Research Papers into Insights", description
   - Reuse `UploadScreen` logic from `App.tsx` (drag-drop, validation, progress)
   - On upload success → `navigate(\`/workspace/${document.id}\`, { state: { document, file } })`

### Phase 3: Routing Update
3. Modify `frontend/src/App.tsx`:
   - Import `LandingPage`
   - Root route: `<Route path="/" element={<LandingPage />} />`
   - Remove `/upload` redirect to dashboard
   - `/workspace/:documentId` → remove `ProtectedRoute` (make public)
   - Keep `/dashboard`, `/workspace` (no ID), `/papers` protected

### Phase 4: Verification
4. Run build and tests
5. Manual test: public upload → workspace → summary → chat → PDF viewer
6. Verify auth pages still work
7. Verify dashboard still protected

---

## WorkspacePage State Handling for Public Access

**Current behavior**: `WorkspacePage` reads `location.state` for `{ document, file }` (lines 28-44 in `App.tsx`).

**For public access**: After upload, `LandingPage` navigates with `state: { document, file }`. On refresh, state is lost.

**Acceptable for MVP**: Document state lost on refresh (known limitation). User can re-upload.

**No code change needed** in `WorkspacePage` — it already handles missing state by showing empty state.

---

## Testing Plan

### Automated Tests
```bash
# Frontend
cd frontend && npm run build
cd frontend && npm run test

# Backend
cd backend && python -m pytest -v
```

### Manual Test Scenarios

| Scenario | Expected Result |
|----------|-----------------|
| Visit `/` | Landing page with upload, no redirect to login |
| Upload PDF on `/` | Uploads, processes, redirects to `/workspace/:id` |
| View summary on `/workspace/:id` | Summary loads without login |
| Chat with paper on `/workspace/:id` | Chat works without login |
| **PDF viewer on `/workspace/:id`** | **PDF loads (new file endpoint)** |
| Click "Sign In" on landing | Navigates to `/login` |
| Click "Create Account" | Navigates to `/register` |
| Visit `/dashboard` unauthenticated | Redirects to `/login` |
| Visit `/workspace` (no ID) unauthenticated | Redirects to `/login` |
| Login → visit `/dashboard` | Shows dashboard with documents |
| Upload from dashboard → workspace | Works as before |
| Refresh page on `/workspace/:id` | Document state lost (known limitation) |

### Regression Tests
- Login → logout → login flow
- Register → login → dashboard
- Forgot password → reset password
- Protected routes still redirect correctly

---

## Rollback Plan

If issues arise, revert in order:

1. **Revert `App.tsx` routing** to original:
   ```tsx
   <Route path="/" element={<Navigate to="/dashboard" replace />} />
   <Route path="/workspace/:documentId" element={<ProtectedRoute><WorkspacePage /></ProtectedRoute>} />
   ```

2. **Delete** `frontend/src/pages/LandingPage.tsx`

3. **Revert backend endpoint** in `backend/app/api/documents.py`

4. **Git commands**:
   ```bash
   git checkout -- frontend/src/App.tsx
   git checkout -- backend/app/api/documents.py
   rm frontend/src/pages/LandingPage.tsx
   ```

5. Verify: `npm run build && npm run test && cd ../backend && python -m pytest -v`

---

## Approval Checklist

Before implementation, confirm:

- [ ] Landing page design matches existing design system
- [ ] Public upload uses existing backend (no auth headers)
- [ ] Protected routes remain protected
- [ ] Backend file endpoint added and tested
- [ ] Existing tests pass
- [ ] Rollback plan is executable

---

*Roadmap created: 2026-11-07*
*Based on: `frontend-inspection-report.md` + review feedback*
*Branch: `Default-landing-page`*