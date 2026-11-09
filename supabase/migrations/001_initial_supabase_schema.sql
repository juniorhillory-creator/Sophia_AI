-- ==============================================================================
-- Sophia AI — Supabase Database Migration 001
-- Tables: profiles, documents, summaries, conversations, messages, manuscripts
-- ==============================================================================

-- 1. Profiles Table (Extends auth.users)
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    username text unique not null,
    full_name text,
    avatar_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists ix_profiles_username on public.profiles(username);

-- Function and trigger to handle new user signup automatically
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
    desired_username text;
begin
    desired_username := coalesce(
        new.raw_user_meta_data->>'username',
        split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 6)
    );

    insert into public.profiles (id, username, full_name, avatar_url)
    values (
        new.id,
        desired_username,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url'
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- 2. Documents Table
create table if not exists public.documents (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    filename text not null,
    original_filename text not null,
    storage_path text not null,
    file_size bigint not null default 0,
    mime_type text not null default 'application/pdf',
    page_count integer not null default 0,
    chunk_count integer not null default 0,
    status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
    stage text check (stage in ('extracting', 'indexing', 'summarizing')),
    error_code text,
    error_message text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists ix_documents_user_id on public.documents(user_id);
create index if not exists ix_documents_created_at on public.documents(created_at desc);

-- 3. Summaries Table
create table if not exists public.summaries (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null references public.documents(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    title text,
    authors text,
    abstract text,
    problem_statement text,
    methodology text,
    key_results text,
    conclusion text,
    raw_summary jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uq_summaries_document unique (document_id)
);

create index if not exists ix_summaries_document_id on public.summaries(document_id);
create index if not exists ix_summaries_user_id on public.summaries(user_id);

-- 4. Conversations Table (Persistent Research Chat)
create table if not exists public.conversations (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null references public.documents(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null default 'Research Conversation',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists ix_conversations_user_id on public.conversations(user_id);
create index if not exists ix_conversations_document_id on public.conversations(document_id);

-- 5. Messages Table
create table if not exists public.messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in ('user', 'assistant', 'system')),
    content text not null,
    citations jsonb default '[]'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists ix_messages_conversation_id on public.messages(conversation_id);
create index if not exists ix_messages_user_id on public.messages(user_id);

-- 6. Manuscripts Table (AI Writer Drafts)
create table if not exists public.manuscripts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    document_id uuid references public.documents(id) on delete set null,
    title text not null default 'Untitled Research Draft',
    content text not null default '',
    word_count integer not null default 0,
    character_count integer not null default 0,
    last_saved_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists ix_manuscripts_user_id on public.manuscripts(user_id);

