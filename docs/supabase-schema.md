# Sophia AI — Supabase Database Schema

## Overview

The Sophia AI database on Supabase consists of 6 core application tables integrated with `auth.users`:

1. `profiles`: User account details, username, full name, avatar.
2. `documents`: Research paper records, processing stage, storage path, file size.
3. `summaries`: Generated structured summaries (Abstract, Problem, Methodology, Results, Conclusion).
4. `conversations`: Research Q&A discussion sessions.
5. `messages`: Turn-by-turn question answering and assistant responses with citations.
6. `manuscripts`: AI Writer research drafts with title, word count, character count, and content.

---

## Entity Relationship Diagram

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : "has"
    AUTH_USERS ||--o{ DOCUMENTS : "owns"
    AUTH_USERS ||--o{ SUMMARIES : "owns"
    AUTH_USERS ||--o{ CONVERSATIONS : "owns"
    AUTH_USERS ||--o{ MANUSCRIPTS : "authors"
    DOCUMENTS ||--o| SUMMARIES : "has summary"
    DOCUMENTS ||--o{ CONVERSATIONS : "has discussions"
    CONVERSATIONS ||--o{ MESSAGES : "contains"
    DOCUMENTS ||--o{ MANUSCRIPTS : "referenced by"

    PROFILES {
        uuid id PK,FK "references auth.users"
        text username UK
        text full_name
        text avatar_url
        timestamptz created_at
        timestamptz updated_at
    }

    DOCUMENTS {
        uuid id PK
        uuid user_id FK "references auth.users"
        text filename
        text original_filename
        text storage_path
        bigint file_size
        text mime_type
        integer page_count
        integer chunk_count
        text status "processing, ready, failed"
        text stage "extracting, indexing, summarizing"
        text error_code
        text error_message
        timestamptz created_at
        timestamptz updated_at
    }

    SUMMARIES {
        uuid id PK
        uuid document_id FK "references documents"
        uuid user_id FK "references auth.users"
        text title
        text authors
        text abstract
        text problem_statement
        text methodology
        text key_results
        text conclusion
        jsonb raw_summary
        timestamptz created_at
        timestamptz updated_at
    }

    CONVERSATIONS {
        uuid id PK
        uuid document_id FK "references documents"
        uuid user_id FK "references auth.users"
        text title
        timestamptz created_at
        timestamptz updated_at
    }

    MESSAGES {
        uuid id PK
        uuid conversation_id FK "references conversations"
        uuid user_id FK "references auth.users"
        text role "user, assistant, system"
        text content
        jsonb citations
        timestamptz created_at
    }

    MANUSCRIPTS {
        uuid id PK
        uuid user_id FK "references auth.users"
        uuid document_id FK "optional references documents"
        text title
        text content
        integer word_count
        integer character_count
        timestamptz last_saved_at
        timestamptz created_at
        timestamptz updated_at
    }
```

---

## Migration Scripts

- Migration script 1: [001_initial_supabase_schema.sql](file:///c:/Users/menak/Open%20source/Sophia_AI/sophia_ai/backend/supabase/migrations/001_initial_supabase_schema.sql)
- Migration script 2: [002_rls_and_storage.sql](file:///c:/Users/menak/Open%20source/Sophia_AI/sophia_ai/backend/supabase/migrations/002_rls_and_storage.sql)

