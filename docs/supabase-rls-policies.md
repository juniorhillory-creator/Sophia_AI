# Sophia AI — Supabase Row Level Security (RLS) Policies

## Security Model

Sophia AI enforces strict user data isolation. Every row stored in Supabase is attributed to the user who created it, verified via `auth.uid()`.

Row Level Security is enabled on **100% of public tables** and on the **`research-papers` Storage bucket**.

---

## 1. Table Policies

### 1.1 `public.profiles`
- **SELECT**: `auth.uid() = id`
- **INSERT**: `auth.uid() = id`
- **UPDATE**: `auth.uid() = id` (WITH CHECK `auth.uid() = id`)
- **DELETE**: `auth.uid() = id`

### 1.2 `public.documents`
- **SELECT**: `auth.uid() = user_id`
- **INSERT**: `auth.uid() = user_id`
- **UPDATE**: `auth.uid() = user_id` (WITH CHECK `auth.uid() = user_id`)
- **DELETE**: `auth.uid() = user_id`

### 1.3 `public.summaries`
- **SELECT**: `auth.uid() = user_id`
- **INSERT**: `auth.uid() = user_id`
- **UPDATE**: `auth.uid() = user_id` (WITH CHECK `auth.uid() = user_id`)
- **DELETE**: `auth.uid() = user_id`

### 1.4 `public.conversations`
- **SELECT**: `auth.uid() = user_id`
- **INSERT**: `auth.uid() = user_id`
- **UPDATE**: `auth.uid() = user_id` (WITH CHECK `auth.uid() = user_id`)
- **DELETE**: `auth.uid() = user_id`

### 1.5 `public.messages`
- **SELECT**: `auth.uid() = user_id`
- **INSERT**: `auth.uid() = user_id`
- **DELETE**: `auth.uid() = user_id`

### 1.6 `public.manuscripts`
- **SELECT**: `auth.uid() = user_id`
- **INSERT**: `auth.uid() = user_id`
- **UPDATE**: `auth.uid() = user_id` (WITH CHECK `auth.uid() = user_id`)
- **DELETE**: `auth.uid() = user_id`

---

## 2. Storage Policies (`research-papers` bucket)

The storage bucket `research-papers` is **private** (`public: false`).
Objects are stored under `{user_id}/{document_id}/original.pdf`.

- **SELECT (Read PDF)**:
  `bucket_id = 'research-papers' AND (storage.foldername(name))[1] = auth.uid()::text`
- **INSERT (Upload PDF)**:
  `bucket_id = 'research-papers' AND (storage.foldername(name))[1] = auth.uid()::text`
- **UPDATE (Replace PDF)**:
  `bucket_id = 'research-papers' AND (storage.foldername(name))[1] = auth.uid()::text`
- **DELETE (Delete PDF)**:
  `bucket_id = 'research-papers' AND (storage.foldername(name))[1] = auth.uid()::text`

---

## 3. Cross-User Test Verification

| Test Scenario | Policy Applied | Expected Result |
|---|---|---|
| User A queries User A documents | `auth.uid() = user_id` | Returns User A documents |
| User A queries User B documents | `auth.uid() = user_id` | Returns empty list (0 rows) |
| Unauthenticated client queries documents | `auth.uid() IS NULL` | Access denied / 0 rows |
| User A attempts to download User B's PDF | Storage RLS | Access denied (403 Forbidden) |
| User A attempts to delete User B's summary | `auth.uid() = user_id` | 0 rows affected |

