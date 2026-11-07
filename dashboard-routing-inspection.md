# Dashboard Routing Inspection Report

## Current Routing Structure

### Route Configuration (`frontend/src/App.tsx`)
```typescript
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
  <Route path="/reset-password" element={<ResetPasswordPage />} />
  <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
  <Route path="/upload" element={<Navigate to="/" replace />} />
  <Route path="/" element={<LandingPage />} />
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
  <Route path="/workspace/:documentId" element={<WorkspacePage />} />
  <Route path="/papers" element={
    <ProtectedRoute>
      <Navigate to="/dashboard" replace />
    </ProtectedRoute>
  } />
</Routes>
```

### Current Route Table
| Route | Component | Protection |
|-------|-----------|------------|
| `/` | `LandingPage` | Public |
| `/login` | `LoginPage` | Public |
| `/register` | `RegisterPage` | Public |
| `/forgot-password` | `ForgotPasswordPage` | Public |
| `/reset-password` | `ResetPasswordPage` | Public |
| `/auth/google/callback` | `GoogleCallbackPage` | Public |
| `/upload` | Redirect to `/` | Public |
| `/dashboard` | `DashboardPage` | Protected |
| `/workspace` | `WorkspacePage` | Protected |
| `/workspace/:documentId` | `WorkspacePage` | **Public** |
| `/papers` | Redirect to `/dashboard` | Protected |

**Key Observation**: The root route `/` currently serves `LandingPage` (public), NOT the dashboard. The dashboard is at `/dashboard` and is protected.

---

## Current Dashboard Implementation

### DashboardPage Component (`frontend/src/pages/DashboardPage.tsx`)
- **Route**: `/dashboard` (protected via `ProtectedRoute`)
- **Features**:
  - Sidebar navigation with Dashboard, My Research Papers, Upload Paper, Account Settings
  - DashboardHeader with user profile menu and sign-out
  - Upload functionality (drag-drop + file input)
  - Document list with DocumentCard components
  - Upload progress tracking
  - Document management (open, delete, retry)
- **State Management**: Local state for documents, upload status, errors
- **Navigation**: Uses `navigate` to `/workspace/:documentId` on upload success

### DashboardPage Props
```typescript
interface DashboardPageProps {
  initialDocument?: Document;
}
```

---

## Authentication Behavior

### AuthContext (`frontend/src/contexts/AuthContext.tsx`)
- **State**: `unauthenticated` | `authenticating` | `authenticated`
- **Storage**: In-memory only (no localStorage/sessionStorage per security rules)
- **Methods**: `login`, `register`, `logout`, `refreshSession`, `clearError`
- **Initial State**: `{ kind: "unauthenticated" }` — no auto-restore

### ProtectedRoute (`frontend/src/components/ProtectedRoute.tsx`)
```typescript
if (isLoading) return null;
if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
return <>{children}</>;
```
- Redirects unauthenticated users to `/login` with `from` state
- Returns `null` during loading (brief flash possible)

### Current Initial State
- `AuthProvider` initializes with `{ kind: "unauthenticated" }`
- No `useEffect` to check for existing session on mount
- Tokens stored in memory only (no persistence)

---

## Why Sign-In Page Appears First

### Current Behavior (Confirmed)
The root route `/` currently serves `LandingPage` (public), **NOT** the dashboard.

**However**, based on the commit history (`7efd4c0 upload; add file handling and progress indicators. Sign in on the landing need to be fixed.`), there may have been a recent regression where the landing page showed sign-in.

### Current Route Configuration
```typescript
<Route path="/" element={<LandingPage />} />  // Public landing page
<Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />  // Protected
```

**The dashboard is NOT the default route.** The landing page is.

### If Sign-In Appears First (Possible Causes)
1. **Recent regression**: Commit `7efd4c0` mentions "Sign in on the landing need to be fixed"
2. **Browser cache**: Cached redirect from previous `/dashboard` default
3. **Authentication state**: If user was previously logged in, session may have expired

---

## Current Dashboard Implementation Details

### DashboardPage Features
- **Sidebar**: Navigation (Dashboard, My Research Papers, Upload Paper, Account Settings) + user profile + logout
- **Header**: Sophia branding, user profile dropdown with sign-out
- **Upload Area**: Drag-drop + file input, progress tracking, error handling
- **Document List**: DocumentCard with status, open/delete/retry actions
- **Upload Flow**: Upload → processing → navigate to `/workspace/:documentId` with state

