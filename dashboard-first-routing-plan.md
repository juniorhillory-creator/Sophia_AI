# Dashboard-First Routing Plan — Sophia AI

## Objective

Make the existing Sophia AI Dashboard the first page users see when opening the application.

## Current State

- `/` → `LandingPage` (public)
- `/dashboard` → `DashboardPage` (protected via `ProtectedRoute`)
- Unauthenticated users accessing `/dashboard` → redirected to `/login`

## Desired Behavior

| Route | Behavior |
|-------|----------|
| `/` | Redirect to `/dashboard` (preserves auth guard) |
| `/login` | Sign-in page (unchanged) |
| `/register` | Registration page (unchanged) |
| `/dashboard` | Dashboard (protected, unchanged) |
| `/workspace/:id` | Workspace (public for results, unchanged) |
| `/workspace` | Protected (unchanged) |

**After login**: User redirected to `/dashboard` (via `from` state in `ProtectedRoute`)

---

## Authentication Flow (Preserved)

```
User visits `/`
    → Redirects to `/dashboard`
        → ProtectedRoute checks auth
            → Unauthenticated → Redirect to `/login` with `from=/dashboard`
                → User logs in
                    → Redirects to `/dashboard` (from state)
```

**No authentication logic changes required** — existing `ProtectedRoute` and `AuthContext` handle this.

---

## Files to Modify

| File | Change |
|------|--------|
| `frontend/src/App.tsx` | Change root route `/` from `<LandingPage />` to `<Navigate to="/dashboard" replace />` |

**Only 1 file, 1 line change.**

---

## Files to Preserve (No Changes)

| File | Reason |
|------|--------|
| `ProtectedRoute.tsx` | Auth guard works correctly |
| `AuthContext.tsx` | Auth state management unchanged |
| `DashboardPage.tsx` | Dashboard component unchanged |
| `LoginPage.tsx`, `RegisterPage.tsx` | Auth pages unchanged |
| `WorkspacePage.tsx` | Workspace unchanged |
| `LandingPage.tsx` | Keep for `/upload` redirect target |
| `AuthProvider`, `AuthContext` | Auth system unchanged |
| Backend | No backend changes needed |

---

## Routing Changes (App.tsx)

### Current (lines 508-509)
```tsx
<Route path="/upload" element={<Navigate to="/" replace />} />
<Route path="/" element={<LandingPage />} />
```

### Proposed
```tsx
<Route path="/upload" element={<Navigate to="/" replace />} />
<Route path="/" element={<Navigate to="/dashboard" replace />} />
```

**Single line change**: Replace `<LandingPage />` with `<Navigate to="/dashboard" replace />`

---

## Authentication Impact

| Scenario | Current | After Change |
|----------|---------|--------------|
| Unauthenticated user visits `/` | Shows `LandingPage` | Redirects to `/dashboard` → `/login` (via `ProtectedRoute`) |
| Authenticated user visits `/` | Shows `LandingPage` | Redirects to `/dashboard` (sees dashboard) |
| User logs in at `/login` | Redirects to `from` state or `/` | Redirects to `/dashboard` (via `from` state) |
| `/dashboard` direct access | Protected (redirects to login) | Unchanged |
| `/workspace/:id` public access | Works | Unchanged |

**No authentication logic changes** — existing `ProtectedRoute` handles redirects via `from` state.

---

## Backend Impact

**None.** No backend changes required. All API endpoints remain unchanged.

---

## Testing Steps

### Automated Tests
```bash
cd frontend && npm run build && npm run test
cd backend && python -m pytest -v
```

### Manual Test Scenarios

| Scenario | Expected |
|----------|----------|
| Unauthenticated: visit `/` | Redirects to `/login`, then `/dashboard` after login |
| Authenticated: visit `/` | Redirects to `/dashboard`, sees dashboard |
| Direct `/dashboard` access (unauth) | Redirects to `/login` |
| `/login` → successful login | Redirects to `/dashboard` |
| `/workspace/:id` (public) | Works without auth |
| `/dashboard` (authenticated) | Shows dashboard with documents |

### Regression Checks
- Login → logout → login flow
- Register → login → dashboard
- Protected routes still redirect correctly
- `/workspace/:id` public access still works

---

## Rollback Plan

If issues arise:

```bash
# 1. Revert App.tsx root route
git checkout -- frontend/src/App.tsx

# 2. Verify
cd frontend && npm run build && npm run test
```

**Single file revert** — minimal risk.

---

## Potential Conflicts

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `/upload` redirect | Low | Already points to `/` which now goes to dashboard |
| `LandingPage` unused | Low | Still used by `/upload` redirect |
| `ProtectedRoute` loading flash | Existing | No change to auth logic |
| `from` state in login | Works | `ProtectedRoute` passes `from` location |

---

## Approval Checklist

- [ ] Dashboard remains protected (auth required)
- [ ] Unauthenticated users redirected to login
- [ ] Post-login redirect works to dashboard
- [ ] Existing auth pages unchanged
- [ ] `/workspace/:id` public access preserved
- [ ] No backend changes required
- [ ] Single file change (`App.tsx`)
- [ ] Rollback is single `git checkout`

---

*Plan created: 2026-11-07*
*Based on: `dashboard-routing-inspection.md`*
*Branch: `Default-landing-page` (or new branch)*