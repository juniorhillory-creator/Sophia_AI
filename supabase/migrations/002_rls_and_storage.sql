-- ==============================================================================
-- Sophia AI — Supabase Database Migration 002
-- Row Level Security (RLS) & Storage Policies
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Enable RLS on all application tables
-- ------------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.summaries enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.manuscripts enable row level security;

-- ------------------------------------------------------------------------------
-- 2. Profiles Policies
-- ------------------------------------------------------------------------------
create policy "Users can view own profile"
    on public.profiles for select
    using (auth.uid() = id);

create policy "Users can insert own profile"
    on public.profiles for insert
    with check (auth.uid() = id);

create policy "Users can update own profile"
    on public.profiles for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

create policy "Users can delete own profile"
    on public.profiles for delete
    using (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 3. Documents Policies
-- ------------------------------------------------------------------------------
create policy "Users can view own documents"
    on public.documents for select
    using (auth.uid() = user_id);

create policy "Users can insert own documents"
    on public.documents for insert
    with check (auth.uid() = user_id);

create policy "Users can update own documents"
    on public.documents for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete own documents"
    on public.documents for delete
    using (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 4. Summaries Policies
-- ------------------------------------------------------------------------------
create policy "Users can view own summaries"
    on public.summaries for select
    using (auth.uid() = user_id);

create policy "Users can insert own summaries"
    on public.summaries for insert
    with check (auth.uid() = user_id);

create policy "Users can update own summaries"
    on public.summaries for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete own summaries"
    on public.summaries for delete
    using (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 5. Conversations Policies
-- ------------------------------------------------------------------------------
create policy "Users can view own conversations"
    on public.conversations for select
    using (auth.uid() = user_id);

create policy "Users can insert own conversations"
    on public.conversations for insert
    with check (auth.uid() = user_id);

create policy "Users can update own conversations"
    on public.conversations for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete own conversations"
    on public.conversations for delete
    using (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 6. Messages Policies
-- ------------------------------------------------------------------------------
create policy "Users can view own messages"
    on public.messages for select
    using (auth.uid() = user_id);

create policy "Users can insert own messages"
    on public.messages for insert
    with check (auth.uid() = user_id);

create policy "Users can delete own messages"
    on public.messages for delete
    using (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 7. Manuscripts Policies
-- ------------------------------------------------------------------------------
create policy "Users can view own manuscripts"
    on public.manuscripts for select
    using (auth.uid() = user_id);

create policy "Users can insert own manuscripts"
    on public.manuscripts for insert
    with check (auth.uid() = user_id);

create policy "Users can update own manuscripts"
    on public.manuscripts for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete own manuscripts"
    on public.manuscripts for delete
    using (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 8. Supabase Storage Setup (research-papers private bucket)
-- ------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'research-papers',
    'research-papers',
    false,
    20971520, -- 20 MB
    array['application/pdf']
)
on conflict (id) do nothing;

create policy "Users can read own research papers"
    on storage.objects for select
    using (
        bucket_id = 'research-papers'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "Users can upload own research papers"
    on storage.objects for insert
    with check (
        bucket_id = 'research-papers'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "Users can update own research papers"
    on storage.objects for update
    using (
        bucket_id = 'research-papers'
        and (storage.foldername(name))[1] = auth.uid()::text
    )
    with check (
        bucket_id = 'research-papers'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "Users can delete own research papers"
    on storage.objects for delete
    using (
        bucket_id = 'research-papers'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