### DashboardPage Data Flow
1. Upload PDF → `uploadDocument()` API call
2. On success → add to local `documents` state
3. Navigate to `/workspace/:documentId` with `{ document, file }` in location state
4. WorkspacePage reads `location.state` to display document

### Dashboard Data Source
- **Local state only**: `documents` array in component state
- **No API call to fetch user's documents** — documents only exist in memory after upload
- **No backend persistence** — documents lost on refresh (in-memory `SessionStore`)

---

## Authentication & Dashboard Access

### Dashboard Requires Authentication
- `/dashboard` wrapped in `<ProtectedRoute>`
- Redirects to `/login` if not authenticated
- DashboardHeader shows user profile when authenticated, "Sign in"/"Create account" when not

### Dashboard Data Access
- **No API call to fetch user's documents** on mount
- Documents only exist in local state after upload in current session
- No backend API to list user's documents (would require user-document association)

---

## Required Files for Modification

### To Make Dashboard the Default Page (Public)
| File | Change Type | Description |
|------|-------------|-------------|
| `frontend/src/App.tsx` | Modify | Change root route `/` to `DashboardPage` (with/without `ProtectedRoute`) |

### To Make Dashboard Public (Remove Auth Requirement)
| File | Change Type | Description |
|------|-------------|-------------|
| `frontend/src/App.tsx` | Modify | Remove `ProtectedRoute` wrapper from `/dashboard` route |
| `frontend/src/components/ProtectedRoute.tsx` | No change | Keep for other routes |

### To Add Dashboard Data Fetching
| File | Change Type | Description |
|------|-------------|-------------|
| `frontend/src/pages/DashboardPage.tsx` | Modify | Add `useEffect` to fetch user's documents on mount |
| `frontend/src/api/client.ts` | Add | `getDocuments()` API function |
| `backend/app/api/documents.py` | Add | `GET /api/v1/documents` endpoint (list user's documents) |

---

## Potential Conflicts

| Conflict | Risk | Mitigation |
|----------|------|------------|
| **Auth removal vs security rules** | AGENTS.md requires auth on protected endpoints | Keep auth on API; only remove route guard |
| **Document ownership** | Dashboard shows local state only | Need backend `GET /documents` with user filter |
| **Upload flow** | Dashboard upload navigates to workspace | Ensure public dashboard upload still works |
| **Sidebar active state** | Sidebar highlights `/dashboard` | Ensure `activePath` prop works |
| **Header user menu** | DashboardHeader shows profile when authed | Already handles unauthenticated state |

---

## Recommended Minimal Solution

### Option A: Make Dashboard Public (Simplest)
```typescript
// App.tsx - Change /dashboard route
<Route
  path="/dashboard"
  element={<DashboardPage />}  // Remove ProtectedRoute wrapper
/>
```

### Option B: Keep Auth, Redirect to Dashboard After Login
```typescript
// App.tsx - Change root route
<Route path="/" element={<Navigate to="/dashboard" replace />} />
// Keep ProtectedRoute on /dashboard
```

### Option C: New Public Dashboard Page (If Dashboard Has Auth-Specific Features)
Create `DashboardPublicPage` without auth-required features.

---

## Verification Checklist

Before implementing:
- [ ] Confirm whether dashboard should be public or auth-required
- [ ] Verify backend has `GET /documents` endpoint (currently missing)
- [ ] Check if document ownership is implemented in backend
- [ ] Test current flow: login → dashboard → upload → workspace

---

## Summary

**Current State**: 
- Root `/` → `LandingPage` (public)
- `/dashboard` → Protected `DashboardPage`
- Dashboard uses local state only (no backend document fetching)
- Auth required for dashboard access

**Why Sign-In Might Appear First**:
- If `/` was recently changed to redirect to `/dashboard` (regression)
- Or browser cached previous redirect
- Or session expired and user tried to access `/dashboard` directly

**Minimal Fix**: Change root route `/` to serve `DashboardPage` (with or without `ProtectedRoute` depending on requirements).

---

*Inspection completed: 2026-11-07*
*Branch: `Default-landing-page`*
*Latest commit: `7efd4c0`*