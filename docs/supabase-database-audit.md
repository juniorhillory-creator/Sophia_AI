# Sophia AI — Supabase Database Inspection & Security Audit

## 1. Executive Summary

This audit assesses the database schema, security configuration, and application integration of the Supabase PostgreSQL database for **Sophia AI**. 

Sophia AI is a local research paper assistant featuring PDF extraction, structured 7-part summary generation, retrieval-augmented generation (RAG) with page citations, and an AI Writer workspace with manuscript autosaving.

**Audit Scope:**
- 6 Application Tables: `profiles`, `documents`, `summaries`, `conversations`, `messages`, `manuscripts`.
- 1 Storage Bucket: `research-papers` (Private, 20 MB limit, `application/pdf`).
- Row Level Security (RLS) policies and PostgreSQL triggers.
- FastAPI backend integration (`app.core.supabase`, `app.dependencies`, `app.api.documents`, `app.services.ingestion`).
- React 19 / Vite frontend integration (`src/lib/supabase`, `src/contexts/AuthContext`, `src/pages/WriterPage`).

---

## 2. Current Schema & Inventory

The live Supabase database structure matches the initial baseline:

```
public
├── profiles             (Extends auth.users, 1:1)
├── documents            (Owned by auth.users, 1:N)
├── summaries            (Belongs to documents, 1:1; references auth.users)
├── conversations        (Belongs to documents, 1:N; references auth.users)
├── messages             (Belongs to conversations, 1:N; references auth.users)
└── manuscripts          (Owned by auth.users, 1:N; optional FK to documents)

storage.buckets
└── research-papers      (Private PDF storage)
```

Live inspection confirmed that all 6 tables and the `research-papers` bucket exist on the active Supabase project (`jvunlisimaeqjffmoszn.supabase.co`).

---

## 3. Detailed Audit Findings & Vulnerability Analysis

### Finding 1: Cross-Tenant Parent-Child Reference Vulnerability in RLS
* **Severity:** High
* **Component:** `summaries`, `conversations`, `messages`, `manuscripts` RLS policies.
* **Analysis:** The baseline RLS policies for `INSERT` checked only:
  ```sql
  WITH CHECK (auth.uid() = user_id)
  ```
  While this verifies that the caller owns the *child* record being created, it **did not verify that the referenced parent record belongs to the same user**.
  *Example attack vector:* An authenticated User A could theoretically execute:
  ```sql
  INSERT INTO public.conversations (document_id, user_id, title)
  VALUES ('<document_id_of_user_b>', '<user_a_id>', 'Infiltrated Conversation');
  ```
  Because `auth.uid() = user_id` evaluates to true for User A, the insert would succeed, attaching User A's thread to User B's private paper.
* **Resolution:** Harden all `INSERT` and `UPDATE` policies with subquery existence checks ensuring `document_id` (or `conversation_id`) belongs to `auth.uid()`.

---

### Finding 2: Missing `updated_at` Automatic Maintenance Triggers
* **Severity:** Medium
* **Component:** `profiles`, `documents`, `summaries`, `conversations`, `manuscripts`.
* **Analysis:** All tables declare `updated_at timestamptz not null default now()`. However, standard PostgreSQL `UPDATE` statements do not update default columns automatically. Unless explicitly included in `UPDATE ... SET updated_at = now()`, `updated_at` remains frozen at the initial insertion timestamp.
* **Resolution:** Implement a generic `public.set_updated_at()` trigger function and attach `BEFORE UPDATE` triggers to all mutable tables.

---

### Finding 3: Missing Storage `UPDATE` Policy on `research-papers` Bucket
* **Severity:** Medium
* **Component:** `storage.objects` RLS.
* **Analysis:** The baseline migration created `SELECT`, `INSERT`, and `DELETE` policies on `storage.objects`. However, Supabase's JavaScript and Python SDKs perform an `UPDATE` when uploading with `upsert: true` (used in `SupabaseStorageService.upload_pdf`). Without an explicit `UPDATE` policy, upsert operations fail with an RLS error.
* **Resolution:** Add an `UPDATE` policy for `storage.objects` checking `bucket_id = 'research-papers' AND (storage.foldername(name))[1] = auth.uid()::TEXT`.

