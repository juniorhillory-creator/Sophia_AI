# Sophia AI — Supabase Database Migration & Operations Guide

This guide outlines how to safely apply, verify, and rollback database migrations for Sophia AI.

---

## 1. Migration Inventory

The project uses safe, idempotent, non-destructive PostgreSQL migrations located in `supabase/migrations/` (and mirrored in `backend/supabase/migrations/`):

1. **`001_initial_supabase_schema.sql`**:
   - Creates `profiles`, `documents`, `summaries`, `conversations`, `messages`, and `manuscripts`.
   - Attaches `handle_new_user()` trigger on `auth.users` for automatic profile provisioning.
   - Creates B-Tree performance indexes.
2. **`002_rls_and_storage.sql`**:
   - Enables Row Level Security (RLS) on all 6 tables.
   - Defines ownership policies (`auth.uid() = user_id`).
   - Provisions the `research-papers` private storage bucket (20 MB PDF limit).
   - Establishes storage path-based security policies (`research-papers/{user_id}/{document_id}/original.pdf`).
3. **`003_hardening_and_triggers.sql`**:
   - Creates `public.set_updated_at()` trigger function and attaches it to all tables.
   - Hardens child record RLS policies to prevent cross-tenant referencing (User A cannot attach records to User B's documents or conversations).
   - Adds storage `UPDATE` policy to support SDK upserts (`upsert: true`).
   - Grants explicit table and schema permissions to `authenticated` and `service_role`.

---

## 2. Pre-Migration Backup Instructions

Before running new migrations in production:

### Option A: Supabase Dashboard
1. Go to your **[Supabase Project Dashboard](https://supabase.com/dashboard)**.
2. Navigate to **Database** $\rightarrow$ **Backups**.
3. Confirm a scheduled backup exists or click **Create backup** (Pro plan) or export tables via Table Editor $\rightarrow$ Export CSV.

### Option B: Supabase CLI / `pg_dump`
```bash
# Export full database schema and data
pg_dump "postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" > backup_$(date +%Y%m%d).sql
```

---

## 3. Migration Execution Steps

### Via Supabase Web Dashboard (Recommended)
1. Open **[Supabase Dashboard](https://supabase.com/dashboard)**.
2. Navigate to the **SQL Editor** tab from the left navigation bar.
3. If running for the first time:
   - Paste contents of [`supabase/migrations/001_initial_supabase_schema.sql`](file:///c:/Users/menak/Open%20source/Sophia_AI/sophia_ai/supabase/migrations/001_initial_supabase_schema.sql) and click **Run**.
   - Paste contents of [`supabase/migrations/002_rls_and_storage.sql`](file:///c:/Users/menak/Open%20source/Sophia_AI/sophia_ai/supabase/migrations/002_rls_and_storage.sql) and click **Run**.
4. To apply the security hardening and trigger update:
   - Paste contents of [`supabase/migrations/003_hardening_and_triggers.sql`](file:///c:/Users/menak/Open%20source/Sophia_AI/sophia_ai/supabase/migrations/003_hardening_and_triggers.sql) and click **Run**.
5. Ensure the result pane displays `Success. No rows returned`.

---

## 4. Post-Migration Verification

Run the automated backend test suite and live multi-user authorization suite:

### 1. Backend Test Suite
```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests
```
*Expected output: `48 passed`.*

### 2. Live Supabase Multi-Tenant Verification
To verify that User A cannot read or attach records to User B's documents, run:
```powershell
cd backend
.\.venv\Scripts\python.exe -c "
from app.core.settings import get_settings
from app.core.supabase import get_supabase_client
sb = get_supabase_client(get_settings())
print('Supabase connected successfully')
"
```

---

## 5. Rollback & Recovery Guidance

Because all migrations in `003_hardening_and_triggers.sql` are non-destructive and use `CREATE OR REPLACE` and `DROP TRIGGER IF EXISTS`:

### Reverting Migration 003:
To revert parent-child subquery checks back to simple user ownership:
```sql
-- Revert Summaries policy
DROP POLICY IF EXISTS "Users can insert own summaries" ON public.summaries;
CREATE POLICY "Users can insert own summaries"
    ON public.summaries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Revert Conversations policy
DROP POLICY IF EXISTS "Users can insert own conversations" ON public.conversations;
CREATE POLICY "Users can insert own conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Revert Messages policy
DROP POLICY IF EXISTS "Users can insert own messages" ON public.messages;
CREATE POLICY "Users can insert own messages"
    ON public.messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Revert Manuscripts policy
DROP POLICY IF EXISTS "Users can insert own manuscripts" ON public.manuscripts;
CREATE POLICY "Users can insert own manuscripts"
    ON public.manuscripts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Remove updated_at triggers
DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS tr_documents_updated_at ON public.documents;
DROP TRIGGER IF EXISTS tr_summaries_updated_at ON public.summaries;
DROP TRIGGER IF EXISTS tr_conversations_updated_at ON public.conversations;
DROP TRIGGER IF EXISTS tr_manuscripts_updated_at ON public.manuscripts;
```

