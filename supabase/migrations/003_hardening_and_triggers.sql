-- ==============================================================================
-- Sophia AI — Supabase Database Migration 003
-- Hardening, Service-Role Exemption, Parent-Child RLS Ownership Checks & Updated-At Triggers
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Automated updated_at trigger function
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Attach triggers to all tables with updated_at column
DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_documents_updated_at ON public.documents;
CREATE TRIGGER tr_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_summaries_updated_at ON public.summaries;
CREATE TRIGGER tr_summaries_updated_at
    BEFORE UPDATE ON public.summaries
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_conversations_updated_at ON public.conversations;
CREATE TRIGGER tr_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_manuscripts_updated_at ON public.manuscripts;
CREATE TRIGGER tr_manuscripts_updated_at
    BEFORE UPDATE ON public.manuscripts
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 2. Documents Policies: Hardened with Service Role Exemption
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
CREATE POLICY "Users can view own documents" 
    ON public.documents FOR SELECT 
    USING (auth.role() = 'service_role' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
CREATE POLICY "Users can insert own documents" 
    ON public.documents FOR INSERT 
    WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
CREATE POLICY "Users can update own documents" 
    ON public.documents FOR UPDATE 
    USING (auth.role() = 'service_role' OR auth.uid() = user_id) 
    WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;
CREATE POLICY "Users can delete own documents" 
    ON public.documents FOR DELETE 
    USING (auth.role() = 'service_role' OR auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 3. Summaries Policies: Hardened with Parent Document Ownership Validation
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own summaries" ON public.summaries;
CREATE POLICY "Users can view own summaries" 
    ON public.summaries FOR SELECT 
    USING (auth.role() = 'service_role' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own summaries" ON public.summaries;
CREATE POLICY "Users can insert own summaries"
    ON public.summaries FOR INSERT
    WITH CHECK (
        auth.role() = 'service_role' OR
        (
            auth.uid() = user_id AND
            EXISTS (
                SELECT 1 FROM public.documents d
                WHERE d.id = document_id AND d.user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can update own summaries" ON public.summaries;
CREATE POLICY "Users can update own summaries"
    ON public.summaries FOR UPDATE
    USING (auth.role() = 'service_role' OR auth.uid() = user_id)
    WITH CHECK (
        auth.role() = 'service_role' OR
        (
            auth.uid() = user_id AND
            EXISTS (
                SELECT 1 FROM public.documents d
                WHERE d.id = document_id AND d.user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can delete own summaries" ON public.summaries;
CREATE POLICY "Users can delete own summaries" 
    ON public.summaries FOR DELETE 
    USING (auth.role() = 'service_role' OR auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 4. Conversations Policies: Hardened with Parent Document Ownership Validation
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
CREATE POLICY "Users can view own conversations" 
    ON public.conversations FOR SELECT 
    USING (auth.role() = 'service_role' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own conversations" ON public.conversations;
CREATE POLICY "Users can insert own conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (
        auth.role() = 'service_role' OR
        (
            auth.uid() = user_id AND
            EXISTS (
                SELECT 1 FROM public.documents d
                WHERE d.id = document_id AND d.user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
CREATE POLICY "Users can update own conversations" 
    ON public.conversations FOR UPDATE 
    USING (auth.role() = 'service_role' OR auth.uid() = user_id) 
    WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own conversations" ON public.conversations;
CREATE POLICY "Users can delete own conversations" 
    ON public.conversations FOR DELETE 
    USING (auth.role() = 'service_role' OR auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 5. Messages Policies: Hardened with Parent Conversation Ownership Validation
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
CREATE POLICY "Users can view own messages" 
    ON public.messages FOR SELECT 
    USING (auth.role() = 'service_role' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own messages" ON public.messages;
CREATE POLICY "Users can insert own messages"
    ON public.messages FOR INSERT
    WITH CHECK (
        auth.role() = 'service_role' OR
        (
            auth.uid() = user_id AND
            EXISTS (
                SELECT 1 FROM public.conversations c
                WHERE c.id = conversation_id AND c.user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
CREATE POLICY "Users can delete own messages" 
    ON public.messages FOR DELETE 
    USING (auth.role() = 'service_role' OR auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 6. Manuscripts Policies: Hardened with Optional Document Ownership Validation
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own manuscripts" ON public.manuscripts;
CREATE POLICY "Users can view own manuscripts" 
    ON public.manuscripts FOR SELECT 
    USING (auth.role() = 'service_role' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own manuscripts" ON public.manuscripts;
CREATE POLICY "Users can insert own manuscripts"
    ON public.manuscripts FOR INSERT
    WITH CHECK (
        auth.role() = 'service_role' OR
        (
            auth.uid() = user_id AND
            (
                document_id IS NULL OR
                EXISTS (
                    SELECT 1 FROM public.documents d
                    WHERE d.id = document_id AND d.user_id = auth.uid()
                )
            )
        )
    );

DROP POLICY IF EXISTS "Users can update own manuscripts" ON public.manuscripts;
CREATE POLICY "Users can update own manuscripts"
    ON public.manuscripts FOR UPDATE
    USING (auth.role() = 'service_role' OR auth.uid() = user_id)
    WITH CHECK (
        auth.role() = 'service_role' OR
        (
            auth.uid() = user_id AND
            (
                document_id IS NULL OR
                EXISTS (
                    SELECT 1 FROM public.documents d
                    WHERE d.id = document_id AND d.user_id = auth.uid()
                )
            )
        )
    );

DROP POLICY IF EXISTS "Users can delete own manuscripts" ON public.manuscripts;
CREATE POLICY "Users can delete own manuscripts" 
    ON public.manuscripts FOR DELETE 
    USING (auth.role() = 'service_role' OR auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 7. Storage Policies: Upsert Support & Path Isolation
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own papers" ON storage.objects;
CREATE POLICY "Users can view own papers"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'research-papers' AND
        (auth.role() = 'service_role' OR (storage.foldername(name))[1] = auth.uid()::TEXT)
    );

DROP POLICY IF EXISTS "Users can upload own papers" ON storage.objects;
CREATE POLICY "Users can upload own papers"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'research-papers' AND
        (auth.role() = 'service_role' OR (storage.foldername(name))[1] = auth.uid()::TEXT)
    );

DROP POLICY IF EXISTS "Users can update own papers" ON storage.objects;
CREATE POLICY "Users can update own papers"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'research-papers' AND
        (auth.role() = 'service_role' OR (storage.foldername(name))[1] = auth.uid()::TEXT)
    )
    WITH CHECK (
        bucket_id = 'research-papers' AND
        (auth.role() = 'service_role' OR (storage.foldername(name))[1] = auth.uid()::TEXT)
    );

DROP POLICY IF EXISTS "Users can delete own papers" ON storage.objects;
CREATE POLICY "Users can delete own papers"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'research-papers' AND
        (auth.role() = 'service_role' OR (storage.foldername(name))[1] = auth.uid()::TEXT)
    );

-- ------------------------------------------------------------------------------
-- 8. Explicit Permissions Grants
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated, service_role;