---

### Finding 4: Storage Path Convention Alignment
* **Severity:** Low / Informational
* **Component:** `SupabaseStorageService` and `IngestionService`.
* **Analysis:** 
  - Backend path generated: `{user_id}/{document_id}/original.pdf`.
  - Storage policy folder extraction: `(storage.foldername(name))[1]`.
  - In PostgreSQL / Supabase Storage, `storage.foldername('user_id/doc_id/original.pdf')` returns an array `['user_id', 'doc_id']`. Element `[1]` (1-indexed in SQL) extracts `user_id`. This correctly matches `auth.uid()::text`.
* **Resolution:** Confirmed compatible.

---

### Finding 5: Manuscript Persistence Synchronization
* **Severity:** Low
* **Component:** `frontend/src/pages/WriterPage.tsx`.
* **Analysis:** The frontend AI Writer uses `localStorage` for offline caching and fast debounced typing. To fulfill the target architecture, manuscripts should also synchronize with the Supabase `manuscripts` table when authenticated, preserving `localStorage` as an offline buffer.
* **Resolution:** Provide helper functions in `SupabaseDocumentService` for upserting manuscripts and document references.

---

### Finding 6: Local Vector Store (ChromaDB) vs Relational Supabase
* **Severity:** Architectural Note
* **Component:** RAG pipeline (`app.services.rag`, `app.infrastructure.chroma_store`).
* **Analysis:** High-density embeddings (384-dimensional vectors from `all-MiniLM-L6-v2`) are stored locally in ChromaDB for fast sub-millisecond local inference and zero cloud egress cost. Relational metadata, extraction counts, and structured summaries reside in Supabase.
* **Resolution:** Retain this decoupled design as mandated in project guidelines.

---

## 4. Application-to-Database Schema Field Mapping Verification

| Field in Backend Model | Type | Column in Supabase `documents` | Match Status |
|---|---|---|---|
| `Document.id` | `UUID` | `id uuid` | Perfect Match |
| `Document.user_id` | `UUID` | `user_id uuid` | Perfect Match |
| `Document.filename` | `str` | `filename text` | Perfect Match |
| `Document.page_count` | `int` | `page_count integer` | Perfect Match |
| `Document.chunk_count`| `int` | `chunk_count integer` | Perfect Match |
| `Document.status` | `enum` | `status text` | Matches (`ready`, `processing`, `failed`) |
| `Document.stage` | `enum | None` | `stage text` | Matches (`extracting`, `indexing`, `summarizing`) |
| `Document.error_code` | `str | None` | `error_code text` | Perfect Match |
| `Document.error_message` | `str | None` | `error_message text` | Perfect Match |
| `Document.created_at` | `datetime` | `created_at timestamptz` | Perfect Match |
| `Document.updated_at` | `datetime` | `updated_at timestamptz` | Perfect Match |

| Field in `PaperSummary` | Type | Column in Supabase `summaries` | Match Status |
|---|---|---|---|
| `title` | `str` | `title text` | Perfect Match |
| `authors` | `str` | `authors text` | Perfect Match |
| `abstract` | `str` | `abstract text` | Perfect Match |
| `problem_statement` | `str` | `problem_statement text` | Perfect Match |
| `methodology` | `str` | `methodology text` | Perfect Match |
| `key_results` | `str` | `key_results text` | Perfect Match |
| `conclusion` | `str` | `conclusion text` | Perfect Match |
| (full object) | `dict` | `raw_summary jsonb` | Perfect Match |

---

## 5. Migration Risk Assessment & Data Preservation

1. **Destructive Operations:** None. No tables are dropped, columns renamed, or tables truncated.
2. **Re-run Safety:** All queries use `CREATE OR REPLACE`, `IF NOT EXISTS`, and `DROP POLICY IF EXISTS`.
3. **Data Loss Probability:** 0%. Existing records remain intact.

