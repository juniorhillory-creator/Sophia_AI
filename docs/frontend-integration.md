# Sophia AI — Frontend Integration Guide

## Overview

The Sophia AI frontend is built with React 19, TypeScript, Vite, and Tailwind CSS v4. It features a SciSpace-inspired research workspace layout and integrates with both **Supabase Auth** and the **FastAPI Research Assistant Backend**.

---

## 1. Authentication Integration

The frontend uses the official `@supabase/supabase-js` client initialized in `frontend/src/lib/supabase.ts`.

### State Management (`AuthContext.tsx`)
- `login(username_or_email, password)`: Calls `supabase.auth.signInWithPassword`.
- `register(username, email, password)`: Calls `supabase.auth.signUp`.
- `loginWithGoogle()`: Calls `supabase.auth.signInWithOAuth({ provider: 'google' })`.
- `logout()`: Calls `supabase.auth.signOut()`.
- `onAuthStateChange`: Automatically synchronizes session tokens into memory via `setAuthToken(session.access_token)`.

---

## 2. API Communication (`api/client.ts`)

All requests to the FastAPI backend include the in-memory access token:

```typescript
const headers = new Headers();
if (authToken) {
  headers.set("Authorization", `Bearer ${authToken}`);
}
```

### Endpoints Called by Frontend:

| Page / Component | Action | Backend Route |
|---|---|---|
| Dashboard | Upload PDF | `POST /api/v1/documents` |
| Dashboard / Papers | List user papers | `GET /api/v1/documents` |
| Papers / Workspace | Delete paper | `DELETE /api/v1/documents/{id}` |
| Workspace | Fetch PDF binary | `GET /api/v1/documents/{id}/file` |
| Workspace / Drawer | Fetch / Generate Summary | `GET /api/v1/documents/{id}/summary` / `POST /api/v1/documents/{id}/summary` |
| Workspace / Drawer | Ask Paper (RAG) | `POST /api/v1/documents/{id}/questions` |
| Workspace | Stream Answer | `GET /api/v1/documents/{id}/questions/stream` |
| AI Writer | Auto-save Manuscript | Synced to Supabase `manuscripts` table + localStorage |

